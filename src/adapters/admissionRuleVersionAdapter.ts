import type { AdmissionMethod, DataStatus } from '../types'
import type { AdmissionRuleVersion, RuleValue, TuitionSnapshot } from '../logic/ruleComparison'

export interface AdmissionRuleVersionPair {
  before: AdmissionRuleVersion
  after: AdmissionRuleVersion
}

export type RuleVersionPairResult =
  | { ok: true; value: AdmissionRuleVersionPair }
  | { ok: false; error: string }

export type RuleVersionsValidationResult =
  | { ok: true; value: AdmissionRuleVersion[] }
  | { ok: false; error: string }

const DATA_STATUSES: readonly DataStatus[] = ['verified', 'needs_review', 'simulated']
const ADMISSION_METHODS: readonly AdmissionMethod[] = [
  'high_school_exam',
  'academic_record',
  'competency_assessment',
  'direct_admission',
  'other',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isNonEmptyString(value)
}

function isNullableYear(value: unknown): value is number | null {
  return value === null || (
    typeof value === 'number'
    && Number.isInteger(value)
    && value >= 1900
    && value <= 2200
  )
}

function isHttpUrlOrNull(value: unknown): value is string | null {
  if (value === null) return true
  if (typeof value !== 'string' || value.trim().length === 0) return false
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function isNullableDateTime(value: unknown): value is string | null {
  if (value === null) return true
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/.test(value)) {
    return false
  }
  return Number.isFinite(Date.parse(value))
}

function isRuleValue(value: unknown, seen = new Set<object>()): value is RuleValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value !== 'object') return false
  if (seen.has(value)) return false
  seen.add(value)
  const valid = Array.isArray(value)
    ? value.every((item) => isRuleValue(item, seen))
    : isRecord(value) && Object.values(value).every((item) => isRuleValue(item, seen))
  seen.delete(value)
  return valid
}

function isTuitionSnapshot(value: unknown): value is TuitionSnapshot {
  if (!isRecord(value)) return false
  const min = value.minVndPerYear
  const max = value.maxVndPerYear
  const validAmount = (amount: unknown): amount is number | null =>
    amount === null || (typeof amount === 'number' && Number.isFinite(amount) && amount >= 0)

  if (!validAmount(min) || !validAmount(max)) return false
  if (min !== null && max !== null && min > max) return false
  return isNullableYear(value.appliedYear)
    && typeof value.dataStatus === 'string'
    && DATA_STATUSES.includes(value.dataStatus as DataStatus)
    && isHttpUrlOrNull(value.sourceUrl)
}

function isRuleVersion(value: unknown): value is AdmissionRuleVersion {
  if (!isRecord(value) || !isRecord(value.source) || !isRecord(value.conditions)) return false

  const source = value.source
  const admissionMethodValid = value.admissionMethod === null
    || (typeof value.admissionMethod === 'string'
      && ADMISSION_METHODS.includes(value.admissionMethod as AdmissionMethod))
  const tuitionValid = value.tuition === undefined
    || value.tuition === null
    || isTuitionSnapshot(value.tuition)

  return isNonEmptyString(value.id)
    && isNonEmptyString(value.institutionId)
    && isNonEmptyString(value.institutionName)
    && isNullableString(value.programId)
    && isNullableString(value.programName)
    && isNonEmptyString(source.name)
    && isHttpUrlOrNull(source.url)
    && isNullableYear(source.appliedYear)
    && isNonEmptyString(source.version)
    && isNullableDateTime(source.checkedAt)
    && typeof source.dataStatus === 'string'
    && DATA_STATUSES.includes(source.dataStatus as DataStatus)
    && admissionMethodValid
    && Object.values(value.conditions).every((condition) => isRuleValue(condition))
    && tuitionValid
}

/**
 * Runtime-validates an untrusted fixture/API collection before exposing typed snapshots.
 * The validator deliberately preserves nulls and does not synthesize provenance.
 */
export function validateAdmissionRuleVersions(raw: unknown): RuleVersionsValidationResult {
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'Danh sách phiên bản quy định phải là một mảng.' }
  }

  const versions: AdmissionRuleVersion[] = []
  const ids = new Set<string>()
  for (const [index, candidate] of raw.entries()) {
    if (!isRuleVersion(candidate)) {
      return {
        ok: false,
        error: `Snapshot tại vị trí ${index + 1} không đúng cấu trúc AdmissionRuleVersion.`,
      }
    }
    if (ids.has(candidate.id)) {
      return { ok: false, error: `ID snapshot bị trùng: ${candidate.id}.` }
    }
    ids.add(candidate.id)
    versions.push(candidate)
  }

  return { ok: true, value: versions }
}

/**
 * Accepts two independently identified snapshots. A current UniversityProgram
 * record is not historical evidence and cannot be duplicated into a pair.
 */
export function toAdmissionRuleVersionPair(
  before: unknown,
  after: unknown,
): RuleVersionPairResult {
  if (!isRuleVersion(before) || !isRuleVersion(after)) {
    return {
      ok: false,
      error: 'Cần cung cấp đầy đủ hai snapshot AdmissionRuleVersion hợp lệ.',
    }
  }
  if (before.id === after.id) {
    return {
      ok: false,
      error: 'Hai phiên bản phải có ID khác nhau.',
    }
  }
  return { ok: true, value: { before, after } }
}
