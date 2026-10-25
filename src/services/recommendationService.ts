import type { RecommendationResult, StudentProfile, University, UniversityProgram } from '../types'
import { programs, universities, historicalCutoffs } from '../data/admissionsData'
import { toRecommendationDataset } from '../adapters/recommendationDatasetAdapter'
import { recommendPrograms, compareRecommendations, type RecommendationResponse } from '../logic/recommendation'
import { simulateScenario, type SimulationResult } from '../logic/simulation'

export interface UniversityService {
  getUniversities(): Promise<University[]>
  getProgramsByUniversity(universityId: string): Promise<UniversityProgram[]>
  getRecommendations(profile: StudentProfile): Promise<RecommendationResult[]>
  getRecommendationReport(profile: StudentProfile): Promise<RecommendationResponse>
  simulateRecommendations(profile: StudentProfile, changes: Partial<StudentProfile>): Promise<SimulationResult>
}

/**
 * Demo adapter implementing the shared service boundary.
 * Replace this adapter's data source with API calls when a backend is available.
 */
export const demoUniversityService: UniversityService = {
  async getUniversities() {
    return universities.map((university) => ({
      ...university,
      sources: university.sources.map((source) => ({ ...source })),
    }))
  },

  async getProgramsByUniversity(universityId) {
    return programs
      .filter((program) => program.universityId === universityId)
      .map((program) => ({
        ...program,
        admissionMethods: program.admissionMethods.map((method) => ({
          ...method,
          sourceIds: [...method.sourceIds],
        })),
        sources: program.sources.map((source) => ({ ...source })),
      }))
  },

  async getRecommendations(profile) {
    return (await this.getRecommendationReport(profile)).results
  },

  async getRecommendationReport(profile) {
    const profileCopy: StudentProfile = {
      ...profile,
      interests: [...profile.interests],
      preferredRegions: [...profile.preferredRegions],
      preferredMethods: [...profile.preferredMethods],
    }
    const input = toRecommendationDataset(profileCopy, {
      universities,
      programs,
      historicalCutoffs,
    })
    return recommendPrograms(input)
  },

  async simulateRecommendations(profile, changes) {
    const profileCopy: StudentProfile = {
      ...profile,
      interests: [...profile.interests],
      preferredRegions: [...profile.preferredRegions],
      preferredMethods: [...profile.preferredMethods],
    }
    const input = toRecommendationDataset(profileCopy, {
      universities,
      programs,
      historicalCutoffs,
    })
    return simulateScenario(input, changes, (scenarioProfile) =>
      toRecommendationDataset(scenarioProfile, {
        universities,
        programs,
        historicalCutoffs,
      }),
    )
  },
}
