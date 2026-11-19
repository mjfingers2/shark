import '../dispatch/testing/unused-default-rpc-methods.test-fixture'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { OrcaRuntimeService } from '../../orca-runtime'
import { OrcaRuntimeRpcServer } from './runtime-rpc'

const temporaryDirectories: string[] = []

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'orca-mobile-web-app-offer-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true })
  }
})

async function localOffer(mobileWebRoot: string | undefined, address: string | null) {
  const server = new OrcaRuntimeRpcServer({
    methods: [],
    runtime: new OrcaRuntimeService(),
    userDataPath: temporaryDirectory(),
    enableWebSocket: true,
    wsPort: 0,
    ...(mobileWebRoot ? { mobileWebRoot } : {})
  })
  await server.start()
  try {
    const offer = await server.createMobilePairingOffer({ address, connectionMode: 'local-only' })
    if (!offer.available) {
      throw new Error(`pairing unavailable: ${offer.reason}`)
    }
    return offer
  } finally {
    await server.stop()
  }
}

describe('mobile pairing offer: home-screen web app link', () => {
  it('links /m on the advertised LAN address with the QR pairing code', async () => {
    const offer = await localOffer(temporaryDirectory(), '192.168.0.5')
    const port = new URL(offer.endpoint).port

    expect(offer.mobileWebAppUrl).toBe(
      `http://192.168.0.5:${port}/m#pairing=${encodeURIComponent(offer.pairingUrl)}`
    )
  })

  it('omits the link without a phone bundle or without a LAN address', async () => {
    expect((await localOffer(undefined, '192.168.0.5')).mobileWebAppUrl).toBeNull()
    expect((await localOffer(temporaryDirectory(), null)).mobileWebAppUrl).toBeNull()
  })
})
