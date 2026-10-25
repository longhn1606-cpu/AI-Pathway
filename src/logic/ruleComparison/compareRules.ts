import type { DataStatus } from '../../types'
import type {
  AdmissionRuleVersion,
  RuleChange,
  RuleComparison,
  RuleValue,
} from './types'

export interface CompareRulesOptions {
  /** Paths whose arrays represent sets, so element order is not meaningful. */
  unorderedArrayPaths?: string[]
}

function isPlainObject(value: RuleValue | undefined): value is { [key: string]: RuleValue } {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function stableValue(value: RuleValue): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableValue(value[key])}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value) ?? String(value)
}

function valuesEqual(
  left: RuleValue | undefined,
  right: RuleValue | undefined,
  path: string,
  unorderedArrayPaths: Set<string>,
): boolean {
  if (left === right) return true
  if (left === undefined || right === undefined) return false
  if (Array.isArray(left) && Array.isArray(right)) {
    if (unorderedArrayPaths.has(path)) {
      const leftValues = left.map(stableValue).sort()
      const rightValues = right.map(stableValue).sort()
      return leftValues.length === rightValues.length
        && leftValues.every((value, index) => value === rightValues[index])
    }
    return left.length === right.length
      && left.every((value, index) => valuesEqual(value, right[index], `${path}[${index}]`, unorderedArrayPaths))
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)])
    return [...keys].every((key) =>
      valuesEqual(left[key], right[key], path ? `${path}.${key}` : key, unorderedArrayPaths),
    )
  }
  return left === right
}

function collectConditionChanges(
  oldValue: RuleValue | undefined,
  newValue: RuleValue | undefined,
  path: string,
  changes: RuleChange[],
  unorderedArrayPaths: Set<string>,
): void {
  if (valuesEqual(oldValue, newValue, path, unorderedArrayPaths)) return
  if (oldValue === undefined) {
    changes.push({ field: path, changeType: 'added', oldValue, newValue })
    return
  }
  if (newValue === undefined) {
    changes.push({ field: path, changeType: 'removed', oldValue, newValue })
    return
  }
  if (isPlainObject(oldValue) && isPlainObject(newValue)) {
    const keys = [...new Set([...Object.keys(oldValue), ...Object.keys(newValue)])].sort()
    for (const key of keys) {
      collectConditionChanges(oldValue[key], newValue[key], path ? `${path}.${key}` : key, changes, unorderedArrayPaths)
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

function compareScalar(
  changes: RuleChange[],
  field: string,
  oldValue: string | number | boolean | null | undefined,
  newValue: string | number | boolean | null | undefined,
): void {
  if (oldValue === newValue) return
  const changeType = oldValue === undefined ? 'added' : newValue === undefined ? 'removed' : 'modified'
  changes.push({ field, changeType, oldValue, newValue })
}

/** Compare rule content, identity, source metadata and any explicitly supplied tuition snapshot. */
export function compareRules(
  oldRule: AdmissionRuleVersion,
  newRule: AdmissionRuleVersion,
  options: CompareRulesOptions = {},
): RuleComparison {
  const changes: RuleChange[] = []
  const unorderedArrayPaths = new Set(options.unorderedArrayPaths ?? [])

  const scalarFields: Array<[string, string | number | boolean | null | undefined, string | number | boolean | null | undefined]> = [
    ['institutionId', oldRule.institutionId, newRule.institutionId],
    ['institutionName', oldRule.institutionName, newRule.institutionName],
    ['programId', oldRule.programId, newRule.programId],
    ['programName', oldRule.programName, newRule.programName],
    ['admissionMethod', oldRule.admissionMethod, newRule.admissionMethod],
    ['source.name', oldRule.source.name, newRule.source.name],
    ['source.url', oldRule.source.url, newRule.source.url],
    ['source.appliedYear', oldRule.source.appliedYear, newRule.source.appliedYear],
    ['source.version', oldRule.source.version, newRule.source.version],
    ['source.checkedAt', oldRule.source.checkedAt, newRule.source.checkedAt],
    ['source.dataStatus', oldRule.source.dataStatus, newRule.source.dataStatus],
  ]
  for (const [field, oldValue, newValue] of scalarFields) compareScalar(changes, field, oldValue, newValue)

  const conditionKeys = [...new Set([...Object.keys(oldRule.conditions), ...Object.keys(newRule.conditions)])].sort()
  for (const key of conditionKeys) {
    collectConditionChanges(oldRule.conditions[key], newRule.conditions[key], `conditions.${key}`, changes, unorderedArrayPaths)
  }

  const oldTuition = oldRule.tuition ?? null
  const newTuition = newRule.tuition ?? null
  const tuitionFields = ['minVndPerYear', 'maxVndPerYear', 'appliedYear', 'dataStatus', 'sourceUrl'] as const
  if (oldTuition === null && newTuition !== null) {
    changes.push({ field: 'tuition', changeType: 'added', oldValue: null, newValue: 'provided' })
  } else if (oldTuition !== null && newTuition === null) {
    changes.push({ field: 'tuition', changeType: 'removed', oldValue: 'provided', newValue: null })
  } else if (oldTuition && newTuition) {
    for (const field of tuitionFields) {
      compareScalar(changes, `tuition.${field}`, oldTuition[field], newTuition[field])
    }
  }

  const sameInstitution = oldRule.institutionId === newRule.institutionId
  const sameProgram = oldRule.programId !== null && oldRule.programId === newRule.programId
  const affectedPrograms = sameInstitution && sameProgram ? [newRule.programId as string] : []

  const evidence: string[] = [
    sameInstitution
      ? `Hai phiên bản có cùng institutionId: ${oldRule.institutionId}.`
      : 'institutionId giữa hai phiên bản khác nhau; không gán thay đổi cho cùng một trường.',
    sameProgram
      ? `Hai phiên bản có cùng programId: ${newRule.programId}.`
      : 'Không có programId trùng khớp để xác nhận một chương trình cụ thể bị ảnh hưởng.',
  ]

  const limitations: string[] = []
  if (oldRule.source.dataStatus !== 'verified' || newRule.source.dataStatus !== 'verified') {
    limitations.push('Ít nhất một phiên bản chưa ở trạng thái verified; kết quả chỉ phản ánh dữ liệu đầu vào.')
  }
  if (!oldRule.source.url || !newRule.source.url) {
    limitations.push('Thiếu URL nguồn ở ít nhất một phiên bản; cần bổ sung hoặc kiểm tra tài liệu gốc.')
  }
  if (oldRule.source.appliedYear === null || newRule.source.appliedYear === null) {
    limitations.push('Thiếu năm áp dụng ở ít nhất một phiên bản; không thể xác nhận phạm vi thời gian.')
  }
  if (!sameInstitution) limitations.push('Hai phiên bản thuộc institutionId khác nhau; không thể diễn giải đây là thay đổi theo thời gian của cùng một trường.')
  if (!sameProgram) limitations.push('Chưa đủ căn cứ định danh programId để kết luận chương trình cụ thể chịu tác động.')
  if (changes.length === 0) limitations.push('Không phát hiện khác biệt trong các trường được module so sánh; điều này không chứng minh toàn bộ văn bản quy định giống nhau.')

  const tuitionStatuses = [oldTuition?.dataStatus, newTuition?.dataStatus].filter((status): status is DataStatus => status !== undefined)
  const tuitionStatus = tuitionStatuses.length ? effectiveStatus(tuitionStatuses) : null
  if (!oldTuition || !newTuition) {
    limitations.push('Thiếu snapshot học phí ở ít nhất một phiên bản; không thể kết luận học phí không thay đổi.')
  } else if (
    oldTuition.minVndPerYear === null || oldTuition.maxVndPerYear === null
    || newTuition.minVndPerYear === null || newTuition.maxVndPerYear === null
  ) {
    limitations.push('Học phí có trường chưa có dữ liệu; không ước tính hoặc tự điền giá trị còn thiếu.')
  }

  return {
    oldVersionId: oldRule.id,
    newVersionId: newRule.id,
    changes,
    affectedPrograms,
    evidence,
    limitations,
    sources: [oldRule.source, newRule.source],
    dataStatus: effectiveStatus([oldRule.source.dataStatus, newRule.source.dataStatus]),
    tuitionStatus,
  }
}
