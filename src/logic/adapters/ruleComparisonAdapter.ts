import type { DataSource, DataStatus, UniversityProgram } from '../../types'

export interface RuleSourceInput {
  name: string
  url: string | null
  appliedYear: number | null
  version: string
  checkedAt: string | null
  dataStatus: DataStatus
}

export function ruleSourceToDataSource(source: RuleSourceInput): DataSource | null {
  if (!source.url?.trim() || source.appliedYear === null || !source.checkedAt?.trim()) return null
  return {
    title: source.name,
    url: source.url,
    applicableYear: source.appliedYear,
    checkedAt: source.checkedAt,
    status: source.dataStatus,
  }
}

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

export interface TuitionSnapshotAdaptation {
  tuition: Pick<UniversityProgram, 'tuitionMinVndPerYear' | 'tuitionMaxVndPerYear' | 'tuitionYear'>
  /** Provenance stays attached; it is not represented by UniversityProgram tuition fields. */
  provenance: {
    dataStatus: DataStatus
    sourceUrl: string | null
  } | null
}

export function applyTuitionSnapshot(
  program: UniversityProgram,
  snapshot: RuleTuitionSnapshotInput | null | undefined,
): TuitionSnapshotAdaptation {
  if (!snapshot) {
    return {
      tuition: {
        tuitionMinVndPerYear: program.tuitionMinVndPerYear,
        tuitionMaxVndPerYear: program.tuitionMaxVndPerYear,
        tuitionYear: program.tuitionYear,
      },
      provenance: null,
    }
  }
  return {
    tuition: {
      tuitionMinVndPerYear: snapshot.minVndPerYear,
      tuitionMaxVndPerYear: snapshot.maxVndPerYear,
      tuitionYear: snapshot.appliedYear,
    },
    provenance: {
      dataStatus: snapshot.dataStatus,
      sourceUrl: snapshot.sourceUrl,
    },
  }
}
