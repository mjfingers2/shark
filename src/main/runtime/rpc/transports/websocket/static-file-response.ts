import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'

/** One file the static listener may answer with, already checked against its allowlist. */
export type StaticFileTarget = {
  absolutePath: string
  contentType: string
  cacheControl: string
  /** A precompressed sibling, used only when the request accepts brotli. */
  brotliPath?: string
}

/** Streams the target, or answers 404 when it is missing; never throws. */
export async function sendStaticFile(
  request: IncomingMessage,
  response: ServerResponse,
  target: StaticFileTarget
): Promise<void> {
  const brotliPath =
    target.brotliPath && acceptsBrotli(request.headers['accept-encoding'])
      ? target.brotliPath
      : undefined
  const brotliSize = brotliPath ? await regularFileSize(brotliPath) : null
  const encoded = brotliPath !== undefined && brotliSize !== null
  const servedPath = encoded ? brotliPath : target.absolutePath
  const size = brotliSize ?? (await regularFileSize(target.absolutePath))
  if (response.destroyed) {
    return
  }
  if (size === null) {
    writeHttpStatus(response, 404)
    return
  }

  response.statusCode = 200
  response.setHeader('Content-Type', target.contentType)
  response.setHeader('Content-Length', size)
  response.setHeader('Cache-Control', target.cacheControl)
  if (target.brotliPath) {
    response.setHeader('Vary', 'Accept-Encoding')
  }
  if (encoded) {
    response.setHeader('Content-Encoding', 'br')
  }
  if (request.method === 'HEAD') {
    response.end()
    return
  }

  const stream = createReadStream(servedPath)
  const stopReading = (): void => {
    stream.destroy()
  }
  response.once('close', stopReading)
  response.once('error', stopReading)
  stream.once('close', () => {
    response.off('close', stopReading)
    response.off('error', stopReading)
  })
  stream.on('error', () => {
    if (response.destroyed) {
      return
    }
    if (!response.headersSent) {
      if (encoded) {
        response.removeHeader('Content-Encoding')
      }
      response.setHeader('Content-Length', 0)
      response.setHeader('Cache-Control', 'no-store')
      writeHttpStatus(response, 500)
      return
    }
    response.destroy()
  })
  stream.pipe(response)
}

/** Answers with an in-memory body such as generated HTML. */
export function sendStaticBody(
  request: IncomingMessage,
  response: ServerResponse,
  body: string,
  contentType: string
): void {
  if (response.destroyed) {
    return
  }
  const bytes = Buffer.from(body, 'utf8')
  response.statusCode = 200
  response.setHeader('Content-Type', contentType)
  response.setHeader('Content-Length', bytes.length)
  response.setHeader('Cache-Control', 'no-cache')
  response.end(request.method === 'HEAD' ? undefined : bytes)
}

export function writeHttpStatus(response: ServerResponse, statusCode: number): void {
  if (response.destroyed) {
    return
  }
  response.statusCode = statusCode
  response.end()
}

async function regularFileSize(path: string): Promise<number | null> {
  try {
    const fileStat = await stat(path)
    return fileStat.isFile() ? fileStat.size : null
  } catch {
    return null
  }
}

function acceptsBrotli(header: string | string[] | undefined): boolean {
  const value = Array.isArray(header) ? header.join(',') : (header ?? '')
  return value.split(',').some((entry) => {
    const [coding, ...params] = entry.trim().toLowerCase().split(';')
    if (coding?.trim() !== 'br') {
      return false
    }
    const quality = params.map((param) => param.trim()).find((param) => param.startsWith('q='))
    return quality === undefined || Number(quality.slice(2)) > 0
  })
}
