import { translate } from '../../i18n/mobile-i18n'
import type {
  MobileCommitAndPushOutcome,
  MobileCommitAndPushStep
} from './mobile-commit-and-push-run'

export function commitAndPushStepText(step: MobileCommitAndPushStep): string {
  switch (step) {
    case 'checking':
      return translate('shark.commitPush.checking', 'Checking changes…')
    case 'staging':
      return translate('shark.commitPush.staging', 'Staging every change…')
    case 'writing-message':
      return translate('shark.commitPush.writingMessage', 'AI is writing the commit message…')
    case 'committing':
      return translate('shark.commitPush.committing', 'Committing…')
    case 'pushing':
      return translate('shark.commitPush.pushing', 'Pushing…')
  }
}

/** The one line the session toast shows when the run ends. */
export function commitAndPushOutcomeText(outcome: MobileCommitAndPushOutcome): string {
  switch (outcome.kind) {
    case 'pushed':
      return outcome.committedMessage
        ? translate('shark.commitPush.done', 'Committed and pushed: {{message}}', {
            message: outcome.committedMessage.split('\n')[0]
          })
        : translate('shark.commitPush.pushedOnly', 'Pushed. There was nothing new to commit.')
    case 'nothing':
      return translate('shark.commitPush.nothing', 'Nothing new to commit or push.')
    case 'blocked':
      switch (outcome.reason) {
        case 'conflicts':
          return translate(
            'shark.commitPush.conflicts',
            'Resolve the conflicts in Source control first.'
          )
        case 'no-branch':
          return translate('shark.commitPush.noBranch', 'Check out a branch before pushing.')
        case 'behind-remote':
          return translate(
            'shark.commitPush.behindRemote',
            'The remote has newer commits. Sync in Source control first.'
          )
      }
      return ''
    case 'failed':
      return translate('shark.commitPush.failed', 'Commit and push failed: {{error}}', {
        error: outcome.error
      })
  }
}
