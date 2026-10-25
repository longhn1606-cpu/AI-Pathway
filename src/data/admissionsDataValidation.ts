import type { AdmissionMethod, DataSource, DataStatus, University, UniversityProgram } from '../types'

const admissionMethods: readonly AdmissionMethod[] = [
  'high_school_exam', 'academic_record', 'competency_assessment', 'direct_admission', 'other',
]
const dataStatuses: readonly DataStatus[] = ['verified', 'needs_review', 'simulated']
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0
const isYear = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1900 && value <= 2200
const isNullableNumber = (value: unknown): value is number | null =>
  value === null || (typeof value === 'number' && Number.isFinite(value))
const isNullableYear = (value: unknown): value is number | null =>
  value === null || isYear(value)
const isHttpUrlOrNull = (value: unknown): value is string | null =>
  value === null || (typeof value === 'string' && /^https?:\\/\\//i.test(value.trim()))

function validateSources(value: unknown, label: string, errors: string[]): void {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array.`)
    return
  }
  value.forEach((source, index) => {
    if (!isRecord(source) || !isNonEmptyString(source.title) ||
        !isHttpUrlOrNull(source.url) || typeof source.url !== 'string' ||
        !isYear(source.applicableYear) || !isNonEmptyString(source.checkedAt) ||
        !dataStatuses.includes(source.status as DataStatus)) {
      errors.push(`${label}[${index}] has invalid source metadata.`)
    }
  })
}

export interface HistoricalCutoffRecord {
  id: string
  programId: string
  universityId: string
  year: number
  method: AdmissionMethod
  cutoffScore: number | null
  scoreScale: number | null
  sourceUrl: string | null
  checkedAt: string
  status: DataStatus
  notes?: string
}

export interface HistoricalCutoffsDataset {
  title: string
  years: number[]
  checkedAt: string
  scoringPolicy: string
  records: HistoricalCutoffRecord[]
}

export function validateAdmissionsDataset(
  universities: unknown,
  programs: unknown,
  cutoffs: unknown,
): string[] {
  const errors: string[] = []
  if (!Array.isArray(universities) || !Array.isArray(programs) ||
      !isRecord(cutoffs) || !Array.isArray(cutoffs.records)) {
    return ['Dataset roots must be arrays for universities/programs and an object with records for cutoffs.']
  }
  if (!isNonEmptyString(cutoffs.title) || !isNonEmptyString(cutoffs.checkedAt) ||
      !isNonEmptyString(cutoffs.scoringPolicy) || !Array.isArray(cutoffs.years) ||
      !cutoffs.years.every(isYear)) {
    errors.push('historicalCutoffs metadata is invalid.')
  }

  const universityIds = new Set<string>()
  for (const [index, item] of universities.entries()) {
    if (!isRecord(item) || !isNonEmptyString(item.id) || !isNonEmptyString(item.name) ||
        !isNonEmptyString(item.shortName) || !isNonEmptyString(item.province) ||
        !['north', 'central', 'south'].includes(String(item.region)) ||
        !isNonEmptyString(item.website) || !isHttpUrlOrNull(item.website) ||
        !dataStatuses.includes(item.status as DataStatus)) {
      errors.push(`universities[${index}] has invalid required fields.`)
      continue
    }
    if (universityIds.has(item.id)) errors.push(`Duplicate university id: ${item.id}`)
    universityIds.add(item.id)
    validateSources(item.sources, `universities[${index}].sources`, errors)
  }

  const programIds = new Set<string>()
  const programUniversityIds = new Map<string, string>()
  for (const [index, item] of programs.entries()) {
    if (!isRecord(item) || !isNonEmptyString(item.id) || !isNonEmptyString(item.universityId) ||
        !isNonEmptyString(item.name) || !isNonEmptyString(item.majorGroup) ||
        !isNullableNumber(item.tuitionMinVndPerYear) || !isNullableNumber(item.tuitionMaxVndPerYear) ||
        !isNullableYear(item.tuitionYear) || !isNullableNumber(item.historicalCutoff) ||
        !isNullableYear(item.cutoffYear) || !isNullableNumber(item.cutoffScale) ||
        !dataStatuses.includes(item.status as DataStatus) || !Array.isArray(item.admissionMethods)) {
      errors.push(`programs[${index}] has invalid required fields or nullability.`)
      continue
    }
    if (programIds.has(item.id)) errors.push(`Duplicate program id: ${item.id}`)
    programIds.add(item.id)
    programUniversityIds.set(item.id, item.universityId)
    if (!universityIds.has(item.universityId)) errors.push(`Program ${item.id} references unknown universityId ${item.universityId}`)
    if (item.tuitionMinVndPerYear !== null && item.tuitionMaxVndPerYear !== null &&
        item.tuitionMinVndPerYear > item.tuitionMaxVndPerYear) {
      errors.push(`Program ${item.id} has tuition minimum greater than maximum.`)
    }
    if (item.cutoffScale !== null && item.cutoffScale <= 0) errors.push(`Program ${item.id} has invalid cutoffScale.`)
    validateSources(item.sources, `programs[${index}].sources`, errors)
    for (const [methodIndex, method] of item.admissionMethods.entries()) {
      if (!isRecord(method) || !admissionMethods.includes(method.method as AdmissionMethod) ||
          !isNonEmptyString(method.description) || !isYear(method.applicableYear) ||
          !Array.isArray(method.sourceIds) || !method.sourceIds.every(isNonEmptyString) ||
          !dataStatuses.includes(method.status as DataStatus)) {
        errors.push(`Program ${item.id} admissionMethods[${methodIndex}] is invalid.`)
      }
    }
  }

  const cutoffIds = new Set<string>()
  for (const [index, item] of cutoffs.records.entries()) {
    if (!isRecord(item) || !isNonEmptyString(item.id) || !isNonEmptyString(item.programId) ||
        !isNonEmptyString(item.universityId) || !isYear(item.year) ||
        !admissionMethods.includes(item.method as AdmissionMethod) ||
        !isNullableNumber(item.cutoffScore) || !isNullableNumber(item.scoreScale) ||
        !isHttpUrlOrNull(item.sourceUrl) || !isNonEmptyString(item.checkedAt) ||
        !dataStatuses.includes(item.status as DataStatus)) {
      errors.push(`historicalCutoffs.records[${index}] has invalid required fields.`)
      continue
    }
    if (cutoffIds.has(item.id)) errors.push(`Duplicate cutoff id: ${item.id}`)
    cutoffIds.add(item.id)
    if (!programIds.has(item.programId)) errors.push(`Cutoff ${item.id} references unknown programId ${item.programId}`)
    if (!universityIds.has(item.universityId)) errors.push(`Cutoff ${item.id} references unknown universityId ${item.universityId}`)
    const owningUniversityId = programUniversityIds.get(item.programId)
    if (owningUniversityId && owningUniversityId !== item.universityId) {
      errors.push(`Cutoff ${item.id} universityId does not match its program.`)
    }
    if (item.scoreScale !== null && item.scoreScale <= 0) errors.push(`Cutoff ${item.id} has invalid scoreScale.`)
    if (item.cutoffScore !== null && item.cutoffScore < 0) errors.push(`Cutoff ${item.id} has negative cutoffScore.`)
    if (item.cutoffScore !== null && item.scoreScale !== null && item.cutoffScore > item.scoreScale) {
      errors.push(`Cutoff ${item.id} exceeds its scoreScale.`)
    }
  }
  return errors
}
