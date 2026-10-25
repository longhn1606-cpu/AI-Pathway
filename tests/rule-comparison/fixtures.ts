import type { AdmissionRuleVersion, RuleConditions, RuleSource } from '../../src/logic/ruleTypes'

/**
 * Fixture CHỈ DÙNG CHO TEST. Các giá trị (kể cả URL ".invalid") là dữ liệu thử nghiệm,
 * không phải dữ liệu tuyển sinh và không được đưa vào src/data.
 */
export interface VersionOverrides {
  id?: string
  institutionId?: string
  institutionName?: string
  programId?: string | null
  programName?: string | null
  admissionMethod?: AdmissionRuleVersion['admissionMethod']
  conditions?: RuleConditions
  source?: Partial<RuleSource>
}

export function makeVersion(overrides: VersionOverrides = {}): AdmissionRuleVersion {
  return {
    id: overrides.id ?? 'test-v1',
    institutionId: overrides.institutionId ?? 'inst-1',
    institutionName: overrides.institutionName ?? 'Trường thử nghiệm',
    programId: overrides.programId === undefined ? 'prog-1' : overrides.programId,
    programName: overrides.programName === undefined ? 'Ngành thử nghiệm' : overrides.programName,
    admissionMethod: overrides.admissionMethod === undefined ? 'academic_record' : overrides.admissionMethod,
    conditions: overrides.conditions ?? {},
    source: {
      name: 'Nguồn thử nghiệm',
      url: 'https://example.invalid/rules',
      appliedYear: 2025,
      version: 'v1',
      checkedAt: '2025-01-01',
      dataStatus: 'verified',
      ...overrides.source,
    },
  }
}

/** Phiên bản giả lập: không URL, không ngày kiểm tra — giống kịch bản demo. */
export const simulatedSource = (year: number | null): Partial<RuleSource> => ({
  url: null,
  checkedAt: null,
  appliedYear: year,
  dataStatus: 'simulated',
})

export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) deepFreeze(child)
  }
  return value
}

export const jsonClone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
