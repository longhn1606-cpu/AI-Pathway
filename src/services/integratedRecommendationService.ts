import type {
  RecommendationResult,
  StudentProfile,
  University,
  UniversityProgram,
} from '../types'
import { programs as canonicalPrograms, universities as canonicalUniversities, historicalCutoffs as canonicalHistoricalCutoffs } from '../data/admissionsData'
import type { HistoricalCutoffsDataset } from '../data/admissionsDataValidation'
import { toRecommendationDataset } from '../adapters/recommendationDatasetAdapter'
import {
  recommendPrograms,
  type RecommendationResponse,
} from '../logic/recommendation'
import {
  simulateScenario,
  type SimulationResult,
} from '../logic/simulation'

export interface AdmissionsDataProvider {
  getUniversities(): University[]
  getPrograms(): UniversityProgram[]
  getHistoricalCutoffs?(): HistoricalCutoffsDataset
}

export interface IntegratedRecommendationInput {
  profile: StudentProfile
}

export interface IntegratedRecommendationService {
  getUniversities(): Promise<University[]>
  getProgramsByUniversity(universityId: string): Promise<UniversityProgram[]>
  recommend(input: IntegratedRecommendationInput): Promise<RecommendationResponse>
  getRecommendations(input: IntegratedRecommendationInput): Promise<RecommendationResult[]>
  simulate(
    input: IntegratedRecommendationInput,
    changes: Partial<StudentProfile>,
  ): Promise<SimulationResult>
}

const canonicalProvider: AdmissionsDataProvider = {
  getUniversities: () => canonicalUniversities,
  getPrograms: () => canonicalPrograms,
  getHistoricalCutoffs: () => canonicalHistoricalCutoffs,
}

function cloneProfile(profile: StudentProfile): StudentProfile {
  return {
    ...profile,
    interests: [...profile.interests],
    preferredRegions: [...profile.preferredRegions],
    preferredMethods: [...profile.preferredMethods],
  }
}

function cloneUniversity(university: University): University {
  return {
    ...university,
    sources: university.sources.map((source) => ({ ...source })),
  }
}

function cloneProgram(program: UniversityProgram): UniversityProgram {
  return {
    ...program,
    admissionMethods: program.admissionMethods.map((method) => ({
      ...method,
      sourceIds: [...method.sourceIds],
    })),
    sources: program.sources.map((source) => ({ ...source })),
  }
}

/**
 * Integration seam: Member 1 owns canonical data, Member 3 owns recommendation
 * and simulation logic. This service only injects validated canonical records
 * into the existing engine; it does not duplicate ranking rules.
 */
export function createIntegratedRecommendationService(
  data: AdmissionsDataProvider = canonicalProvider,
): IntegratedRecommendationService {
  const readUniversities = () => data.getUniversities().map(cloneUniversity)
  const readPrograms = () => data.getPrograms().map(cloneProgram)
  const readHistoricalCutoffs = (): HistoricalCutoffsDataset =>
    data.getHistoricalCutoffs?.() ?? {
      title: 'No historical cutoff data supplied',
      years: [],
      checkedAt: '1970-01-01',
      scoringPolicy: 'No historical cutoff data supplied; leave cutoff fields unknown.',
      records: [],
    }

  function buildInput(profile: StudentProfile) {
    return toRecommendationDataset(cloneProfile(profile), {
      universities: readUniversities(),
      programs: readPrograms(),
      historicalCutoffs: readHistoricalCutoffs(),
    })
  }

  return {
    async getUniversities() {
      return readUniversities()
    },

    async getProgramsByUniversity(universityId) {
      return readPrograms().filter((program) => program.universityId === universityId)
    },

    async recommend({ profile }) {
      return recommendPrograms(buildInput(profile))
    },

    async getRecommendations({ profile }) {
      return recommendPrograms(buildInput(profile)).results
    },

    async simulate({ profile }, changes) {
      return simulateScenario(buildInput(profile), {
        ...changes,
        interests: changes.interests ? [...changes.interests] : undefined,
        preferredRegions: changes.preferredRegions ? [...changes.preferredRegions] : undefined,
        preferredMethods: changes.preferredMethods ? [...changes.preferredMethods] : undefined,
      }, (scenarioProfile) => buildInput(scenarioProfile))
    },
  }
}

export const integratedRecommendationService = createIntegratedRecommendationService()
