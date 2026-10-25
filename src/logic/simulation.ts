import type { StudentProfile } from '../types'
import {
  compareRecommendations,
  recommendPrograms,
  type RecommendationComparison,
  type RecommendationInput,
  type RecommendationResponse,
} from './recommendation'

export interface SimulationResult {
  /** Independent copy of the profile used for this scenario. */
  scenarioProfile: StudentProfile
  before: RecommendationResponse
  after: RecommendationResponse
  comparison: RecommendationComparison
}

/**
 * Runs a counterfactual scenario without mutating the original profile or data.
 * Only StudentProfile fields can be overridden; the source datasets are shared read-only.
 */
export function simulateScenario(
  baseline: RecommendationInput,
  changes: Partial<StudentProfile>,
): SimulationResult {
  const cloneProfile = (profile: StudentProfile): StudentProfile => ({
    ...profile,
    interests: [...profile.interests],
    preferredRegions: [...profile.preferredRegions],
    preferredMethods: [...profile.preferredMethods],
  })

  const scenarioProfile: StudentProfile = {
    ...cloneProfile(baseline.profile),
    ...changes,
    interests: changes.interests ? [...changes.interests] : [...baseline.profile.interests],
    preferredRegions: changes.preferredRegions
      ? [...changes.preferredRegions]
      : [...baseline.profile.preferredRegions],
    preferredMethods: changes.preferredMethods
      ? [...changes.preferredMethods]
      : [...baseline.profile.preferredMethods],
  }

  const scenario: RecommendationInput = {
    profile: scenarioProfile,
    universities: baseline.universities,
    programs: baseline.programs,
  }

  return {
    scenarioProfile,
    before: recommendPrograms(baseline),
    after: recommendPrograms(scenario),
    comparison: compareRecommendations(baseline, scenario),
  }
}
