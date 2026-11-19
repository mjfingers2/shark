import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useTranslate } from '@/i18n/use-translate'
import { GeneratedUrlRow } from '../../settings/runtime-environments/pairing/RuntimePairingGeneratedUrlRows'

const COPIED_RESET_MS = 2000

/** The phone UI as a browser link: an iPad opens it in Safari and adds it to the home screen. */
export function MobileWebAppLinkRow({
  url,
  className
}: {
  url: string
  className?: string
}): React.JSX.Element {
  const t = useTranslate()
  // Keyed by link: a new offer replaces it, and a stale check mark must not claim it was copied.
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const copied = copiedUrl === url

  useEffect(() => {
    if (copiedUrl === null) {
      return
    }
    const timer = setTimeout(() => setCopiedUrl(null), COPIED_RESET_MS)
    return () => clearTimeout(timer)
  }, [copiedUrl])

  const copy = async (): Promise<void> => {
    try {
      await window.api.ui.writeClipboardText(url)
      setCopiedUrl(url)
    } catch {
      toast.error(
        t('auto.components.mobile.MobileWebAppLinkRow.copyFailed', 'Failed to copy the link')
      )
    }
  }

  return (
    <div className={className}>
      <GeneratedUrlRow
        label={t(
          'auto.components.mobile.MobileWebAppLinkRow.label',
          'Home-screen web app link'
        )}
        description={t(
          'auto.components.mobile.MobileWebAppLinkRow.hint',
          'Open it in Safari on an iPad, then Share → Add to Home Screen.'
        )}
        value={url}
        copied={copied}
        onCopy={() => void copy()}
      />
    </div>
  )
}
