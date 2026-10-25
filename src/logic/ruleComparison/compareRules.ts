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
      return left.length === right.length
        && [...left].map(stableValue).sort().every((value, index) => value === [...right].map(stableValue).sort()[index])
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
      collectConditionChanges(
        oldValue[key],
        newValue[key],
        path ? `${path}.${key}` : key,
        changes,
        unorderedArrayPaths,
      )
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

/**
 * Compares two rule snapshots without mutating either input.
 * Arrays are ordered by default; configure set-like paths as unordered.
 */
export function compareRules(
  oldRule: AdmissionRuleVersion,
  newRule: AdmissionRuleVersion,
  options: CompareRulesOptions = {},
): RuleComparison {
  const changes: RuleChange[] = []
  const unorderedArrayPaths = new Set(options.unorderedArrayPaths ?? [])

  if (oldRule.institutionId !== newRule.institutionId) {
    changes.push({
      field: 'institutionId',
      changeType: 'modified',
      oldValue: oldRule.institutionId,
      newValue: newRule.institutionId,
    })
  }
  if (oldRule.programId !== newRule.programId) {
    changes.push({
      field: 'programId',
      changeType: 'modified',
      oldValue: oldRule.programId,
      newValue: newRule.programId,
    })
  }
  if (oldRule.admissionMethod !== newRule.admissionMethod) {
    changes.push({
      field: 'admissionMethod',
      changeType: 'modified',
      oldValue: oldRule.admissionMethod,
      newValue: newRule.admissionMethod,
    })
  }

  const conditionKeys = [...new Set([
    ...Object.keys(oldRule.conditions),
    ...Object.keys(newRule.conditions),
  ])].sort()

  for (const key of conditionKeys) {
    collectConditionChanges(
      oldRule.conditions[key],
      newRule.conditions[key],
      `conditions.${key}`,
      changes,
      unorderedArrayPaths,
    )
  }

  const sameInstitution = oldRule.institutionId === newRule.institutionId
  const sameProgram = oldRule.programId !== null
    && oldRule.programId === newRule.programId
  const affectedPrograms = sameInstitution && sameProgram
    ? [newRule.programId as string]
    : []

  const evidence: string[] = []
  if (sameInstitution) {
    evidence.push(`Hai phiên bản có cùng institutionId: ${oldRule.institutionId}.`)
  } else {
    evidence.push('institutionId giữa hai phiên bản khác nhau; không gán thay đổi cho cùng một trường.')
  }
  if (sameProgram) {
    evidence.push(`Hai phiên bản có cùng programId: ${newRule.programId}.`)
  } else {
    evidence.push('Không có programId trùng khớp để xác nhận một chương trình cụ thể bị ảnh hưởng.')
  }

  const limitations: string[] = []
  if (oldRule.source.dataStatus !== 'verified' || newRule.source.dataStatus !== 'verified') {
    limitations.push('Ít nhất một phiên bản chưa ở trạng thái verified; kết quả chỉ phản ánh dữ liệu đầu vào.')
  }
  if (!oldRule.source.url || !newRule.source.url) {
    limitations.push('Thiếu URL nguồn ở ít nhất một phiên bản; cần bổ sung hoặc kiểm tra tài liệu gốc.')
  }
  if (oldRule.institutionId !== newRule.institutionId) {
    limitations.push('Hai phiên bản thuộc institutionId khác nhau; không thể diễn giải đây là thay đổi theo thời gian của cùng một trường.')
  }
  if (!sameProgram) {
    limitations.push('Chưa đủ căn cứ định danh programId để kết luận chương trình cụ thể chịu tác động.')
  }
  if (changes.length === 0) {
    limitations.push('Không phát hiện khác biệt trong các trường được module so sánh; điều này không chứng minh toàn bộ văn bản quy định giống nhau.')
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
  }
}
