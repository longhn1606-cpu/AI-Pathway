
export type DataStatus =
  | 'verified'
  | 'needs_review'
  | 'simulated'

export type AdmissionMethod =
  | 'high_school_exam'
  | 'academic_record'
  | 'competency_assessment'
  | 'direct_admission'
  | 'other'

export type GeographicRegion =
  | 'north'
  | 'central'
  | 'south'
  | 'nationwide'

export interface DataSource {
  title: string
  url: string
  applicableYear: number
  checkedAt: string
  status: DataStatus
}

export interface University {
  id: string
  name: string
  shortName: string
  province: string
  region: Exclude<GeographicRegion, 'nationwide'>
  website: string
  sources: DataSource[]
  status: DataStatus
}

export interface AdmissionMethodInfo {
  method: AdmissionMethod
  description: string
  applicableYear: number
  sourceIds: string[]
  status: DataStatus
}

export interface UniversityProgram {
  id: string
  universityId: string
  name: string
  majorGroup: string
  tuitionMinVndPerYear: number | null
  tuitionMaxVndPerYear: number | null
  tuitionYear: number | null
  admissionMethods: AdmissionMethodInfo[]
  historicalCutoff: number | null
  cutoffYear: number | null
  cutoffScale: number | null
  sources: DataSource[]
  status: DataStatus
}

export interface StudentProfile {
  expectedScore: number | null
  scoreScale: number | null
  interests: string[]
  preferredRegions: GeographicRegion[]
  annualBudgetVnd: number | null
  preferredMethods: AdmissionMethod[]
}

export interface RecommendationResult {
  programId: string
  suitabilityReasons: string[]
  warnings: string[]
  dataStatus: DataStatus
}
