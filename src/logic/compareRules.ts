import {
  ADMISSION_METHOD_LABEL_VI,
  DATA_STATUS_LABEL_VI,
  DATA_STATUS_RANK,
  NEEDS_REVIEW_BANNER,
  SIMULATED_BANNER,
  fieldLabel,
} from './ruleTypes'
import type {
  AdmissionRuleVersion,
  AffectedStatus,
  AffectedTarget,
  ArrayDelta,
  DataStatus,
  RuleChange,
  RuleChangeType,
  RuleComparison,
  RuleObject,
  RuleSource,
  RuleValue,
} from './ruleTypes'

export interface CompareOptions {
  /**
   * Đường dẫn các trường mảng mà THỨ TỰ có ý nghĩa (ví dụ thứ tự ưu tiên).
   * Mặc định mọi mảng được so như tập hợp: đổi thứ tự KHÔNG phải là thay đổi.
   */
  orderSensitiveFields?: readonly string[]
}

// ---------------------------------------------------------------------------
// Tiện ích giá trị
// ---------------------------------------------------------------------------

function isPlainObject(value: RuleValue | undefined): value is RuleObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Chuỗi chuẩn hóa để so sánh sâu: khóa object được sắp xếp, `undefined` bị bỏ qua, có phân biệt kiểu. */
function canonical(value: RuleValue | undefined): string {
  if (value === undefined) return 'undefined'
  if (value === null) return 'null'
  if (typeof value === 'number') return Object.is(value, -0) ? '0' : String(value)
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  const keys = Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
}

function cloneValue<T extends RuleValue | undefined>(value: T): T {
  return structuredClone(value)
}

/** So hai mảng như hai tập hợp (bỏ trùng, không phụ thuộc thứ tự). */
function setDelta(oldArr: readonly RuleValue[], newArr: readonly RuleValue[]): ArrayDelta {
  const toMap = (arr: readonly RuleValue[]) => {
    const map = new Map<string, RuleValue>()
    for (const item of arr) map.set(canonical(item), item)
    return map
  }
  const oldMap = toMap(oldArr)
  const newMap = toMap(newArr)
  const added: RuleValue[] = []
  const removed: RuleValue[] = []
  for (const [key, value] of newMap) if (!oldMap.has(key)) added.push(cloneValue(value))
  for (const [key, value] of oldMap) if (!newMap.has(key)) removed.push(cloneValue(value))
  return { added, removed }
}

/** Định dạng giá trị để hiển thị. `null` luôn hiển thị là "chưa có dữ liệu", không bao giờ là 0. */
export function formatRuleValue(value: RuleValue | undefined, field?: string): string {
  if (value === undefined) return 'không có trường này'
  if (value === null) return 'chưa có dữ liệu (null)'
  if (typeof value === 'string') {
    if (field === 'admissionMethod' && Object.hasOwn(ADMISSION_METHOD_LABEL_VI, value)) {
      const label = ADMISSION_METHOD_LABEL_VI[value as keyof typeof ADMISSION_METHOD_LABEL_VI]
      return `${label} (${value})`
    }
    return value === '' ? '"" (chuỗi rỗng)' : value
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    return value.length === 0 ? '[] (danh sách rỗng)' : `[${value.map((item) => formatRuleValue(item)).join(', ')}]`
  }
  return JSON.stringify(value)
}

export function describeSource(label: string, versionId: string, source: RuleSource): string {
  const orNone = (value: string | number | null) => (value === null ? 'không có' : String(value))
  return (
    `${label} [${versionId}] — nguồn: "${source.name}"; URL: ${orNone(source.url)}; ` +
    `năm áp dụng: ${orNone(source.appliedYear)}; phiên bản: ${source.version}; ` +
    `ngày kiểm tra: ${orNone(source.checkedAt)}; ` +
    `trạng thái: ${DATA_STATUS_LABEL_VI[source.dataStatus]} (${source.dataStatus})`
  )
}

// ---------------------------------------------------------------------------
// Diff có cấu trúc
// ---------------------------------------------------------------------------

interface DiffContext {
  changes: RuleChange[]
  orderSensitive: ReadonlySet<string>
}

function pushChange(
  ctx: DiffContext,
  field: string,
  changeType: RuleChangeType,
  oldValue: RuleValue | undefined,
  newValue: RuleValue | undefined,
  arrayDelta?: ArrayDelta,
): void {
  const change: RuleChange = {
    field,
    changeType,
    oldValue: cloneValue(oldValue),
    newValue: cloneValue(newValue),
  }
  if (arrayDelta) change.arrayDelta = arrayDelta
  ctx.changes.push(change)
}

function diffObjects(oldObj: RuleObject, newObj: RuleObject, basePath: string, ctx: DiffContext): void {
  // Thứ tự khóa: khóa của bản cũ trước, khóa chỉ có ở bản mới sau => kết quả ổn định.
  const keys = new Set<string>([...Object.keys(oldObj), ...Object.keys(newObj)])
  for (const key of keys) {
    const path = basePath === '' ? key : `${basePath}.${key}`
    const oldValue = oldObj[key]
    const newValue = newObj[key]
    if (oldValue === undefined && newValue === undefined) continue // cùng vắng mặt
    if (oldValue === undefined) {
      pushChange(ctx, path, 'added', undefined, newValue)
    } else if (newValue === undefined) {
      pushChange(ctx, path, 'removed', oldValue, undefined)
    } else {
      diffValue(path, oldValue, newValue, ctx)
    }
  }
}

function diffValue(path: string, oldValue: RuleValue, newValue: RuleValue, ctx: DiffContext): void {
  if (isPlainObject(oldValue) && isPlainObject(newValue)) {
    diffObjects(oldValue, newValue, path, ctx)
    return
  }
  if (Array.isArray(oldValue) && Array.isArray(newValue)) {
    const delta = setDelta(oldValue, newValue)
    const sameAsSet = delta.added.length === 0 && delta.removed.length === 0
    const changed = ctx.orderSensitive.has(path) ? canonical(oldValue) !== canonical(newValue) : !sameAsSet
    if (changed) pushChange(ctx, path, 'modified', oldValue, newValue, delta)
    return
  }
  // Gồm cả trường hợp khác kiểu (object ↔ giá trị thường, null ↔ số, ...).
  if (canonical(oldValue) !== canonical(newValue)) pushChange(ctx, path, 'modified', oldValue, newValue)
}

// ---------------------------------------------------------------------------
// Đối tượng liên quan — chỉ liên kết bằng mã định danh
// ---------------------------------------------------------------------------

interface AffectedResolution {
  status: AffectedStatus
  targets: AffectedTarget[]
  reason: string
}

function resolveAffected(
  oldRule: AdmissionRuleVersion,
  newRule: AdmissionRuleVersion,
  hasChanges: boolean,
): AffectedResolution {
  if (!hasChanges) {
    return {
      status: 'not_applicable',
      targets: [],
      reason: 'Không phát hiện thay đổi nên không có đối tượng bị ảnh hưởng.',
    }
  }
  if (oldRule.institutionId !== newRule.institutionId) {
    return {
      status: 'undetermined',
      targets: [],
      reason:
        `Hai phiên bản thuộc hai institutionId khác nhau ("${oldRule.institutionId}" và "${newRule.institutionId}"); ` +
        'không suy diễn thay đổi từ trường này sang trường khác.',
    }
  }
  if (oldRule.programId === null || newRule.programId === null) {
    const missing = [
      oldRule.programId === null ? 'phiên bản cũ' : null,
      newRule.programId === null ? 'phiên bản mới' : null,
    ]
      .filter((part): part is string => part !== null)
      .join(' và ')
    return {
      status: 'undetermined',
      targets: [],
      reason:
        `Thiếu programId ở ${missing}; chưa xác định được chương trình bị ảnh hưởng ` +
        'và không suy ra thay đổi áp dụng cho toàn trường.',
    }
  }
  if (oldRule.programId !== newRule.programId) {
    return {
      status: 'undetermined',
      targets: [],
      reason:
        `Hai phiên bản thuộc hai programId khác nhau ("${oldRule.programId}" và "${newRule.programId}"); ` +
        'không coi đây là thay đổi của cùng một chương trình.',
    }
  }
  return {
    status: 'determined',
    targets: [
      {
        institutionId: newRule.institutionId,
        institutionName: newRule.institutionName,
        programId: newRule.programId,
        programName: newRule.programName,
        basis:
          `Cùng institutionId "${newRule.institutionId}" và programId "${newRule.programId}" ở cả hai phiên bản ` +
          `(${oldRule.id}, ${newRule.id}); chỉ liên kết theo mã định danh, không theo tên gần giống.`,
      },
    ],
    reason: `Xác định theo mã định danh: chương trình "${newRule.programId}" của "${newRule.institutionId}".`,
  }
}

// ---------------------------------------------------------------------------
// Giới hạn / cảnh báo
// ---------------------------------------------------------------------------

function sourceLimitations(label: string, version: AdmissionRuleVersion): string[] {
  const { source } = version
  const out: string[] = []
  if (source.name.trim() === '') out.push(`${label}: thiếu tên nguồn.`)
  if (source.dataStatus === 'simulated') {
    if (source.url !== null) {
      out.push(`${label}: dữ liệu giả lập nhưng có URL; không dùng URL này làm căn cứ chính thức.`)
    }
    return out
  }
  if (source.url === null) {
    out.push(
      source.dataStatus === 'verified'
        ? `${label}: đánh dấu "verified" nhưng không có URL nguồn; cần người duyệt kiểm tra lại trạng thái.`
        : `${label}: không có URL nguồn.`,
    )
  }
  if (source.appliedYear === null) out.push(`${label}: thiếu năm áp dụng.`)
  if (source.dataStatus === 'verified' && source.checkedAt === null) {
    out.push(`${label}: đánh dấu "verified" nhưng không có ngày kiểm tra nguồn.`)
  }
  return out
}

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

function buildLimitations(
  oldRule: AdmissionRuleVersion,
  newRule: AdmissionRuleVersion,
  changes: readonly RuleChange[],
  affected: AffectedResolution,
  overall: DataStatus,
): string[] {
  const out: string[] = []

  if (overall === 'simulated') out.push(SIMULATED_BANNER)
  else if (overall === 'needs_review') out.push(NEEDS_REVIEW_BANNER)

  if (oldRule.id === newRule.id) {
    out.push(`Hai phiên bản có cùng id "${oldRule.id}"; không phải hai phiên bản khác nhau.`)
  }

  out.push(...sourceLimitations('Phiên bản cũ', oldRule), ...sourceLimitations('Phiên bản mới', newRule))

  // Thứ tự thời gian
  const oldYear = oldRule.source.appliedYear
  const newYear = newRule.source.appliedYear
  if (oldYear === null || newYear === null) {
    const missing = [oldYear === null ? 'phiên bản cũ' : null, newYear === null ? 'phiên bản mới' : null]
      .filter((part): part is string => part !== null)
      .join(' và ')
    out.push(`Thiếu năm áp dụng ở ${missing}; không xác định được thứ tự thời gian giữa hai phiên bản.`)
  } else if (newYear < oldYear) {
    out.push(
      `Phiên bản "mới" có năm áp dụng (${newYear}) sớm hơn phiên bản "cũ" (${oldYear}); cần kiểm tra lại thứ tự hai phiên bản.`,
    )
  } else if (newYear === oldYear) {
    out.push(
      `Hai phiên bản có cùng năm áp dụng (${newYear}); chưa đủ dữ liệu để kết luận đây là thay đổi giữa hai năm tuyển sinh.`,
    )
  }

  if (affected.status === 'undetermined') out.push(affected.reason)

  // Phương thức tuyển sinh
  if (oldRule.admissionMethod !== newRule.admissionMethod) {
    if (oldRule.admissionMethod !== null && newRule.admissionMethod !== null) {
      out.push(
        `Phương thức tuyển sinh khác nhau (${oldRule.admissionMethod} → ${newRule.admissionMethod}); ` +
          'không so sánh trực tiếp điểm hoặc điều kiện giữa các phương thức và không tự quy đổi điểm.',
      )
    } else {
      out.push('Phương thức tuyển sinh bị thiếu (null) ở ít nhất một phiên bản; không so sánh được giữa các phương thức.')
    }
  }

  // Thang điểm khi điểm tối thiểu thay đổi
  if (changes.some((change) => change.field === 'conditions.minimumScore')) {
    const oldScale = oldRule.conditions.scoreScale
    const newScale = newRule.conditions.scoreScale
    if (!isFiniteNumber(oldScale) || !isFiniteNumber(newScale)) {
      const missing = [!isFiniteNumber(oldScale) ? 'phiên bản cũ' : null, !isFiniteNumber(newScale) ? 'phiên bản mới' : null]
        .filter((part): part is string => part !== null)
        .join(' và ')
      out.push(
        `Điểm tối thiểu có thay đổi nhưng thiếu thang điểm (scoreScale) ở ${missing}; ` +
          'không kết luận mức tăng/giảm và không tự giả định thang điểm.',
      )
    } else if (oldScale !== newScale) {
      out.push(
        `Điểm tối thiểu thuộc hai thang điểm khác nhau (${oldScale} và ${newScale}); ` +
          'không so sánh trực tiếp và không tự quy đổi.',
      )
    }
  }

  // null = chưa có dữ liệu
  for (const change of changes) {
    if (change.oldValue === null || change.newValue === null) {
      const side = change.oldValue === null ? 'phiên bản cũ' : 'phiên bản mới'
      out.push(
        `${fieldLabel(change.field)}: giá trị ở ${side} là null (chưa có dữ liệu); ` +
          'không kết luận mức thay đổi và không coi null là 0.',
      )
    }
  }

  out.push(
    'Dữ liệu đầu vào không có ngày hiệu lực; không kết luận quy định mới đã hoặc đang có hiệu lực.',
    'Kết quả chỉ mô tả khác biệt giữa hai phiên bản; không phải kết luận học sinh đủ điều kiện hay trúng tuyển.',
  )
  return out
}

// ---------------------------------------------------------------------------
// API chính
// ---------------------------------------------------------------------------

function weakestStatus(a: DataStatus, b: DataStatus): DataStatus {
  return DATA_STATUS_RANK[a] <= DATA_STATUS_RANK[b] ? a : b
}

/**
 * So sánh hai phiên bản quy định. Hàm thuần: không sửa đầu vào, giá trị trả về là bản sao.
 * Quy ước: trường vắng mặt (hoặc `undefined`) ≠ `null`. Vắng→có = added, có→vắng = removed,
 * `null`→số = modified (null là "chưa có dữ liệu", không phải 0).
 */
export function compareRules(
  oldRule: AdmissionRuleVersion,
  newRule: AdmissionRuleVersion,
  options: CompareOptions = {},
): RuleComparison {
  const ctx: DiffContext = {
    changes: [],
    orderSensitive: new Set(options.orderSensitiveFields ?? []),
  }
  diffObjects(
    { admissionMethod: oldRule.admissionMethod, conditions: oldRule.conditions },
    { admissionMethod: newRule.admissionMethod, conditions: newRule.conditions },
    '',
    ctx,
  )

  const changes = ctx.changes
  const affected = resolveAffected(oldRule, newRule, changes.length > 0)
  const overallDataStatus = weakestStatus(oldRule.source.dataStatus, newRule.source.dataStatus)

  const evidence = [
    describeSource('Phiên bản cũ', oldRule.id, oldRule.source),
    describeSource('Phiên bản mới', newRule.id, newRule.source),
    ...changes.map(
      (change) =>
        `Khác biệt tại ${fieldLabel(change.field)} (${oldRule.id} → ${newRule.id}): ` +
        `${formatRuleValue(change.oldValue, change.field)} → ${formatRuleValue(change.newValue, change.field)}`,
    ),
  ]

  return {
    oldVersionId: oldRule.id,
    newVersionId: newRule.id,
    changes,
    affectedPrograms: affected.targets.map((target) => target.programId),
    affectedTargets: affected.targets,
    affectedStatus: affected.status,
    affectedReason: affected.reason,
    evidence,
    limitations: buildLimitations(oldRule, newRule, changes, affected, overallDataStatus),
    oldSource: structuredClone(oldRule.source),
    newSource: structuredClone(newRule.source),
    overallDataStatus,
  }
}
