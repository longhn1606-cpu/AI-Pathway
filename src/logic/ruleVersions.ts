import rawBundledRules from '../data/admissionRules.json'
import { compareRules } from './compareRules'
import type { CompareOptions } from './compareRules'
import { explainRules } from './explainRules'
import type { ExplainOptions, RuleExplanation } from './explainRules'
import { ADMISSION_METHOD_VALUES, DATA_STATUS_VALUES } from './ruleTypes'
import type {
  AdmissionMethod,
  AdmissionRuleVersion,
  DataStatus,
  RuleComparison,
  RuleConditions,
  RuleSource,
  RuleValue,
} from './ruleTypes'

// ---------------------------------------------------------------------------
// Kiểm tra dữ liệu đầu vào (JSON → AdmissionRuleVersion). Không ép kiểu ngầm, không "sửa" giá trị.
// ---------------------------------------------------------------------------

export interface ParseResult {
  versions: AdmissionRuleVersion[]
  errors: string[]
}

type UnknownRecord = Record<string, unknown>

const MAX_DEPTH = 20

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRuleValue(value: unknown, depth = 0): value is RuleValue {
  if (depth > MAX_DEPTH) return false
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (Array.isArray(value)) return value.every((item) => isRuleValue(item, depth + 1))
  if (isRecord(value)) return Object.values(value).every((item) => isRuleValue(item, depth + 1))
  return false
}

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim() !== ''
const isNullableString = (value: unknown): value is string | null => value === null || typeof value === 'string'
const isNullableNumber = (value: unknown): boolean => value === null || (typeof value === 'number' && Number.isFinite(value))
const isNullableBoolean = (value: unknown): boolean => value === null || typeof value === 'boolean'

/** Kiểm tra riêng cho các khóa điều kiện đã biết (khóa lạ chỉ cần là giá trị JSON hợp lệ). */
const KNOWN_CONDITION_CHECKS: Readonly<Record<string, { check: (value: unknown) => boolean; expected: string }>> = {
  minimumScore: { check: isNullableNumber, expected: 'số hoặc null' },
  scoreScale: {
    check: (value) => value === null || (typeof value === 'number' && Number.isFinite(value) && value > 0),
    expected: 'số dương hoặc null',
  },
  subjectCombination: {
    check: (value) => Array.isArray(value) && value.every((item) => typeof item === 'string'),
    expected: 'mảng chuỗi',
  },
  interviewRequired: { check: isNullableBoolean, expected: 'true/false hoặc null' },
  foreignLanguageCertificateRequired: { check: isNullableBoolean, expected: 'true/false hoặc null' },
  notes: { check: isNullableString, expected: 'chuỗi hoặc null' },
}

function parseSource(raw: unknown, where: string, errors: string[]): RuleSource | null {
  if (!isRecord(raw)) {
    errors.push(`${where}: thiếu hoặc sai kiểu "source" (cần object).`)
    return null
  }
  const before = errors.length
  const requireKey = (key: string) => {
    if (!(key in raw)) errors.push(`${where}.source: thiếu khóa "${key}" (dùng null nếu không có dữ liệu).`)
  }
  ;['name', 'url', 'appliedYear', 'version', 'checkedAt', 'dataStatus'].forEach(requireKey)

  if ('name' in raw && !isNonEmptyString(raw.name)) errors.push(`${where}.source.name: cần chuỗi không rỗng.`)
  if ('url' in raw && !(raw.url === null || isNonEmptyString(raw.url))) errors.push(`${where}.source.url: cần chuỗi không rỗng hoặc null.`)
  if ('appliedYear' in raw && !(raw.appliedYear === null || Number.isInteger(raw.appliedYear))) {
    errors.push(`${where}.source.appliedYear: cần số nguyên hoặc null.`)
  }
  if ('version' in raw && !isNonEmptyString(raw.version)) errors.push(`${where}.source.version: cần chuỗi không rỗng.`)
  if ('checkedAt' in raw && !(raw.checkedAt === null || isNonEmptyString(raw.checkedAt))) {
    errors.push(`${where}.source.checkedAt: cần chuỗi không rỗng hoặc null.`)
  }
  if ('dataStatus' in raw && !DATA_STATUS_VALUES.includes(raw.dataStatus as DataStatus)) {
    errors.push(`${where}.source.dataStatus: "${String(raw.dataStatus)}" không thuộc [${DATA_STATUS_VALUES.join(', ')}].`)
  }
  if (errors.length > before) return null
  return {
    name: raw.name as string,
    url: raw.url as string | null,
    appliedYear: raw.appliedYear as number | null,
    version: raw.version as string,
    checkedAt: raw.checkedAt as string | null,
    dataStatus: raw.dataStatus as DataStatus,
  }
}

function parseConditions(raw: unknown, where: string, errors: string[]): RuleConditions | null {
  if (!isRecord(raw)) {
    errors.push(`${where}: thiếu hoặc sai kiểu "conditions" (cần object).`)
    return null
  }
  const before = errors.length
  for (const [key, value] of Object.entries(raw)) {
    if (!isRuleValue(value)) {
      errors.push(`${where}.conditions.${key}: giá trị không phải JSON hợp lệ (không chấp nhận undefined, NaN, Infinity).`)
      continue
    }
    const known = Object.hasOwn(KNOWN_CONDITION_CHECKS, key) ? KNOWN_CONDITION_CHECKS[key] : undefined
    if (known && !known.check(value)) errors.push(`${where}.conditions.${key}: cần ${known.expected}.`)
  }
  return errors.length > before ? null : (raw as RuleConditions)
}

function parseVersion(raw: unknown, index: number, errors: string[]): AdmissionRuleVersion | null {
  const label = isRecord(raw) && isNonEmptyString(raw.id) ? `versions[${index}] ("${raw.id}")` : `versions[${index}]`
  if (!isRecord(raw)) {
    errors.push(`${label}: cần object.`)
    return null
  }
  const before = errors.length
  if (!isNonEmptyString(raw.id)) errors.push(`${label}: "id" cần chuỗi không rỗng.`)
  if (!isNonEmptyString(raw.institutionId)) errors.push(`${label}: "institutionId" cần chuỗi không rỗng.`)
  if (!isNonEmptyString(raw.institutionName)) errors.push(`${label}: "institutionName" cần chuỗi không rỗng.`)
  for (const key of ['programId', 'programName'] as const) {
    if (!(key in raw)) errors.push(`${label}: thiếu khóa "${key}" (dùng null nếu không có).`)
    else if (!(raw[key] === null || isNonEmptyString(raw[key]))) errors.push(`${label}: "${key}" cần chuỗi không rỗng hoặc null.`)
  }
  if (!('admissionMethod' in raw)) {
    errors.push(`${label}: thiếu khóa "admissionMethod" (dùng null nếu không có).`)
  } else if (raw.admissionMethod !== null && !ADMISSION_METHOD_VALUES.includes(raw.admissionMethod as AdmissionMethod)) {
    errors.push(`${label}: admissionMethod "${String(raw.admissionMethod)}" không thuộc [${ADMISSION_METHOD_VALUES.join(', ')}].`)
  }
  const source = parseSource(raw.source, label, errors)
  const conditions = parseConditions(raw.conditions, label, errors)
  if (errors.length > before || source === null || conditions === null) return null

  return {
    id: raw.id as string,
    institutionId: raw.institutionId as string,
    institutionName: raw.institutionName as string,
    programId: raw.programId as string | null,
    programName: raw.programName as string | null,
    source,
    admissionMethod: raw.admissionMethod as AdmissionMethod | null,
    conditions,
  }
}

/**
 * Chấp nhận mảng phiên bản hoặc object `{ versions: [...] }`.
 * Phiên bản sai bị loại và báo lỗi; trạng thái `dataStatus` được giữ nguyên, không tự nâng cấp.
 */
export function parseRuleVersions(raw: unknown): ParseResult {
  const errors: string[] = []
  const list = Array.isArray(raw) ? raw : isRecord(raw) && Array.isArray(raw.versions) ? raw.versions : null
  if (list === null) {
    return { versions: [], errors: ['Dữ liệu gốc cần là mảng phiên bản hoặc object có khóa "versions" là mảng.'] }
  }
  const versions: AdmissionRuleVersion[] = []
  const seen = new Set<string>()
  list.forEach((item, index) => {
    const version = parseVersion(item, index, errors)
    if (version === null) return
    if (seen.has(version.id)) {
      errors.push(`versions[${index}] ("${version.id}"): id bị trùng; bỏ phiên bản này.`)
      return
    }
    seen.add(version.id)
    versions.push(version)
  })
  return { versions, errors }
}

/** Nạp dữ liệu đi kèm module (kịch bản giả lập `src/data/admissionRules.json`). */
export function loadBundledRuleVersions(): ParseResult {
  return parseRuleVersions(rawBundledRules)
}

// ---------------------------------------------------------------------------
// Luồng đầu–cuối: chọn hai phiên bản → so sánh → giải thích
// ---------------------------------------------------------------------------

export type AnalyzeResult =
  | { ok: true; comparison: RuleComparison; explanation: RuleExplanation }
  | { ok: false; error: string }

export interface AnalyzeOptions extends ExplainOptions {
  compare?: CompareOptions
}

export async function analyzeRuleChange(
  versions: readonly AdmissionRuleVersion[],
  oldVersionId: string,
  newVersionId: string,
  options: AnalyzeOptions = {},
): Promise<AnalyzeResult> {
  const oldRule = versions.find((version) => version.id === oldVersionId)
  const newRule = versions.find((version) => version.id === newVersionId)
  if (!oldRule) return { ok: false, error: `Không tìm thấy phiên bản cũ có id "${oldVersionId}".` }
  if (!newRule) return { ok: false, error: `Không tìm thấy phiên bản mới có id "${newVersionId}".` }

  const comparison = compareRules(oldRule, newRule, options.compare)
  const explanation = await explainRules(comparison, { provider: options.provider, timeoutMs: options.timeoutMs })
  return { ok: true, comparison, explanation }
}
