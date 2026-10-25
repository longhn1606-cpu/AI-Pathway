import type {
  RecommendationResult,
  StudentProfile,
  University,
  UniversityProgram,
} from '../types'

export interface RecommendationInput {
  profile: StudentProfile
  universities: University[]
  programs: UniversityProgram[]
}

export interface RecommendationResponse {
  results: RecommendationResult[]
  excluded: Array<{ programId: string; reasons: string[] }>
  warnings: string[]
}

export interface RecommendationEngine {
  recommendPrograms(input: RecommendationInput): RecommendationResponse
}

/**
 * Dependency-injected boundary: the UI does not duplicate recommendation rules.
 * Pass the member-3 implementation when its branch is integrated.
 */
export function createRecommendationService(engine: RecommendationEngine) {
  return {
    recommend(input: RecommendationInput): RecommendationResponse {
      return engine.recommendPrograms(input)
    },
  }
}
