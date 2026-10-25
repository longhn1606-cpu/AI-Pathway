import type { AdmissionMethod, StudentProfile } from '../types'

export type UiInterest =
  | 'technology'
  | 'business'
  | 'health'
  | 'education'
  | 'arts'
  | 'other'
  | 'undecided'

export type UiRegion = 'north' | 'central' | 'south' | 'anywhere'
export type UiBudget = 'under20' | '20to40' | '40to70' | 'over70' | 'flexible'

export interface UiStudentProfile {
  score: string
  interest: UiInterest | ''
  region: UiRegion | ''
  budget: UiBudget | ''
  keywords: string
  preferredMethods: AdmissionMethod[]
}

/**
 * Converts the existing UI form to the shared domain contract.
 * The UI budget bands are upper bounds, not claims about exact affordability.
 */
export function toStudentProfile(profile: UiStudentProfile): StudentProfile {
  const scoreText = profile.score.trim()
  const parsedScore = scoreText === '' ? null : Number(scoreText)
  const expectedScore =
    parsedScore !== null && Number.isFinite(parsedScore) && parsedScore >= 0 && parsedScore <= 30
      ? parsedScore
      : null

  const interests =
    !profile.interest || profile.interest === 'undecided' ? [] : [profile.interest]

  const preferredRegions =
    !profile.region || profile.region === 'anywhere'
      ? ['nationwide' as const]
      : [profile.region]

  // The recommendation contract treats this as a conservative maximum annual-budget ceiling.
  // It is not an estimate of the user's exact spending capacity.
  const budgetCeilings: Record<UiBudget, number | null> = {
    under20: 20_000_000,
    '20to40': 40_000_000,
    '40to70': 70_000_000,
    over70: null,
    flexible: null,
  }
  const annualBudgetVnd = profile.budget ? budgetCeilings[profile.budget] : null

  return {
    expectedScore,
    scoreScale: expectedScore === null ? null : 30,
    interests,
    preferredRegions,
    annualBudgetVnd,
    preferredMethods: [...profile.preferredMethods],
  }
}

export function validateUiProfile(profile: UiStudentProfile): string[] {
  const errors: string[] = []
  if (!profile.score.trim()) errors.push('Vui lòng nhập điểm dự kiến.')
  else {
    const score = Number(profile.score)
    if (!Number.isFinite(score) || score < 0 || score > 30) {
      errors.push('Điểm dự kiến phải nằm trong khoảng 0–30.')
    }
  }
  if (!profile.interest) errors.push('Vui lòng chọn nhóm ngành quan tâm.')
  if (!profile.region) errors.push('Vui lòng chọn khu vực mong muốn.')
  if (!profile.budget) errors.push('Vui lòng chọn ngân sách học phí.')
  return errors
}
