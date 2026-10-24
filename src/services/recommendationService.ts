import type { RecommendationResult, StudentProfile, University, UniversityProgram } from '../types'
import { programs } from '../data/programs'
import { universities } from '../data/universities'
import { recommendPrograms } from '../logic/recommendation'

export interface UniversityService {
  getUniversities(): Promise<University[]>
  getProgramsByUniversity(universityId: string): Promise<UniversityProgram[]>
  getRecommendations(profile: StudentProfile): Promise<RecommendationResult[]>
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
    }).results
  },
}
