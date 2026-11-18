import { ShortcutKeyCombo } from './ShortcutKeyCombo'
import type { ShortcutKeyComboDetails } from '@/hooks/useShortcutLabel'
import logo from '../../../../resources/logo.svg'
import { useTranslate } from '@/i18n/use-translate'

export type LandingShortcutItem = {
  id: string
  shortcut: ShortcutKeyComboDetails
  action: string
}

export const LANDING_ACTION_BUTTON_CLASS =
  'inline-flex items-center gap-1.5 bg-secondary/70 border border-border/80 text-foreground font-medium text-sm px-4 py-2 rounded-md cursor-pointer hover:bg-accent transition-colors'

export const LANDING_PRIMARY_BUTTON_CLASS =
  'inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold text-[15px] px-6 py-2.5 rounded-lg cursor-pointer shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors'

export function LandingBrand(): React.JSX.Element {
  const t = useTranslate()
  return (
    <>
      <div
        className="flex items-center justify-center size-20 rounded-2xl border border-border/80 shadow-lg shadow-black/40"
        style={{ backgroundColor: '#12264a' }}
      >
        <img
          src={logo}
          alt={t('auto.components.Landing.520304a067', 'Shark logo')}
          className="size-12"
        />
      </div>
      <h1 className="text-4xl font-bold text-foreground tracking-tight">
        {t('auto.components.Landing.6ca6ff404e', 'SHARK')}
      </h1>
    </>
  )
}

export function LandingShortcutList({
  shortcuts
}: {
  shortcuts: readonly LandingShortcutItem[]
}): React.JSX.Element {
  return (
    <div className="mt-6 w-full max-w-xs space-y-2">
      {shortcuts.map((shortcut) => (
        <div key={shortcut.id} className="grid grid-cols-[1fr_auto] items-center gap-3">
          <span className="text-sm text-muted-foreground">{shortcut.action}</span>
          <ShortcutKeyCombo
            keys={shortcut.shortcut.keys}
            doubleTap={shortcut.shortcut.doubleTap}
            separatorClassName="mx-0.5 text-[10px] text-muted-foreground"
          />
        </div>
      ))}
    </div>
  )
}
