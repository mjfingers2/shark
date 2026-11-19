export const MOBILE_ONBOARDING_STEPS = ['session-view', 'notifications'] as const
export type MobileOnboardingStep = (typeof MOBILE_ONBOARDING_STEPS)[number]
export type MobileOnboardingDestination =
  | '/'
  | `/h/${string}`
  | {
      pathname: '/mobile-onboarding'
      params: { steps: string; hostId?: string }
    }

export function mobileOnboardingDestination(
  steps: readonly MobileOnboardingStep[],
  hostId?: string
): MobileOnboardingDestination {
  if (steps.length === 0) {
    return hostId ? `/h/${hostId}` : '/'
  }
  return {
    pathname: '/mobile-onboarding',
    params: { steps: steps.join(','), ...(hostId ? { hostId } : {}) }
  }
}

export function parseMobileOnboardingSteps(raw: string | undefined): MobileOnboardingStep[] {
  if (!raw) {
    return [...MOBILE_ONBOARDING_STEPS]
  }
  const requested = new Set(raw.split(','))
  const steps = MOBILE_ONBOARDING_STEPS.filter((step) => requested.has(step))
  return steps.length > 0 ? steps : [...MOBILE_ONBOARDING_STEPS]
}
