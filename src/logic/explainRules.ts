import { describeSource, formatRuleValue } from './compareRules'
import { CHANGE_TYPE_LABEL_VI, NEEDS_REVIEW_BANNER, SIMULATED_BANNER, fieldLabel } from './ruleTypes'
import type { DataStatus, RuleChange, RuleComparison } from './ruleTypes'

// ---------------------------------------------------------------------------
// Kiểu kết quả
// ---------------------------------------------------------------------------

/** Ai tạo phần giải thích: template xác định hay AI. KHÔNG được ghi nhầm. */
export type ExplanationOrigin = 'template' | 'ai'

export type FallbackReason = 'not_configured' | 'provider_error' | 'timeout' | 'invalid_output'

export const FALLBACK_REASON_LABEL_VI: Record<FallbackReason, string> = {
  not_configured: 'AI chưa được cấu hình — dùng giải thích theo mẫu.',
  provider_error: 'Dịch vụ AI gặp lỗi — dùng giải thích theo mẫu.',
  timeout: 'Dịch vụ AI không phản hồi kịp — dùng giải thích theo mẫu.',
  invalid_output: 'Nội dung AI trả về không đạt kiểm tra căn cứ — dùng giải thích theo mẫu.',
}

export interface ChangeRow {
  field: string
  fieldLabel: string
  changeType: RuleChange['changeType']
  changeTypeLabel: string
  oldText: string
  newText: string
}

/** Bốn nội dung bắt buộc của phần giải thích. */
export interface ExplanationSections {
  /** 1. Điều gì thay đổi? */
  whatChanged: string[]
  /** 2. Đối tượng nào có thể bị ảnh hưởng và căn cứ là gì? */
  affected: string[]
  /** 3. Người dùng cần kiểm tra gì tiếp theo? */
  nextChecks: string[]
  /** 4. Phần nào chưa đủ dữ liệu để kết luận? */
  insufficientData: string[]
}

export interface RuleExplanation {
  generatedBy: ExplanationOrigin
  /** Khác null khi đáng lẽ dùng AI nhưng phải dùng template. Luôn null nếu generatedBy = 'ai'. */
  fallbackReason: FallbackReason | null
  /** Chi tiết kiểm tra căn cứ (chỉ khi fallbackReason = 'invalid_output'). Không chứa thông báo lỗi thô của nhà cung cấp. */
  fallbackDetail: string | null
  dataStatus: DataStatus
  banners: string[]
  sections: ExplanationSections
  changeRows: ChangeRow[]
  sourceLines: string[]
  /** Văn bản do AI tạo; chỉ có khi generatedBy = 'ai'. Các `sections` luôn được dựng từ dữ liệu có cấu trúc. */
  narrative: string | null
}

// ---------------------------------------------------------------------------
// Template (không cần API)
// ---------------------------------------------------------------------------

export function describeChange(change: RuleChange): string {
  const label = fieldLabel(change.field)
  const oldText = formatRuleValue(change.oldValue, change.field)
  const newText = formatRuleValue(change.newValue, change.field)
  switch (change.changeType) {
    case 'added':
      return `${CHANGE_TYPE_LABEL_VI.added} mới — ${label}: ${newText}`
    case 'removed':
      return `${CHANGE_TYPE_LABEL_VI.removed} — ${label} (giá trị trước đó: ${oldText})`
    case 'modified': {
      const delta = change.arrayDelta
      if (delta) {
        const parts: string[] = []
        if (delta.added.length > 0) parts.push(`thêm ${formatRuleValue(delta.added)}`)
        if (delta.removed.length > 0) parts.push(`bỏ ${formatRuleValue(delta.removed)}`)
        if (parts.length === 0) parts.push('chỉ đổi thứ tự phần tử')
        return `${CHANGE_TYPE_LABEL_VI.modified} — ${label}: ${parts.join('; ')} (trước: ${oldText} → sau: ${newText})`
      }
      return `${CHANGE_TYPE_LABEL_VI.modified} — ${label}: ${oldText} → ${newText}`
    }
  }
}

function toChangeRow(change: RuleChange): ChangeRow {
  return {
    field: change.field,
    fieldLabel: fieldLabel(change.field),
    changeType: change.changeType,
    changeTypeLabel: CHANGE_TYPE_LABEL_VI[change.changeType],
    oldText: formatRuleValue(change.oldValue, change.field),
    newText: formatRuleValue(change.newValue, change.field),
  }
}

function bannersFor(status: DataStatus): string[] {
  if (status === 'simulated') return [SIMULATED_BANNER]
  if (status === 'needs_review') return [NEEDS_REVIEW_BANNER]
  return []
}

/**
 * Giải thích bằng template từ RuleComparison. Hàm thuần, chỉ dùng dữ liệu có trong `comparison`;
 * không thêm điểm chuẩn, học phí, quy định hay URL nào khác.
 */
export function explainRulesTemplate(comparison: RuleComparison): RuleExplanation {
  const { changes } = comparison

  const whatChanged =
    changes.length === 0
      ? ['Không phát hiện khác biệt nào giữa hai phiên bản ở phương thức tuyển sinh và các điều kiện được so sánh.']
      : [
          `Phát hiện ${changes.length} thay đổi giữa phiên bản cũ [${comparison.oldVersionId}] và phiên bản mới [${comparison.newVersionId}]:`,
          ...changes.map(describeChange),
        ]

  let affected: string[]
  if (comparison.affectedStatus === 'determined') {
    affected = [
      ...comparison.affectedTargets.map(
        (target) =>
          `${target.institutionName} (${target.institutionId}) — ` +
          `${target.programName ?? 'chưa có tên chương trình'} (${target.programId}). Căn cứ: ${target.basis}`,
      ),
      'Chỉ áp dụng cho chương trình nêu trên; không suy ra cho chương trình khác hoặc toàn trường.',
    ]
  } else if (comparison.affectedStatus === 'undetermined') {
    affected = [`Chưa xác định được đối tượng bị ảnh hưởng. Lý do: ${comparison.affectedReason}`]
  } else {
    affected = [comparison.affectedReason]
  }

  const nextChecks: string[] = []
  const sources = [
    { label: 'phiên bản cũ', source: comparison.oldSource },
    { label: 'phiên bản mới', source: comparison.newSource },
  ]
  for (const { label, source } of sources) {
    if (source.url !== null) {
      nextChecks.push(`Mở URL nguồn của ${label} và đối chiếu từng thay đổi: ${source.url}`)
    } else if (source.dataStatus !== 'simulated') {
      nextChecks.push(`Chưa có URL nguồn cho ${label}: tìm văn bản chính thức tương ứng để đối chiếu.`)
    }
  }
  if (comparison.overallDataStatus === 'simulated') {
    nextChecks.push(
      'Thay dữ liệu giả lập bằng hai văn bản tuyển sinh chính thức (kèm URL, năm áp dụng, ngày kiểm tra) trước khi dùng cho học sinh.',
    )
  }
  if (comparison.overallDataStatus === 'needs_review') {
    nextChecks.push('Đề nghị người duyệt dữ liệu xác minh hai phiên bản trước khi dùng làm căn cứ.')
  }
  if (changes.length > 0) {
    nextChecks.push(`Đối chiếu với văn bản gốc các trường đã thay đổi: ${changes.map((c) => c.field).join(', ')}.`)
  }
  if (comparison.affectedStatus === 'undetermined') {
    nextChecks.push('Xác định đúng trường và chương trình mà quy định áp dụng (institutionId, programId) trước khi kết luận tác động.')
  }
  nextChecks.push(
    'Xác nhận lại với thông báo tuyển sinh chính thức của trường trước khi ra quyết định; kết quả này không thay thế xác nhận từ trường.',
  )

  const bannerSet = new Set<string>([SIMULATED_BANNER, NEEDS_REVIEW_BANNER])
  const insufficientData = comparison.limitations.filter((item) => !bannerSet.has(item))

  return {
    generatedBy: 'template',
    fallbackReason: null,
    fallbackDetail: null,
    dataStatus: comparison.overallDataStatus,
    banners: bannersFor(comparison.overallDataStatus),
    sections: { whatChanged, affected, nextChecks, insufficientData },
    changeRows: changes.map(toChangeRow),
    sourceLines: [
      describeSource('Phiên bản cũ', comparison.oldVersionId, comparison.oldSource),
      describeSource('Phiên bản mới', comparison.newVersionId, comparison.newSource),
    ],
    narrative: null,
  }
}

// ---------------------------------------------------------------------------
// AI (tùy chọn) — qua interface, API key KHÔNG nằm trong frontend
// ---------------------------------------------------------------------------

export const AI_SYSTEM_INSTRUCTIONS = [
  'Bạn diễn giải kết quả so sánh hai phiên bản quy định tuyển sinh cho học sinh và phụ huynh, bằng tiếng Việt.',
  'Chỉ dùng thông tin có trong `comparison`. Không thêm điểm chuẩn, học phí, chỉ tiêu, điều kiện, quy định hoặc URL nào khác.',
  'Nêu rõ: điều gì thay đổi; đối tượng nào có thể bị ảnh hưởng và căn cứ; cần kiểm tra gì tiếp; phần nào chưa đủ dữ liệu.',
  'Nếu dữ liệu là giả lập (simulated) phải nói rõ đây là giả lập; nếu cần kiểm tra thêm (needs_review) phải nói rõ chưa được xác minh.',
  'Không khẳng định học sinh chắc chắn đủ điều kiện hoặc chắc chắn trúng tuyển. Không coi null là 0. Không tự quy đổi điểm giữa các thang hoặc phương thức.',
  'Trả về văn bản thuần, ngắn gọn.',
].join('\n')

export interface ExplanationRequest {
  systemInstructions: string
  comparison: RuleComparison
  templateExplanation: RuleExplanation
}

/**
 * Nhà cung cấp AI. Bản triển khai thật phải gọi qua backend/proxy giữ API key;
 * module này KHÔNG chứa khóa và KHÔNG tự gọi mạng.
 */
export interface ExplanationProvider {
  readonly name: string
  generate(request: ExplanationRequest, signal: AbortSignal): Promise<string>
}

export interface ExplainOptions {
  provider?: ExplanationProvider
  /** Mặc định 8000 ms. */
  timeoutMs?: number
}

export interface NarrativeCheck {
  valid: boolean
  reasons: string[]
}

const MAX_NARRATIVE_LENGTH = 4000
const NUMBER_PATTERN = /\d+(?:[.,]\d+)?/g
const URL_PATTERN = /https?:\/\/[^\s)>\]"']+/g
const LIST_MARKER_PATTERN = /^\s*(?:[-*•]|\d+[.)])\s+/gm

const FORBIDDEN_CLAIMS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /chắc chắn\s+(?:đỗ|trúng tuyển|đủ điều kiện|được nhận|đậu)/i, reason: 'khẳng định chắc chắn đỗ/đủ điều kiện' },
  { pattern: /(?:đảm bảo|cam kết|bảo đảm)\s+(?:đỗ|trúng tuyển|đủ điều kiện|đậu)/i, reason: 'cam kết kết quả tuyển sinh' },
  { pattern: /\b100\s*%/, reason: 'nêu xác suất 100%' },
]

function numbersIn(text: string): string[] {
  return text.replace(LIST_MARKER_PATTERN, '').match(NUMBER_PATTERN) ?? []
}

/**
 * Kiểm tra văn bản AI trước khi hiển thị: không có số/URL ngoài đầu vào, không cam kết kết quả,
 * có nhãn giả lập/cần kiểm tra khi dữ liệu thuộc loại đó.
 */
export function validateAiNarrative(text: unknown, comparison: RuleComparison): NarrativeCheck {
  if (typeof text !== 'string' || text.trim() === '') {
    return { valid: false, reasons: ['nội dung rỗng hoặc không phải chuỗi'] }
  }
  const reasons: string[] = []
  if (text.length > MAX_NARRATIVE_LENGTH) reasons.push('nội dung quá dài')

  const corpus = `${JSON.stringify(comparison)} ${comparison.changes.length}`
  const allowedNumbers = new Set(numbersIn(corpus))
  const foreignNumbers = [...new Set(numbersIn(text))].filter((token) => !allowedNumbers.has(token))
  if (foreignNumbers.length > 0) reasons.push(`có số không thuộc dữ liệu đầu vào: ${foreignNumbers.join(', ')}`)

  const foreignUrls = [...new Set(text.match(URL_PATTERN) ?? [])]
    .map((url) => url.replace(/[.,;:]+$/, ''))
    .filter((url) => !corpus.includes(url))
  if (foreignUrls.length > 0) reasons.push(`có URL không thuộc dữ liệu đầu vào: ${foreignUrls.join(', ')}`)

  for (const { pattern, reason } of FORBIDDEN_CLAIMS) {
    if (pattern.test(text)) reasons.push(reason)
  }
  if (comparison.overallDataStatus === 'simulated' && !/giả lập/i.test(text)) {
    reasons.push('thiếu nhãn "giả lập" dù dữ liệu là simulated')
  }
  if (comparison.overallDataStatus === 'needs_review' && !/kiểm tra|xác minh/i.test(text)) {
    reasons.push('thiếu lưu ý cần kiểm tra/xác minh dù dữ liệu là needs_review')
  }
  return { valid: reasons.length === 0, reasons }
}

class ExplanationTimeoutError extends Error {}

const DEFAULT_TIMEOUT_MS = 8000

/**
 * Điểm vào chính. Luôn trả về giải thích:
 * - Không có provider → template, fallbackReason = 'not_configured'.
 * - Provider lỗi / quá hạn / trả nội dung không đạt kiểm tra → template, kèm fallbackReason.
 * - Provider đạt kiểm tra → generatedBy = 'ai'; `sections` vẫn dựng từ dữ liệu có cấu trúc.
 * Không bao giờ ghi generatedBy = 'ai' khi nội dung đến từ template.
 */
export async function explainRules(
  comparison: RuleComparison,
  options: ExplainOptions = {},
): Promise<RuleExplanation> {
  const template = explainRulesTemplate(comparison)
  const { provider } = options
  if (!provider) return { ...template, fallbackReason: 'not_configured' }

  const controller = new AbortController()
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const text = await Promise.race([
      provider.generate(
        {
          systemInstructions: AI_SYSTEM_INSTRUCTIONS,
          comparison: structuredClone(comparison),
          templateExplanation: structuredClone(template),
        },
        controller.signal,
      ),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort()
          reject(new ExplanationTimeoutError())
        }, timeoutMs)
      }),
    ])
    const check = validateAiNarrative(text, comparison)
    if (!check.valid) {
      return { ...template, fallbackReason: 'invalid_output', fallbackDetail: check.reasons.join('; ') }
    }
    return { ...template, generatedBy: 'ai', fallbackReason: null, narrative: (text as string).trim() }
  } catch (error) {
    return {
      ...template,
      fallbackReason: error instanceof ExplanationTimeoutError ? 'timeout' : 'provider_error',
    }
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}
