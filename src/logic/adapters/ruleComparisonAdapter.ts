import type { DataSource, DataStatus, UniversityProgram } from '../../types'

/**
 * Structural input matching PR #3's RuleSource. Kept local to the adapter so
 * the shared schema does not acquire a dependency on the rule-comparison module.
 */
export interface RuleSourceInput {
  name: string
  url: string | null
  appliedYear: number | null
  version: string
  checkedAt: string | null
  dataStatus: DataStatus
}

/** Convert only complete source metadata; incomplete values remain local to the rule snapshot. */
export function ruleSourceToDataSource(source: RuleSourceInput): DataSource | null {
  if (!source.url || source.appliedYear === null || !source.checkedAt) return null
  return {
    title: source.name,
    url: source.url,
    applicableYear: source.appliedYear,
    checkedAt: source.checkedAt,
    status: source.dataStatus,
  }
}

/** Adapt a shared source into the richer, versioned PR #3 source shape. */
export function dataSourceToRuleSource(source: DataSource, version: string): RuleSourceInput {
  return {
    name: source.title,
    url: source.url,
    appliedYear: source.applicableYear,
    version,
    checkedAt: source.checkedAt,
    dataStatus: source.status,
  }
}

export interface RuleTuitionSnapshotInput {
  minVndPerYear: number | null
  maxVndPerYear: number | null
  appliedYear: number | null
  dataStatus: DataStatus
  sourceUrl: string | null
}

/** Maps the optional PR #3 snapshot to the existing program tuition fields without filling gaps. */
export function applyTuitionSnapshot(
  program: UniversityProgram,
  snapshot: RuleTuitionSnapshotInput | null | undefined,
): Pick<UniversityProgram, 'tuitionMinVndPerYear' | 'tuitionMaxVndPerYear' | 'tuitionYear'> {
  if (!snapshot) {
    return {
      tuitionMinVndPerYear: program.tuitionMinVndPerYear,
      tuitionMaxVndPerYear: program.tuitionMaxVndPerYear,
      tuitionYear: program.tuitionYear,
    }
  }
  return {
    tuitionMinVndPerYear: snapshot.minVndPerYear,
    tuitionMaxVndPerYear: snapshot.maxVndPerYear,
    tuitionYear: snapshot.appliedYear,
  }
}
