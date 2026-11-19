import type { MobileOnboardingStep } from './mobile-onboarding-plan'

// Why: first-run steps ask the phone for notification permission and its session view; a browser
// tab's Home has neither to offer, and the onboarding screen is not part of the page.
export function loadMobileOnboardingSteps(): Promise<MobileOnboardingStep[]> {
  return Promise.resolve([])
}
