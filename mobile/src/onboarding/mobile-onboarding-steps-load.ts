import { shouldPresentNotificationOptIn } from '../notifications/delivery-policy/notification-opt-in-gate'
import { shouldPresentSessionViewOptIn } from '../session/session-view-opt-in-gate'
import { MOBILE_ONBOARDING_STEPS, type MobileOnboardingStep } from './mobile-onboarding-plan'

export async function loadMobileOnboardingSteps(): Promise<MobileOnboardingStep[]> {
  // Read independent gates together so complete progress dots do not add serial latency.
  const [showSessionView, showNotifications] = await Promise.all([
    shouldPresentSessionViewOptIn(),
    shouldPresentNotificationOptIn()
  ])
  return MOBILE_ONBOARDING_STEPS.filter(
    (step) =>
      (step === 'session-view' && showSessionView) ||
      (step === 'notifications' && showNotifications)
  )
}
