import { createRef } from 'react'
import { defineFixture } from '../../../../component-fixtures/component-fixture'
import { useImeEnterGestureOwnership } from '@/lib/text-input/ime/ime-composition-keyboard-event'
import type {
  SessionOptionDescriptor,
  SessionOptionsSurface
} from '../../../../../../shared/native-chat/input/native-chat-session-options'
import { NativeChatComposerField } from './NativeChatComposerField'
import { NativeChatEmptyState } from '../../host-access/NativeChatEmptyState'
import type { NativeChatComposerInput } from './native-chat-composer-input'

const snapshot: SessionOptionDescriptor[] = [
  {
    id: 'model',
    label: 'Model',
    category: 'model',
    transport: 'agent-session',
    settable: true,
    valueSource: 'applied',
    kind: {
      type: 'select',
      currentValue: 'claude-opus-5-5',
      choices: [{ value: 'claude-opus-5-5', label: 'Opus 5.5' }]
    }
  },
  {
    id: 'effort',
    label: 'Effort',
    category: 'thought_level',
    transport: 'agent-session',
    settable: true,
    valueSource: 'applied',
    kind: {
      type: 'select',
      currentValue: 'medium',
      choices: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' }
      ]
    }
  },
  {
    id: 'permissionMode',
    label: 'Permissions',
    transport: 'agent-session',
    settable: true,
    valueSource: 'applied',
    kind: {
      type: 'select',
      currentValue: 'auto',
      choices: [
        { value: 'ask', label: 'Ask' },
        { value: 'accept-edits', label: 'Accept edits' },
        { value: 'auto', label: 'Auto' }
      ]
    }
  }
]

const surface: SessionOptionsSurface = {
  getSnapshot: () => snapshot,
  subscribe: () => () => {},
  setOption: async () => ({ snapshot }),
  invokeAction: async () => ({ snapshot })
}

function noop(): void {}

function Composer({ draft = '' }: { draft?: string }): React.JSX.Element {
  const imeEnterGesture = useImeEnterGestureOwnership()
  return (
    <NativeChatComposerField
      draftScopeKey="fixture"
      textareaRef={createRef<NativeChatComposerInput>()}
      draft={draft}
      disabled={false}
      hasPty
      canSend
      autocomplete={{ mode: 'none' }}
      mentionFiles={{ files: [], loading: false, failed: false }}
      activeSuggestion={0}
      notices={[]}
      imageAttachments={[]}
      sendButtonDisabled={draft === ''}
      isWorking={false}
      attachDisabled={false}
      dictationDisabled={false}
      isDictating={false}
      isDictationHoldMode={false}
      imeEnterGesture={imeEnterGesture}
      onDraftChange={noop}
      onTextareaSelect={noop}
      onKeyDown={noop}
      onImeSettled={noop}
      onPaste={noop}
      pickerListboxId="fixture-picker"
      onChoosePickerItem={noop}
      onRetrySkills={noop}
      onChooseMentionFile={noop}
      onRemoveImageAttachment={noop}
      onAttach={noop}
      onDictationToggle={noop}
      onDictationHoldStart={noop}
      onDictationHoldEnd={noop}
      onSend={noop}
      sessionOptionsSurface={surface}
      sessionOptionsSnapshot={snapshot}
      agent="claude"
    />
  )
}

export const empty = defineFixture({
  width: 760,
  render: () => (
    <div className="native-chat-appearance">
      <Composer />
    </div>
  )
})

export const typed = defineFixture({
  width: 760,
  render: () => (
    <div className="native-chat-appearance">
      <Composer draft="자 UI를 바꿀꺼야" />
    </div>
  ),
  interact: (frame) => {
    frame.querySelector<HTMLElement>('[contenteditable=true]')?.focus()
  }
})

export const narrow = defineFixture({ width: 340, render: typed.render, interact: typed.interact })

export const emptyPane = defineFixture({
  width: 420,
  render: () => (
    <div className="native-chat-appearance flex h-[640px] flex-col bg-chat-pane">
      <div className="min-h-0 flex-1">
        <NativeChatEmptyState kind="empty" agent="claude" />
      </div>
      <Composer />
    </div>
  )
})
