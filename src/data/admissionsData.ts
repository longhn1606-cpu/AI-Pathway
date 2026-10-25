import universitiesJson from '../../data/admissions-seed-2026/universities.json'
import programsJson from '../../data/admissions-seed-2026/programs.json'
import historicalCutoffsJson from '../../data/admissions-seed-2026/historical_cutoffs.json'
import type { AdmissionMethod, DataSource, DataStatus, University, UniversityProgram } from '../types'

const admissionMethods: readonly AdmissionMethod[] = [
  'high_school_exam', 'academic_record', 'competency_assessment', 'direct_admission', 'other',
]
const dataStatuses: readonly DataStatus[] = ['verified', 'needs_review', 'simulated']
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const isNullableNumber = (value: unknown): value is number | null =>
  value === null || (typeof value === 'number' && Number.isFinite(value))

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
  if (!Array.isArray(universities) || !Array.isArray(programs) || !isRecord(cutoffs) || !Array.isArray(cutoffs.records)) {
    return ['Dataset roots must be arrays for universities/programs and an object with records for cutoffs.']
  }
  const universityIds = new Set<string>()
  for (const [index, item] of universities.entries()) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string' ||
        typeof item.shortName !== 'string' || typeof item.province !== 'string' ||
        !['north', 'central', 'south'].includes(String(item.region)) ||
        !dataStatuses.includes(item.status as DataStatus) || !Array.isArray(item.sources)) {
      errors.push(`universities[${index}] has invalid required fields.`)
      continue
    }
    if (universityIds.has(item.id)) errors.push(`Duplicate university id: ${item.id}`)
    universityIds.add(item.id)
  }
  const programIds = new Set<string>()
  for (const [index, item] of programs.entries()) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.universityId !== 'string' ||
        typeof item.name !== 'string' || typeof item.majorGroup !== 'string' ||
        !isNullableNumber(item.tuitionMinVndPerYear) || !isNullableNumber(item.tuitionMaxVndPerYear) ||
        !isNullableNumber(item.tuitionYear) || !isNullableNumber(item.historicalCutoff) ||
        !isNullableNumber(item.cutoffYear) || !isNullableNumber(item.cutoffScale) ||
        !dataStatuses.includes(item.status as DataStatus) || !Array.isArray(item.sources) ||
        !Array.isArray(item.admissionMethods)) {
      errors.push(`programs[${index}] has invalid required fields or nullability.`)
      continue
    }
    if (programIds.has(item.id)) errors.push(`Duplicate program id: ${item.id}`)
    programIds.add(item.id)
    if (!universityIds.has(item.universityId)) errors.push(`Program ${item.id} references unknown universityId ${item.universityId}`)
    for (const method of item.admissionMethods) {
      if (!isRecord(method) || !admissionMethods.includes(method.method as AdmissionMethod) ||
          typeof method.description !== 'string' || typeof method.applicableYear !== 'number' ||
          !Array.isArray(method.sourceIds) || !dataStatuses.includes(method.status as DataStatus)) {
        errors.push(`Program ${item.id} contains an invalid admission method.`)
      }
    }
  }
  for (const [index, item] of cutoffs.records.entries()) {
    if (!isRecord(item) || typeof item.id !== 'string' || typeof item.programId !== 'string' ||
        typeof item.universityId !== 'string' || typeof item.year !== 'number' ||
        !admissionMethods.includes(item.method as AdmissionMethod) ||
        !isNullableNumber(item.cutoffScore) || !isNullableNumber(item.scoreScale) ||
        !(item.sourceUrl === null || typeof item.sourceUrl === 'string') ||
        typeof item.checkedAt !== 'string' || !dataStatuses.includes(item.status as DataStatus)) {
      errors.push(`historicalCutoffs.records[${index}] has invalid required fields.`)
      continue
    }
    if (!programIds.has(item.programId)) errors.push(`Cutoff ${item.id} references unknown programId ${item.programId}`)
    if (!universityIds.has(item.universityId)) errors.push(`Cutoff ${item.id} references unknown universityId ${item.universityId}`)
  }
  return errors
}

const datasetErrors = validateAdmissionsDataset(universitiesJson, programsJson, historicalCutoffsJson)
if (datasetErrors.length) throw new Error(`Invalid AI Pathway admissions dataset:\\n- ${datasetErrors.join('\\n- ')}`)

export const universities = universitiesJson as University[]
export const programs = programsJson as UniversityProgram[]
export const historicalCutoffs = historicalCutoffsJson as HistoricalCutoffsDataset

/**
 * sourceIds has no formal ID contract in the shared schema. This resolver
 * supports title references only when an exact, unique match exists.
 */
export function resolveProgramSource(program: UniversityProgram, sourceReference: string): DataSource | undefined {
  const matches = program.sources.filter((source) => source.title === sourceReference)
  return matches.length === 1 ? matches[0] : undefined
}

export function resolveMethodSources(program: UniversityProgram, sourceReferences: string[]): DataSource[] {
  return sourceReferences
    .map((reference) => resolveProgramSource(program, reference))
    .filter((source): source is DataSource => source !== undefined)
}
