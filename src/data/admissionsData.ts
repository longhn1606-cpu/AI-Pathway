import universitiesJson from '../../data/admissions-seed-2026/universities.json'
import programsJson from '../../data/admissions-seed-2026/programs.json'
import historicalCutoffsJson from '../../data/admissions-seed-2026/historical_cutoffs.json'
import type { DataSource, University, UniversityProgram } from '../types'

/**
 * Typed access to the canonical demo dataset.
 * The JSON files remain the source of truth; this module does not duplicate fixtures.
 */
export const universities = universitiesJson as University[]
export const programs = programsJson as UniversityProgram[]

export interface HistoricalCutoffRecord {
  id: string
  programId: string
  universityId: string
  year: number
  method: string
  cutoffScore: number | null
  scoreScale: number | null
  sourceUrl: string | null
  checkedAt: string
  status: 'verified' | 'needs_review' | 'simulated'
  notes?: string
}

export const historicalCutoffs = historicalCutoffsJson as {
  title: string
  years: number[]
  checkedAt: string
  scoringPolicy: string
  records: HistoricalCutoffRecord[]
}

/**
 * Legacy AdmissionMethodInfo.sourceIds currently stores source titles, not IDs.
 * Resolve that existing convention without changing the shared schema or fabricating links.
 */
export function resolveProgramSource(
  program: UniversityProgram,
  sourceReference: string,
): DataSource | undefined {
  return program.sources.find((source) => source.title === sourceReference)
}

export function resolveMethodSources(program: UniversityProgram, sourceReferences: string[]): DataSource[] {
  return sourceReferences
    .map((reference) => resolveProgramSource(program, reference))
    .filter((source): source is DataSource => source !== undefined)
}
