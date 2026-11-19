import { useCallback, useId, useMemo, useSyncExternalStore } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/class-names'
import { useTranslate } from '@/i18n/use-translate'
import type { NativeChatSubagentEntry } from '../../../../../shared/native-chat/native-chat-types'
import type { NativeChatSubagentRow } from '../../../../../shared/native-chat/transcript/native-chat-transcript-projection'
import { formatSubagentTokens } from '../../../../../shared/native-chat/transcript/subagents/native-chat-subagent-group-header'
import {
  buildNativeChatAgentTree,
  isNativeChatAgentTreeExpanded,
  type NativeChatAgentTreeRow
} from '../../../../../shared/native-chat/transcript/subagents/native-chat-agent-tree-model'
import {
  chooseNativeChatAgentTreeExpanded,
  nativeChatAgentTreeChoice,
  subscribeNativeChatAgentTreeChoice
} from '../../../../../shared/native-chat/transcript/subagents/native-chat-agent-tree-choice'
import { SubagentElapsed } from './NativeChatSubagentRun'
import { NativeChatSubagentStatusIcon } from './NativeChatSubagentStatusIcon'
import { nativeChatSubagentChain } from './native-chat-subagent-scope'
import {
  sayNativeChatSubagentGroupTranslated as say,
  sayNativeChatSubagentStateHeading
} from './native-chat-subagent-group-words-text'

const ROW_CLASS =
  'flex h-7 w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-1.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'
/** One indent step; the connector of a level sits in its column. */
const INDENT_CLASS = 'relative w-4 shrink-0 self-stretch'
const LINE_CLASS = 'absolute left-1.5 border-chat-foreground-faint/50'

/** Above the conversation: the main agent and its subagents as a tree; picking one opens its view. */
export function NativeChatAgentTree({
  sessionKey,
  mainLabel,
  mainWorking,
  entries,
  subagentRows,
  viewedId,
  onOpen
}: {
  /** Keys the person's open/closed choice for this session. */
  sessionKey: string
  /** The provider's name, e.g. Claude. */
  mainLabel: string
  mainWorking: boolean
  entries: ReadonlyMap<string, NativeChatSubagentEntry>
  subagentRows: ReadonlyMap<string, readonly NativeChatSubagentRow[]>
  viewedId: string | null
  onOpen: (agentId: string | null) => void
}): React.JSX.Element | null {
  const t = useTranslate()
  const listId = useId()
  const unnamed = t('components.native-chat.subagents.unnamed', 'Subagent')
  const model = useMemo(
    () =>
      buildNativeChatAgentTree({
        entries: [...entries.values()],
        main: { label: mainLabel, state: mainWorking ? 'working' : 'idle' },
        viewedId,
        unnamed,
        parentOf: (agentId) => nativeChatSubagentChain(agentId, subagentRows).at(-2) ?? null
      }),
    [entries, mainLabel, mainWorking, subagentRows, unnamed, viewedId]
  )
  const readChoice = useCallback(() => nativeChatAgentTreeChoice(sessionKey), [sessionKey])
  const choice = useSyncExternalStore(subscribeNativeChatAgentTreeChoice, readChoice, readChoice)
  if (model === null) {
    return null
  }
  const expanded = isNativeChatAgentTreeExpanded(model, choice)
  const summary =
    model.working > 0
      ? t(
          'components.native-chat.agentTree.summaryWorking',
          '{{count}} agents · {{working}} working',
          {
            count: model.total,
            working: model.working,
            defaultValue_one: '{{count}} agent · {{working}} working'
          }
        )
      : t('components.native-chat.agentTree.summaryDone', '{{count}} agents · all done', {
          count: model.total,
          defaultValue_one: '{{count}} agent · done'
        })
  const { root } = model
  return (
    <div
      data-native-chat-agent-tree
      className="shrink-0 border-b border-border/60 bg-chat-pane px-3 sm:px-4"
    >
      <div className="@container/agent-tree mx-auto w-full max-w-(--chat-content-max-width) px-[5px] text-xs">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          className="-mx-1.5 flex h-8 min-w-0 items-center gap-1 rounded-md px-1.5 text-chat-foreground-faint outline-none hover:text-chat-foreground focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => chooseNativeChatAgentTreeExpanded(sessionKey, !expanded)}
        >
          <ChevronRight
            aria-hidden
            className={cn('size-3.5 shrink-0 transition-transform', expanded && 'rotate-90')}
          />
          <span className="truncate">{summary}</span>
        </button>
        {expanded ? (
          <ul
            id={listId}
            aria-label={t('components.native-chat.agentTree.label', 'Agents')}
            className="-mx-1.5 pb-1.5"
          >
            <li>
              <button
                type="button"
                aria-current={root.current ? 'true' : undefined}
                className={cn(ROW_CLASS, root.current && 'bg-accent')}
                onClick={() => onOpen(null)}
              >
                {root.state ? <NativeChatSubagentStatusIcon state={root.state} /> : null}
                <span className="min-w-0 truncate font-medium text-chat-foreground-strong">
                  {t('components.native-chat.agentTree.main', 'Main ({{value0}})', {
                    value0: root.label
                  })}
                </span>
                {root.state ? (
                  <span className="ml-auto shrink-0 text-chat-foreground-faint">
                    {sayNativeChatSubagentStateHeading(root.state)}
                  </span>
                ) : null}
              </button>
            </li>
            {model.rows.map((row) => (
              <li key={row.id} data-native-chat-agent-tree-row={row.id}>
                <AgentTreeRow row={row} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}

function AgentTreeRow({
  row,
  onOpen
}: {
  row: NativeChatAgentTreeRow
  onOpen: (agentId: string) => void
}): React.JSX.Element {
  const working = row.state === 'working'
  return (
    <button
      type="button"
      aria-current={row.current ? 'true' : undefined}
      className={cn(ROW_CLASS, 'gap-0 py-0', row.current && 'bg-accent')}
      onClick={() => onOpen(row.id)}
    >
      {/* One column per ancestor level: │ while that level has more rows below. */}
      {row.guides.map((continues, level) => (
        <span key={level} aria-hidden className={INDENT_CLASS}>
          {continues ? <span className={cn(LINE_CLASS, 'inset-y-0 border-l')} /> : null}
        </span>
      ))}
      <span aria-hidden className={INDENT_CLASS}>
        <span className={cn(LINE_CLASS, 'top-0 h-1/2 w-2 rounded-bl-[3px] border-b border-l')} />
        {row.isLast ? null : <span className={cn(LINE_CLASS, 'top-1/2 bottom-0 border-l')} />}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <NativeChatSubagentStatusIcon state={row.state} />
        <span className="min-w-0 flex-1 truncate text-chat-foreground">{row.label}</span>
        <span className="flex shrink-0 items-center gap-2 tabular-nums text-chat-foreground-faint">
          <span className={cn('max-w-28 truncate', row.toolName && 'font-mono text-3xs')}>
            {row.toolName ?? sayNativeChatSubagentStateHeading(row.state)}
          </span>
          {row.startedAt !== undefined ? (
            // Ticking digits stay out of live announcements.
            <span aria-hidden={working || undefined}>
              <SubagentElapsed
                startedAt={row.startedAt}
                settledAt={row.settledAt ?? null}
                counting={working}
              />
            </span>
          ) : null}
          {row.tokens !== undefined ? (
            <span className="hidden @md/agent-tree:inline">
              {say('tokens', { value0: formatSubagentTokens(row.tokens) })}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  )
}
