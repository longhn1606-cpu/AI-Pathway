import type { AdmissionMethod, DataStatus } from '../../types'

export type RuleChangeType = 'added' | 'removed' | 'modified'

export type RuleValue =
  | string
  | number
  | boolean
  | null
  | RuleValue[]
  | { [key: string]: RuleValue }

export interface RuleSource {
  name: string
  url: string | null
  appliedYear: number | null
  version: string
  checkedAt: string | null
  dataStatus: DataStatus
}

/** Optional snapshot: unknown tuition must remain null, never be inferred. */
export interface TuitionSnapshot {
  minVndPerYear: number | null
  maxVndPerYear: number | null
  appliedYear: number | null
  dataStatus: DataStatus
  sourceUrl: string | null
}

/** One independently sourced, time-scoped version of an institution/program rule. */
export interface AdmissionRuleVersion {
  id: string
  institutionId: string
  institutionName: string
  programId: string | null
  programName: string | null
  source: RuleSource
  admissionMethod: AdmissionMethod | null
  conditions: { [key: string]: RuleValue }
  tuition?: TuitionSnapshot | null
}

export interface RuleComparisonInput {
  before: AdmissionRuleVersion
  after: AdmissionRuleVersion
}

export interface RuleChange {
  field: string
  changeType: RuleChangeType
  oldValue: RuleValue | undefined
  newValue: RuleValue | undefined
}

export type ChangedField = RuleChange

export interface RuleComparison {
  oldVersionId: string
  newVersionId: string
  changes: RuleChange[]
  /** Explicitly linked only when both snapshots share the same institution ID. */
  affectedUniversities: string[]
  /** Explicitly linked only when both snapshots share institution and non-null program IDs. */
  affectedMajors: string[]
  /** Backward-compatible alias for affectedMajors. */
  affectedPrograms: string[]
  evidence: string[]
  limitations: string[]
  sources: RuleSource[]
  dataStatus: DataStatus
  tuitionStatus: DataStatus | null
  tuition: { old: TuitionSnapshot | null; new: TuitionSnapshot | null }
}

export type ExplanationMode = 'template'

export type RuleImpactLevel = 'high' | 'medium' | 'low' | 'requires_review'

export interface RuleExplanation {
  mode: ExplanationMode
  impactLevel: RuleImpactLevel
  impactAssessment: string
  summary: string
  whatChanged: string[]
  potentiallyAffected: string[]
  tuitionImpact: string[]
  nextSteps: string[]
  unknowns: string[]
  sourceDisclosure: string[]
  limitations: string[]
}
