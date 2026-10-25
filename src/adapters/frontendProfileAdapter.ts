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
 * Range choices are represented by their upper bound where one exists.
 * "Over 70" and "flexible" remain unknown rather than inventing a value.
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

  const interests =
    input.interest && input.interest !== 'undecided' ? [input.interest] : []

  const preferredRegions: GeographicRegion[] =
    input.region && input.region !== 'anywhere' ? [input.region] : ['nationwide']

  return {
    expectedScore,
    scoreScale: expectedScore === null ? null : 30,
    interests,
    preferredRegions,
    annualBudgetVnd: input.budget ? budgetCeilings[input.budget] : null,
    // The current form does not collect admission-method preferences.
    preferredMethods: [],
  }
}
