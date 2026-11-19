import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import type {
  NativeChatMessage,
  NativeChatSubagentState
} from '../../../../../../src/shared/native-chat/native-chat-types'
import { formatAgentTypeLabel } from '../../../../../../src/shared/agent-status/presentation/agent-type-label'
import {
  formatSubagentTokens,
  subagentStateLabel
} from '../../../../../../src/shared/native-chat/transcript/subagents/native-chat-subagent-group-header'
import {
  buildNativeChatAgentTree,
  isNativeChatAgentTreeExpanded,
  nativeChatAgentTreeRoster,
  type NativeChatAgentTreeRow
} from '../../../../../../src/shared/native-chat/transcript/subagents/native-chat-agent-tree-model'
import {
  chooseNativeChatAgentTreeExpanded,
  nativeChatAgentTreeChoice,
  subscribeNativeChatAgentTreeChoice
} from '../../../../../../src/shared/native-chat/transcript/subagents/native-chat-agent-tree-choice'
import { useMobileTranslation } from '../../../../i18n/use-mobile-translation'
import { colors, feedback, radii, spacing, typography } from '../../../../theme/mobile-theme'
import { themedStyleSheet } from '../../../../theme/themed-styles'
import { useMobileColorScheme } from '../../../../theme/use-mobile-color-scheme'
import { sayMobileNativeChatSubagentGroup as say } from './native-chat-subagent-group-copy'
import { SubagentElapsed, subagentStateDotStyle } from './MobileNativeChatSubagentGroup'

/** One indent column; a connector line runs down its middle. */
const INDENT = 16
const ROW_HEIGHT = 28
/** Connectors read as structure, quieter than the muted text beside them. */
const CONNECTOR_OPACITY = 0.4

function stateWord(state: NativeChatSubagentState): string {
  return subagentStateLabel(state, 1, 1, say)
}

/** Atop the chat: the main agent and its subagents as a tree. Mobile has no per-subagent view, so rows only show. */
export function MobileNativeChatAgentTree({
  scope: sessionKey,
  messages,
  agent,
  agentWorking
}: {
  /** The chat's session scope, which keys the person's open/closed choice. */
  scope: string
  messages: readonly NativeChatMessage[]
  agent?: string | null
  agentWorking?: boolean
}): React.JSX.Element | null {
  useMobileColorScheme()
  const t = useMobileTranslation()
  const unnamed = t('chat.agentTree.unnamed', 'Subagent')
  const model = useMemo(() => {
    const roster = nativeChatAgentTreeRoster(messages)
    return buildNativeChatAgentTree({
      ...roster,
      main: {
        label: formatAgentTypeLabel(agent),
        state: agentWorking ? 'working' : 'idle'
      },
      viewedId: null,
      unnamed
    })
  }, [agent, agentWorking, messages, unnamed])
  const readChoice = useCallback(() => nativeChatAgentTreeChoice(sessionKey), [sessionKey])
  const choice = useSyncExternalStore(subscribeNativeChatAgentTreeChoice, readChoice, readChoice)
  if (model === null) {
    return null
  }
  const expanded = isNativeChatAgentTreeExpanded(model, choice)
  const { total, working, root } = model
  const summary =
    working > 0
      ? total === 1
        ? t('chat.agentTree.summaryWorking_one', '{{count}} agent · {{working}} working', {
            count: total,
            working
          })
        : t('chat.agentTree.summaryWorking_other', '{{count}} agents · {{working}} working', {
            count: total,
            working
          })
      : total === 1
        ? t('chat.agentTree.summaryDone_one', '{{count}} agent · done', {
            count: total
          })
        : t('chat.agentTree.summaryDone_other', '{{count}} agents · all done', {
            count: total
          })
  return (
    <View testID="native-chat-agent-tree" style={styles.panel}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        hitSlop={6}
        style={({ pressed }) => [styles.header, pressed && styles.pressed]}
        onPress={() => chooseNativeChatAgentTreeExpanded(sessionKey, !expanded)}
      >
        <View style={expanded ? styles.caretOpen : undefined}>
          <ChevronRight size={14} color={colors.textMuted} strokeWidth={2} />
        </View>
        <Text style={styles.summary} numberOfLines={1}>
          {summary}
        </Text>
      </Pressable>
      {expanded ? (
        <View>
          <View style={styles.row}>
            {root.state ? <View style={[styles.dot, subagentStateDotStyle(root.state)]} /> : null}
            <Text style={styles.rootLabel} numberOfLines={1}>
              {t('chat.agentTree.main', 'Main ({{value0}})', {
                value0: root.label
              })}
            </Text>
            {root.state ? (
              <Text style={styles.meta} numberOfLines={1}>
                {stateWord(root.state)}
              </Text>
            ) : null}
          </View>
          {model.rows.map((row) => (
            <AgentTreeRow key={row.id} row={row} />
          ))}
        </View>
      ) : null}
    </View>
  )
}

function AgentTreeRow({ row }: { row: NativeChatAgentTreeRow }): React.JSX.Element {
  const working = row.state === 'working'
  return (
    <View testID="native-chat-agent-tree-row" style={styles.row}>
      {/* One column per ancestor level: a line while that level has more rows below. */}
      {row.guides.map((continues, level) => (
        <View key={level} style={styles.indent}>
          {continues ? <View style={styles.lineFull} /> : null}
        </View>
      ))}
      <View style={styles.indent}>
        <View style={styles.elbow} />
        {row.isLast ? null : <View style={styles.lineLower} />}
      </View>
      <View style={[styles.dot, subagentStateDotStyle(row.state)]} />
      <Text style={styles.label} numberOfLines={1}>
        {row.label}
      </Text>
      <Text style={styles.meta} numberOfLines={1}>
        {row.toolName ?? stateWord(row.state)}
        {row.startedAt !== undefined ? (
          <>
            {' · '}
            <SubagentElapsed
              startedAt={row.startedAt}
              settledAt={row.settledAt ?? null}
              counting={working}
            />
          </>
        ) : null}
        {row.tokens !== undefined ? ` · ${formatSubagentTokens(row.tokens)}` : null}
      </Text>
    </View>
  )
}

const styles = themedStyleSheet(() => ({
  panel: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle
  },
  header: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  pressed: {
    opacity: feedback.pressedOpacity
  },
  caretOpen: {
    transform: [{ rotate: '90deg' }]
  },
  summary: {
    flexShrink: 1,
    color: colors.textMuted,
    fontSize: typography.metaSize
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radii.pill
  },
  rootLabel: {
    flexShrink: 1,
    color: colors.textPrimary,
    fontSize: typography.bodySize,
    fontWeight: '600'
  },
  label: {
    flex: 1,
    minWidth: 0,
    color: colors.textPrimary,
    fontSize: typography.bodySize
  },
  meta: {
    marginLeft: 'auto',
    flexShrink: 0,
    maxWidth: '45%',
    color: colors.textMuted,
    fontSize: typography.metaSize
  },
  // Negative margin cancels the row gap so indent columns sit flush and lines meet.
  indent: {
    width: INDENT,
    alignSelf: 'stretch',
    marginRight: -spacing.sm
  },
  lineFull: {
    position: 'absolute',
    left: 2,
    top: 0,
    bottom: 0,
    borderLeftWidth: 1,
    borderLeftColor: colors.textMuted,
    opacity: CONNECTOR_OPACITY
  },
  elbow: {
    position: 'absolute',
    left: 2,
    top: 0,
    height: ROW_HEIGHT / 2,
    width: INDENT / 2,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.textMuted,
    opacity: CONNECTOR_OPACITY
  },
  lineLower: {
    position: 'absolute',
    left: 2,
    top: ROW_HEIGHT / 2,
    bottom: 0,
    borderLeftWidth: 1,
    borderLeftColor: colors.textMuted,
    opacity: CONNECTOR_OPACITY
  }
}))
