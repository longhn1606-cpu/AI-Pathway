import universitiesJson from '../../data/admissions-seed-2026/universities.json'
import programsJson from '../../data/admissions-seed-2026/programs.json'
import historicalCutoffsJson from '../../data/admissions-seed-2026/historical_cutoffs.json'
import type { DataSource, University, UniversityProgram } from '../types'
import { resolveUniqueSourceByTitle, validateAdmissionsDataset } from './admissionsDataValidation'
export type { HistoricalCutoffRecord, HistoricalCutoffsDataset } from './admissionsDataValidation'

const datasetErrors = validateAdmissionsDataset(universitiesJson, programsJson, historicalCutoffsJson)
if (datasetErrors.length) throw new Error(`Invalid AI Pathway admissions dataset:\n- ${datasetErrors.join('\n- ')}`)

export const universities = universitiesJson as University[]
export const programs = programsJson as UniversityProgram[]
export const historicalCutoffs = historicalCutoffsJson as import('./admissionsDataValidation').HistoricalCutoffsDataset

/**
 * sourceIds has no formal ID contract in the shared schema. This resolver
 * supports title references only when an exact, unique match exists.
 */
export function resolveProgramSource(program: UniversityProgram, sourceReference: string): DataSource | undefined {
  return resolveUniqueSourceByTitle(program.sources, sourceReference)
}

export function resolveMethodSources(program: UniversityProgram, sourceReferences: string[]): DataSource[] {
  return sourceReferences
    .map((reference) => resolveProgramSource(program, reference))
    .filter((source): source is DataSource => source !== undefined)
}
