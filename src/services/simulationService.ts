import type { StudentProfile } from '../types'
import type {
  RecommendationInput,
  RecommendationResponse,
} from './recommendationService'

export interface RecommendationComparison {
  added: RecommendationResponse['results']
  removed: RecommendationResponse['results']
  retained: RecommendationResponse['results']
}

export interface SimulationResult {
  scenarioProfile: StudentProfile
  before: RecommendationResponse
  after: RecommendationResponse
  comparison: RecommendationComparison
}

export interface SimulationEngine {
  simulateScenario(
    baseline: RecommendationInput,
    changes: Partial<StudentProfile>,
  ): SimulationResult
}

/** Thin integration boundary for member-3 simulation; no simulation algorithm lives here. */
export function createSimulationService(engine: SimulationEngine) {
  return {
    simulate(
      baseline: RecommendationInput,
      changes: Partial<StudentProfile>,
    ): SimulationResult {
      return engine.simulateScenario(baseline, changes)
    },
  }
}
