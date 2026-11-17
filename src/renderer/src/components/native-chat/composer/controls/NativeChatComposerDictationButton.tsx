import { memo } from 'react'
import { Mic, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTranslate } from '@/i18n/use-translate'
import { useUiLanguageRevision } from '@/i18n/use-ui-language-revision'
import { cn } from '@/lib/class-names'

export type NativeChatComposerDictationButtonProps = {
  disabled: boolean
  isDictating: boolean
  isHoldMode: boolean
  onToggle: () => void
  onHoldStart: () => void
  onHoldEnd: () => void
  className?: string
}

export const NativeChatComposerDictationButton = memo(function NativeChatComposerDictationButton({
  disabled,
  isDictating,
  isHoldMode,
  onToggle,
  onHoldStart,
  onHoldEnd,
  className
}: NativeChatComposerDictationButtonProps): React.JSX.Element {
  const t = useTranslate()
  useUiLanguageRevision()
  const label = isDictating
    ? t('components.native-chat.composer.stopDictation', 'Stop dictation')
    : t('components.native-chat.composer.startDictation', 'Start dictation')
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={isDictating ? 'secondary' : 'ghost'}
          size="icon-sm"
          aria-label={label}
          disabled={disabled}
          onClick={isHoldMode ? undefined : onToggle}
          onPointerDown={(event) => {
            if (!isHoldMode || disabled) {
              return
            }
            event.preventDefault()
            onHoldStart()
          }}
          onPointerUp={() => {
            if (isHoldMode && !disabled) {
              onHoldEnd()
            }
          }}
          onPointerCancel={() => {
            if (isHoldMode && !disabled) {
              onHoldEnd()
            }
          }}
          onPointerLeave={(event) => {
            if (isHoldMode && event.buttons === 1 && !disabled) {
              onHoldEnd()
            }
          }}
          className={cn('pointer-coarse:size-11', className)}
        >
          {isDictating ? <Square className="size-3.5 fill-current" /> : <Mic className="size-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
})
