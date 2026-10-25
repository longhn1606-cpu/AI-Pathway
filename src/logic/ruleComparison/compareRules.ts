import type { DataStatus } from '../../types'
import type { AdmissionRuleVersion, RuleChange, RuleComparison, RuleValue } from './types'

export interface CompareRulesOptions {
  /** Additional paths whose arrays represent sets, so element order is not meaningful. */
  unorderedArrayPaths?: string[]
}

const DEFAULT_UNORDERED_ARRAY_PATHS = [
  'conditions.combinations',
  'conditions.subjectCombinations',
]

function isPlainObject(value: RuleValue | undefined): value is { [key: string]: RuleValue } {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function stableValue(value: RuleValue): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? String(value)
}

function valuesEqual(left: RuleValue | undefined, right: RuleValue | undefined, path: string, unordered: Set<string>): boolean {
  if (left === right) return true
  if (left === undefined || right === undefined) return false
  if (Array.isArray(left) && Array.isArray(right)) {
    if (unordered.has(path)) {
      const a = left.map(stableValue).sort()
      const b = right.map(stableValue).sort()
      return a.length === b.length && a.every((value, index) => value === b[index])
    }
    return left.length === right.length && left.every((value, index) => valuesEqual(value, right[index], `${path}[${index}]`, unordered))
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)])
    return [...keys].every((key) => valuesEqual(left[key], right[key], path ? `${path}.${key}` : key, unordered))
  }
  return left === right
}

function collectConditionChanges(oldValue: RuleValue | undefined, newValue: RuleValue | undefined, path: string, changes: RuleChange[], unordered: Set<string>): void {
  if (valuesEqual(oldValue, newValue, path, unordered)) return
  if (oldValue === undefined) {
    changes.push({ field: path, changeType: 'added', oldValue, newValue })
    return
  }
  if (newValue === undefined) {
    changes.push({ field: path, changeType: 'removed', oldValue, newValue })
    return
  }
  if (isPlainObject(oldValue) && isPlainObject(newValue)) {
    for (const key of [...new Set([...Object.keys(oldValue), ...Object.keys(newValue)])].sort()) {
      collectConditionChanges(oldValue[key], newValue[key], path ? `${path}.${key}` : key, changes, unordered)
    }
    return
  }
  changes.push({ field: path, changeType: 'modified', oldValue, newValue })
}

function effectiveStatus(statuses: DataStatus[]): DataStatus {
  if (statuses.includes('simulated')) return 'simulated'
  if (statuses.includes('needs_review')) return 'needs_review'
  return 'verified'
}

function compareScalar(changes: RuleChange[], field: string, oldValue: string | number | boolean | null | undefined, newValue: string | number | boolean | null | undefined): void {
  if (oldValue === newValue) return
  changes.push({
    field,
    changeType: oldValue === undefined ? 'added' : newValue === undefined ? 'removed' : 'modified',
    oldValue,
    newValue,
  })
}

/**
 * Compare only like-for-like snapshots. Different institution/program identities
 * are reported as identity differences; their admission conditions are not compared.
 */
export function compareRules(oldRule: AdmissionRuleVersion, newRule: AdmissionRuleVersion, options: CompareRulesOptions = {}): RuleComparison {
  const changes: RuleChange[] = []
  const unordered = new Set([...DEFAULT_UNORDERED_ARRAY_PATHS, ...(options.unorderedArrayPaths ?? [])])

  compareScalar(changes, 'institutionId', oldRule.institutionId, newRule.institutionId)
  compareScalar(changes, 'institutionName', oldRule.institutionName, newRule.institutionName)
  compareScalar(changes, 'programId', oldRule.programId, newRule.programId)
  compareScalar(changes, 'programName', oldRule.programName, newRule.programName)

  const sameInstitution = oldRule.institutionId === newRule.institutionId
  const sameProgramScope = oldRule.programId === newRule.programId
  const comparableScope = sameInstitution && sameProgramScope

  if (comparableScope) {
    compareScalar(changes, 'admissionMethod', oldRule.admissionMethod, newRule.admissionMethod)
    const sourceFields: Array<[string, string | number | boolean | null | undefined, string | number | boolean | null | undefined]> = [
      ['source.name', oldRule.source.name, newRule.source.name],
      ['source.url', oldRule.source.url, newRule.source.url],
      ['source.appliedYear', oldRule.source.appliedYear, newRule.source.appliedYear],
      ['source.version', oldRule.source.version, newRule.source.version],
      ['source.checkedAt', oldRule.source.checkedAt, newRule.source.checkedAt],
      ['source.dataStatus', oldRule.source.dataStatus, newRule.source.dataStatus],
    ]
    for (const [field, before, after] of sourceFields) compareScalar(changes, field, before, after)

    for (const key of [...new Set([...Object.keys(oldRule.conditions), ...Object.keys(newRule.conditions)])].sort()) {
      collectConditionChanges(oldRule.conditions[key], newRule.conditions[key], `conditions.${key}`, changes, unordered)
    }
  }

  const oldTuition = oldRule.tuition ?? null
  const newTuition = newRule.tuition ?? null
  if (comparableScope) {
    const tuitionFields = ['minVndPerYear', 'maxVndPerYear', 'appliedYear', 'dataStatus', 'sourceUrl'] as const
    if (oldTuition === null && newTuition !== null) {
      changes.push({ field: 'tuition', changeType: 'added', oldValue: null, newValue: 'provided' })
    } else if (oldTuition !== null && newTuition === null) {
      changes.push({ field: 'tuition', changeType: 'removed', oldValue: 'provided', newValue: null })
    } else if (oldTuition && newTuition) {
      for (const field of tuitionFields) compareScalar(changes, `tuition.${field}`, oldTuition[field], newTuition[field])
    }
  }

  const affectedUniversities = comparableScope ? [newRule.institutionId] : []
  const sameMajor = sameInstitution && oldRule.programId !== null && oldRule.programId === newRule.programId
  const affectedMajors = sameMajor ? [newRule.programId as string] : []
  const limitations: string[] = []

  if (oldRule.source.dataStatus !== 'verified' || newRule.source.dataStatus !== 'verified') {
    limitations.push('Ít nhất một phiên bản chưa ở trạng thái verified; kết quả chỉ phản ánh dữ liệu đầu vào.')
  }
  if (!oldRule.source.url || !newRule.source.url) limitations.push('Thiếu URL nguồn ở ít nhất một phiên bản; cần bổ sung hoặc kiểm tra tài liệu gốc.')
  if (oldRule.source.appliedYear === null || newRule.source.appliedYear === null) limitations.push('Thiếu năm áp dụng ở ít nhất một phiên bản; không thể xác nhận phạm vi thời gian.')
  if (!sameInstitution) limitations.push('Hai phiên bản thuộc institutionId khác nhau; không thể diễn giải đây là thay đổi theo thời gian của cùng một trường.')
  if (!sameProgramScope) limitations.push('Hai phiên bản thuộc programId khác nhau; không thể diễn giải đây là thay đổi của cùng một ngành.')
  if (!comparableScope) limitations.push('Chỉ các trường định danh trường/ngành được báo cáo; điều kiện tuyển sinh và học phí không được so sánh giữa hai phạm vi khác nhau.')
  if (comparableScope && changes.length === 0) limitations.push('Không phát hiện khác biệt trong các trường được module so sánh; điều này không chứng minh toàn bộ văn bản quy định giống nhau.')

  const tuitionStatuses = [oldTuition?.dataStatus, newTuition?.dataStatus].filter((status): status is DataStatus => status !== undefined)
  const tuitionStatus = tuitionStatuses.length ? effectiveStatus(tuitionStatuses) : null
  if (comparableScope && (!oldTuition || !newTuition)) {
    limitations.push('Thiếu snapshot học phí ở ít nhất một phiên bản; không thể kết luận học phí không thay đổi.')
  } else if (comparableScope && oldTuition && newTuition && (
    oldTuition.minVndPerYear === null || oldTuition.maxVndPerYear === null
    || newTuition.minVndPerYear === null || newTuition.maxVndPerYear === null
  )) {
    limitations.push('Học phí có trường chưa có dữ liệu; không ước tính hoặc tự điền giá trị còn thiếu.')
  }

  const evidence = [
    sameInstitution
      ? `Hai phiên bản có cùng institutionId: ${oldRule.institutionId}.`
      : 'institutionId giữa hai phiên bản khác nhau; không gán thay đổi cho cùng một trường.',
    sameProgramScope
      ? oldRule.programId === null
        ? 'Cả hai snapshot ở phạm vi cấp trường; không định danh một ngành cụ thể.'
        : `Hai phiên bản có cùng programId: ${newRule.programId}.`
      : 'programId giữa hai phiên bản khác nhau; không so sánh điều kiện giữa hai chương trình khác nhau.',
  ]

  return {
    oldVersionId: oldRule.id,
    newVersionId: newRule.id,
    changes,
    comparableScope,
    affectedUniversities,
    affectedMajors,
    affectedPrograms: affectedMajors,
    evidence,
    limitations,
    sources: [oldRule.source, newRule.source],
    dataStatus: effectiveStatus([oldRule.source.dataStatus, newRule.source.dataStatus]),
    tuitionStatus,
    tuition: { old: oldTuition, new: newTuition },
  }
}
