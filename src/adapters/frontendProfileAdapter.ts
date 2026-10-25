import type { GeographicRegion, StudentProfile } from '../types'

export type FrontendInterest =
  | 'technology'
  | 'business'
  | 'health'
  | 'education'
  | 'arts'
  | 'other'
  | 'undecided'
  | ''

export type FrontendRegion = GeographicRegion | 'anywhere' | ''
export type FrontendBudget =
  | 'under20'
  | '20to40'
  | '40to70'
  | 'over70'
  | 'flexible'
  | ''

export interface FrontendProfileInput {
  score: string
  interest: FrontendInterest
  region: FrontendRegion
  budget: FrontendBudget
}

/**
 * Adapts the current UI form to the shared StudentProfile contract.
 *
 * Budget bands are interpreted as upper-bound filters. Unbounded/flexible
 * choices remain null; they are never converted into an invented amount.
 */
export function toStudentProfile(input: FrontendProfileInput): StudentProfile {
  const parsedScore = input.score.trim() === '' ? null : Number(input.score)
  const expectedScore =
    parsedScore !== null &&
    Number.isFinite(parsedScore) &&
    parsedScore >= 0 &&
    parsedScore <= 30
      ? parsedScore
      : null

  const budgetCeilings: Record<Exclude<FrontendBudget, ''>, number | null> = {
    under20: 20_000_000,
    '20to40': 40_000_000,
    '40to70': 70_000_000,
    over70: null,
    flexible: null,
  }

  return {
    expectedScore,
    scoreScale: expectedScore === null ? null : 30,
    interests: input.interest && input.interest !== 'undecided'
      ? [input.interest]
      : [],
    preferredRegions: input.region && input.region !== 'anywhere'
      ? [input.region]
      : [],
    annualBudgetVnd: input.budget ? budgetCeilings[input.budget] : null,
    // The current UI does not collect admission-method preferences.
    preferredMethods: [],
  }
}
