import type { RecommendationResult, StudentProfile, University, UniversityProgram } from '../types'
import { programs } from '../data/programs'
import { universities } from '../data/universities'
import { recommendPrograms, type RecommendationResponse } from '../logic/recommendation'
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
    const [universityRecords, programRecords] = await Promise.all([
      this.getUniversities(),
      Promise.resolve(programs),
    ])
    return recommendPrograms({
      profile: {
        ...profile,
        interests: [...profile.interests],
        preferredRegions: [...profile.preferredRegions],
        preferredMethods: [...profile.preferredMethods],
      },
      universities: universityRecords,
      programs: programRecords,
    })
  },

  async simulateRecommendations(profile, changes) {
    const [universityRecords, programRecords] = await Promise.all([
      this.getUniversities(),
      Promise.resolve(programs),
    ])
    return simulateScenario({
      profile: {
        ...profile,
        interests: [...profile.interests],
        preferredRegions: [...profile.preferredRegions],
        preferredMethods: [...profile.preferredMethods],
      },
      universities: universityRecords,
      programs: programRecords,
    }, changes)
  },
}
