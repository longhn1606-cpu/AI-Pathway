import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { compareRules } from '../../src/logic/compareRules'
import { explainRules, explainRulesTemplate, validateAiNarrative } from '../../src/logic/explainRules'
import type { ExplanationProvider, ExplanationRequest, RuleExplanation } from '../../src/logic/explainRules'
import { NEEDS_REVIEW_BANNER, SIMULATED_BANNER } from '../../src/logic/ruleTypes'
import type { RuleComparison, RuleConditions } from '../../src/logic/ruleTypes'
import { makeVersion, simulatedSource } from './fixtures'

// --- Dữ liệu dùng chung -----------------------------------------------------

const EXAMPLE_OLD: RuleConditions = { minimumScore: 24, scoreScale: 30, subjectCombination: ['A00'] }
const EXAMPLE_NEW: RuleConditions = { minimumScore: 25, scoreScale: 30, subjectCombination: ['A00', 'D01'] }

const simulatedComparison = (): RuleComparison =>
  compareRules(
    makeVersion({ id: 'sim-1', conditions: EXAMPLE_OLD, source: simulatedSource(2025) }),
    makeVersion({ id: 'sim-2', conditions: EXAMPLE_NEW, source: simulatedSource(2026) }),
  )

const verifiedComparison = (): RuleComparison =>
  compareRules(
    makeVersion({ id: 'v-1', conditions: EXAMPLE_OLD }),
    makeVersion({ id: 'v-2', conditions: EXAMPLE_NEW, source: { appliedYear: 2026, url: 'https://example.invalid/rules-2026' } }),
  )

const needsReviewComparison = (): RuleComparison =>
  compareRules(
    makeVersion({ id: 'nr-1', conditions: EXAMPLE_OLD, source: { dataStatus: 'needs_review' } }),
    makeVersion({ id: 'nr-2', conditions: EXAMPLE_NEW, source: { appliedYear: 2026 } }),
  )

const provider = (generate: ExplanationProvider['generate']): ExplanationProvider => ({ name: 'mock-ai', generate })

const GOOD_SIMULATED_TEXT =
  'Đây là tình huống giả lập. Điểm tối thiểu đổi từ 24 sang 25 và tổ hợp môn có thêm D01. ' +
  'Cần kiểm tra lại với văn bản chính thức trước khi dùng.'

/** Toàn bộ chữ người dùng nhìn thấy trong một bản giải thích. */
const visibleText = (e: RuleExplanation): string =>
  [
    ...e.banners,
    ...e.sections.whatChanged,
    ...e.sections.affected,
    ...e.sections.nextChecks,
    ...e.sections.insufficientData,
    ...e.sourceLines,
    ...e.changeRows.flatMap((row) => [row.fieldLabel, row.oldText, row.newText]),
  ].join('\n')

// --- Template ---------------------------------------------------------------

describe('explainRulesTemplate — bốn nội dung bắt buộc', () => {
  it('có đủ 4 phần không rỗng, nêu giá trị cũ → mới và phần tử tổ hợp môn thêm vào', () => {
    const e = explainRulesTemplate(simulatedComparison())
    for (const key of ['whatChanged', 'affected', 'nextChecks', 'insufficientData'] as const) {
      assert.ok(e.sections[key].length > 0, `${key} không được rỗng`)
    }
    const changed = e.sections.whatChanged.join('\n')
    assert.match(changed, /24 → 25/)
    assert.match(changed, /thêm \[D01\]/)
    assert.equal(e.generatedBy, 'template')
    assert.equal(e.narrative, null)
    assert.equal(e.fallbackReason, null)
  })

  it('phần ảnh hưởng nêu căn cứ theo mã định danh và không mở rộng ra toàn trường', () => {
    const e = explainRulesTemplate(verifiedComparison())
    const text = e.sections.affected.join('\n')
    assert.match(text, /Căn cứ: Cùng institutionId "inst-1" và programId "prog-1"/)
    assert.match(text, /không suy ra cho chương trình khác hoặc toàn trường/)
  })

  it('đối tượng chưa xác định → nói rõ "Chưa xác định", kèm lý do và việc cần làm', () => {
    const c = compareRules(
      makeVersion({ id: 'a', programId: null, programName: null, conditions: EXAMPLE_OLD }),
      makeVersion({ id: 'b', programId: null, programName: null, conditions: EXAMPLE_NEW, source: { appliedYear: 2026 } }),
    )
    const e = explainRulesTemplate(c)
    assert.match(e.sections.affected.join('\n'), /Chưa xác định được đối tượng bị ảnh hưởng/)
    assert.match(e.sections.nextChecks.join('\n'), /Xác định đúng trường và chương trình/)
    assert.ok(e.sections.insufficientData.some((line) => line.includes('programId')))
  })

  it('không có thay đổi → nói rõ không có khác biệt, không bịa tác động', () => {
    const c = compareRules(makeVersion({ id: 'a', conditions: EXAMPLE_OLD }), makeVersion({ id: 'b', conditions: EXAMPLE_OLD, source: { appliedYear: 2026 } }))
    const e = explainRulesTemplate(c)
    assert.match(e.sections.whatChanged.join('\n'), /Không phát hiện khác biệt/)
    assert.match(e.sections.affected.join('\n'), /không có đối tượng bị ảnh hưởng/)
    assert.deepEqual(e.changeRows, [])
  })

  it('null hiển thị là "chưa có dữ liệu", không bao giờ thành 0', () => {
    const c = compareRules(
      makeVersion({ id: 'a', conditions: { minimumScore: null, scoreScale: 30 } }),
      makeVersion({ id: 'b', conditions: { minimumScore: 25, scoreScale: 30 }, source: { appliedYear: 2026 } }),
    )
    const e = explainRulesTemplate(c)
    const text = visibleText(e)
    assert.match(e.sections.whatChanged.join('\n'), /chưa có dữ liệu \(null\) → 25/)
    assert.doesNotMatch(text, /→ 0\b/)
    assert.doesNotMatch(text, /: 0\b/)
    assert.ok(e.sections.insufficientData.some((line) => line.includes('không coi null là 0')))
  })

  it('banner: simulated / needs_review / verified', () => {
    assert.deepEqual(explainRulesTemplate(simulatedComparison()).banners, [SIMULATED_BANNER])
    assert.deepEqual(explainRulesTemplate(needsReviewComparison()).banners, [NEEDS_REVIEW_BANNER])
    assert.deepEqual(explainRulesTemplate(verifiedComparison()).banners, [])
  })

  it('banner không bị lặp trong phần "chưa đủ dữ liệu"', () => {
    const e = explainRulesTemplate(simulatedComparison())
    assert.ok(!e.sections.insufficientData.includes(SIMULATED_BANNER))
  })

  it('dòng nguồn có URL/năm/trạng thái; thiếu thì ghi "không có", không tự điền', () => {
    const verified = explainRulesTemplate(verifiedComparison())
    assert.match(verified.sourceLines[1] ?? '', /URL: https:\/\/example\.invalid\/rules-2026/)
    assert.match(verified.sourceLines[1] ?? '', /năm áp dụng: 2026/)
    const simulated = explainRulesTemplate(simulatedComparison())
    assert.match(simulated.sourceLines[0] ?? '', /URL: không có.*ngày kiểm tra: không có.*Giả lập \(simulated\)/)
  })

  it('changeRows có nhãn tiếng Việt và giá trị đã định dạng cho giao diện', () => {
    const rows = explainRulesTemplate(simulatedComparison()).changeRows
    assert.deepEqual(
      rows.map((row) => [row.field, row.changeTypeLabel, row.oldText, row.newText]),
      [
        ['conditions.minimumScore', 'Sửa', '24', '25'],
        ['conditions.subjectCombination', 'Sửa', '[A00]', '[A00, D01]'],
      ],
    )
    assert.equal(rows[0]?.fieldLabel, 'Điểm tối thiểu (conditions.minimumScore)')
  })

  it('nextChecks: có URL → nhắc mở đúng URL đã có; simulated → nhắc thay bằng văn bản chính thức', () => {
    assert.match(explainRulesTemplate(verifiedComparison()).sections.nextChecks.join('\n'), /https:\/\/example\.invalid\/rules-2026/)
    assert.match(explainRulesTemplate(simulatedComparison()).sections.nextChecks.join('\n'), /Thay dữ liệu giả lập bằng hai văn bản tuyển sinh chính thức/)
  })
})

describe('12. giải thích template không thêm dữ kiện ngoài đầu vào', () => {
  const cases: Array<[string, () => RuleComparison]> = [
    ['simulated', simulatedComparison],
    ['verified', verifiedComparison],
    ['needs_review', needsReviewComparison],
    [
      'null + khác thang điểm',
      () =>
        compareRules(
          makeVersion({ id: 'a', conditions: { minimumScore: null, scoreScale: 30 } }),
          makeVersion({ id: 'b', conditions: { minimumScore: 80, scoreScale: 100 }, source: { appliedYear: 2026 } }),
        ),
    ],
  ]
  for (const [name, build] of cases) {
    it(`(${name}) mọi số/URL trong văn bản đều có trong dữ liệu đầu vào; không cam kết kết quả`, () => {
      const comparison = build()
      const text = visibleText(explainRulesTemplate(comparison))
      const check = validateAiNarrative(text, comparison)
      assert.deepEqual(check.reasons, [])
      assert.equal(check.valid, true)
    })
  }

  it('bộ kiểm tra thực sự bắt được dữ kiện ngoài đầu vào (chứng minh test không rỗng)', () => {
    const comparison = verifiedComparison()
    const bad = visibleText(explainRulesTemplate(comparison)) + '\nĐiểm chuẩn năm ngoái là 27.5 tại https://invented.invalid/x'
    const check = validateAiNarrative(bad, comparison)
    assert.equal(check.valid, false)
    assert.ok(check.reasons.some((r) => r.includes('27.5')))
    assert.ok(check.reasons.some((r) => r.includes('https://invented.invalid/x')))
  })
})

// --- AI + fallback ----------------------------------------------------------

describe('11. explainRules — AI không khả dụng thì dùng template, không giả vờ đã gọi AI', () => {
  it('không có provider (chưa cấu hình/không có API key) → template + not_configured', async () => {
    const e = await explainRules(simulatedComparison())
    assert.equal(e.generatedBy, 'template')
    assert.equal(e.fallbackReason, 'not_configured')
    assert.equal(e.narrative, null)
    assert.ok(e.sections.whatChanged.length > 0)
  })

  it('provider ném lỗi (API lỗi / mất mạng) → template + provider_error, không rò thông báo lỗi thô', async () => {
    const e = await explainRules(simulatedComparison(), {
      provider: provider(async () => {
        throw new Error('ECONNRESET key=sk-SECRET-123')
      }),
    })
    assert.equal(e.generatedBy, 'template')
    assert.equal(e.fallbackReason, 'provider_error')
    assert.equal(e.narrative, null)
    assert.ok(!JSON.stringify(e).includes('SECRET'))
  })

  it('provider ném lỗi đồng bộ cũng được xử lý', async () => {
    const e = await explainRules(simulatedComparison(), {
      provider: provider(() => {
        throw new Error('sync failure')
      }),
    })
    assert.equal(e.fallbackReason, 'provider_error')
  })

  it('provider treo → timeout, hủy tín hiệu, dùng template', async () => {
    let aborted = false
    const e = await explainRules(simulatedComparison(), {
      timeoutMs: 20,
      provider: provider(
        (_request, signal) =>
          new Promise<string>(() => {
            signal.addEventListener('abort', () => {
              aborted = true
            })
          }),
      ),
    })
    assert.equal(e.generatedBy, 'template')
    assert.equal(e.fallbackReason, 'timeout')
    assert.equal(aborted, true)
  })

  const invalidOutputs: Array<[string, unknown, RegExp]> = [
    ['rỗng', '', /rỗng/],
    ['chỉ khoảng trắng', '   \n ', /rỗng/],
    ['không phải chuỗi', { text: 'x' }, /không phải chuỗi/],
    ['có số ngoài đầu vào', 'Tình huống giả lập: điểm chuẩn năm ngoái là 28.5. Cần kiểm tra thêm.', /28\.5/],
    ['có URL ngoài đầu vào', 'Tình huống giả lập, xem https://invented.invalid/quy-dinh để kiểm tra.', /URL không thuộc/],
    ['khẳng định chắc chắn đỗ', 'Tình huống giả lập: bạn chắc chắn đỗ nếu đạt 25. Cần kiểm tra.', /chắc chắn đỗ/],
    ['cam kết đảm bảo trúng tuyển', 'Tình huống giả lập: đảm bảo trúng tuyển khi đủ điểm. Cần kiểm tra.', /cam kết kết quả/],
    ['thiếu nhãn giả lập dù dữ liệu simulated', 'Điểm tối thiểu đổi từ 24 sang 25. Cần kiểm tra.', /giả lập/],
  ]
  for (const [name, output, reason] of invalidOutputs) {
    it(`nội dung AI không hợp lệ (${name}) → template + invalid_output`, async () => {
      const e = await explainRules(simulatedComparison(), { provider: provider(async () => output as string) })
      assert.equal(e.generatedBy, 'template')
      assert.equal(e.fallbackReason, 'invalid_output')
      assert.equal(e.narrative, null)
      assert.match(e.fallbackDetail ?? '', reason)
    })
  }

  it('dữ liệu needs_review: AI không nhắc kiểm tra/xác minh → bị loại; có nhắc → được nhận', async () => {
    const comparison = needsReviewComparison()
    const bad = await explainRules(comparison, { provider: provider(async () => 'Điểm tối thiểu đổi từ 24 sang 25.') })
    assert.equal(bad.fallbackReason, 'invalid_output')
    const good = await explainRules(comparison, {
      provider: provider(async () => 'Điểm tối thiểu đổi từ 24 sang 25; dữ liệu cần kiểm tra thêm.'),
    })
    assert.equal(good.generatedBy, 'ai')
  })

  it('nội dung AI hợp lệ → generatedBy = ai, giữ narrative, các phần có cấu trúc vẫn từ dữ liệu', async () => {
    const comparison = simulatedComparison()
    const e = await explainRules(comparison, { provider: provider(async () => `  ${GOOD_SIMULATED_TEXT}  `) })
    assert.equal(e.generatedBy, 'ai')
    assert.equal(e.fallbackReason, null)
    assert.equal(e.fallbackDetail, null)
    assert.equal(e.narrative, GOOD_SIMULATED_TEXT)
    assert.deepEqual(e.sections, explainRulesTemplate(comparison).sections)
    assert.deepEqual(e.banners, [SIMULATED_BANNER])
  })

  it('đánh số đầu dòng danh sách (1., 2.) không bị coi là số ngoài đầu vào', async () => {
    const text = 'Tình huống giả lập.\n1. Điểm tối thiểu đổi từ 24 sang 25.\n2. Cần kiểm tra lại nguồn.\n- Có thêm D01.'
    const e = await explainRules(simulatedComparison(), { provider: provider(async () => text) })
    assert.equal(e.generatedBy, 'ai')
  })

  it('provider nhận bản sao dữ liệu + chỉ dẫn hệ thống; sửa bản sao không ảnh hưởng kết quả gốc', async () => {
    const comparison = simulatedComparison()
    const before = JSON.stringify(comparison)
    let received: ExplanationRequest | undefined
    await explainRules(comparison, {
      provider: provider(async (request) => {
        received = request
        request.comparison.changes.length = 0
        return GOOD_SIMULATED_TEXT
      }),
    })
    assert.ok(received)
    assert.match(received.systemInstructions, /Không thêm điểm chuẩn, học phí/)
    assert.equal(JSON.stringify(comparison), before)
  })

  it('kết quả của explainRules luôn phân biệt được AI và template qua generatedBy', async () => {
    const comparison = simulatedComparison()
    const withAi = await explainRules(comparison, { provider: provider(async () => GOOD_SIMULATED_TEXT) })
    const withoutAi = await explainRules(comparison, { provider: provider(async () => '') })
    assert.deepEqual([withAi.generatedBy, withoutAi.generatedBy], ['ai', 'template'])
    assert.equal(withoutAi.narrative, null)
  })
})
