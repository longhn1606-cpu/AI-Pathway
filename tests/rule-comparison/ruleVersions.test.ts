import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { SIMULATED_BANNER } from '../../src/logic/ruleTypes'
import { analyzeRuleChange, loadBundledRuleVersions, parseRuleVersions } from '../../src/logic/ruleVersions'
import { jsonClone, makeVersion } from './fixtures'

describe('dữ liệu đi kèm: src/data/admissionRules.json', () => {
  it('nạp được, không lỗi, đúng hai phiên bản', () => {
    const { versions, errors } = loadBundledRuleVersions()
    assert.deepEqual(errors, [])
    assert.deepEqual(versions.map((v) => v.id), ['sim-rule-v1', 'sim-rule-v2'])
  })

  it('toàn bộ là simulated, không có URL và không có ngày kiểm tra (không bịa nguồn)', () => {
    for (const version of loadBundledRuleVersions().versions) {
      assert.equal(version.source.dataStatus, 'simulated', version.id)
      assert.equal(version.source.url, null, version.id)
      assert.equal(version.source.checkedAt, null, version.id)
      assert.match(version.source.name, /giả lập/, version.id)
    }
  })

  it('luồng đầu–cuối: so sánh → giải thích, phát hiện đủ added/removed/modified', async () => {
    const { versions } = loadBundledRuleVersions()
    const result = await analyzeRuleChange(versions, 'sim-rule-v1', 'sim-rule-v2')
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.deepEqual(
      result.comparison.changes.map((c) => `${c.changeType}:${c.field}`),
      [
        'modified:conditions.minimumScore',
        'modified:conditions.subjectCombination',
        'removed:conditions.interviewRequired',
        'added:conditions.foreignLanguageCertificateRequired',
      ],
    )
    assert.equal(result.comparison.affectedStatus, 'determined')
    assert.deepEqual(result.comparison.affectedPrograms, ['sim-program-it-01'])
    assert.equal(result.comparison.overallDataStatus, 'simulated')
    assert.deepEqual(result.explanation.banners, [SIMULATED_BANNER])
    assert.equal(result.explanation.generatedBy, 'template')
    assert.equal(result.explanation.fallbackReason, 'not_configured')
    // notes: null ở cả hai bản → không phải thay đổi
    assert.ok(!result.comparison.changes.some((c) => c.field === 'conditions.notes'))
  })

  it('đảo chiều (v2 → v1) cho kết quả đối xứng: added ↔ removed, và cảnh báo thứ tự năm', async () => {
    const { versions } = loadBundledRuleVersions()
    const result = await analyzeRuleChange(versions, 'sim-rule-v2', 'sim-rule-v1')
    assert.ok(result.ok)
    if (!result.ok) return
    const types = Object.fromEntries(result.comparison.changes.map((c) => [c.field, c.changeType]))
    assert.equal(types['conditions.interviewRequired'], 'added')
    assert.equal(types['conditions.foreignLanguageCertificateRequired'], 'removed')
    assert.ok(result.comparison.limitations.some((line) => line.includes('sớm hơn phiên bản "cũ"')))
  })

  it('id không tồn tại → ok: false kèm lý do, không ném lỗi', async () => {
    const { versions } = loadBundledRuleVersions()
    const missingOld = await analyzeRuleChange(versions, 'khong-co', 'sim-rule-v2')
    const missingNew = await analyzeRuleChange(versions, 'sim-rule-v1', 'khong-co')
    assert.deepEqual(missingOld, { ok: false, error: 'Không tìm thấy phiên bản cũ có id "khong-co".' })
    assert.deepEqual(missingNew, { ok: false, error: 'Không tìm thấy phiên bản mới có id "khong-co".' })
  })

  it('analyzeRuleChange chuyển provider AI xuống; AI hợp lệ → generatedBy = ai', async () => {
    const { versions } = loadBundledRuleVersions()
    const result = await analyzeRuleChange(versions, 'sim-rule-v1', 'sim-rule-v2', {
      provider: {
        name: 'mock-ai',
        generate: async () => 'Đây là tình huống giả lập: điểm tối thiểu đổi từ 24 sang 25. Cần kiểm tra với văn bản chính thức.',
      },
    })
    assert.ok(result.ok)
    if (result.ok) assert.equal(result.explanation.generatedBy, 'ai')
  })
})

describe('parseRuleVersions — kiểm tra dữ liệu, không ép kiểu ngầm', () => {
  const valid = () => jsonClone(makeVersion({ id: 'ok-1', conditions: { minimumScore: 24 } }))

  it('chấp nhận mảng hoặc { versions: [...] }; programId/programName null hợp lệ', () => {
    const v = { ...valid(), programId: null, programName: null }
    assert.equal(parseRuleVersions([v]).errors.length, 0)
    assert.equal(parseRuleVersions({ versions: [v] }).versions.length, 1)
  })

  it('giữ nguyên trạng thái, không tự nâng cấp simulated/needs_review thành verified', () => {
    const sim = { ...valid(), id: 'sim', source: { ...valid().source, dataStatus: 'simulated' } }
    const nr = { ...valid(), id: 'nr', source: { ...valid().source, dataStatus: 'needs_review' } }
    const { versions, errors } = parseRuleVersions([sim, nr])
    assert.deepEqual(errors, [])
    assert.deepEqual(versions.map((v) => v.source.dataStatus), ['simulated', 'needs_review'])
  })

  const bad: Array<[string, (v: Record<string, any>) => void, RegExp]> = [
    ['dataStatus sai chính tả', (v) => (v.source.dataStatus = 'verifed'), /dataStatus: "verifed" không thuộc/],
    ['admissionMethod ngoài enum', (v) => (v.admissionMethod = 'oral_exam'), /admissionMethod "oral_exam" không thuộc/],
    ['thiếu khóa source.url (phải ghi null tường minh)', (v) => delete v.source.url, /thiếu khóa "url"/],
    ['thiếu source', (v) => delete v.source, /thiếu hoặc sai kiểu "source"/],
    ['thiếu khóa programId', (v) => delete v.programId, /thiếu khóa "programId"/],
    ['appliedYear không nguyên', (v) => (v.source.appliedYear = 2025.5), /appliedYear: cần số nguyên hoặc null/],
    ['url là chuỗi rỗng', (v) => (v.source.url = ''), /source\.url: cần chuỗi không rỗng hoặc null/],
    ['minimumScore là chuỗi', (v) => (v.conditions.minimumScore = '24'), /conditions\.minimumScore: cần số hoặc null/],
    ['scoreScale bằng 0', (v) => (v.conditions.scoreScale = 0), /scoreScale: cần số dương hoặc null/],
    ['subjectCombination chứa số', (v) => (v.conditions.subjectCombination = ['A00', 1]), /subjectCombination: cần mảng chuỗi/],
    ['điều kiện chứa Infinity', (v) => (v.conditions.extra = Number.POSITIVE_INFINITY), /extra: giá trị không phải JSON hợp lệ/],
    ['điều kiện chứa undefined', (v) => (v.conditions.extra = undefined), /extra: giá trị không phải JSON hợp lệ/],
    ['conditions không phải object', (v) => (v.conditions = []), /thiếu hoặc sai kiểu "conditions"/],
  ]
  for (const [name, mutate, message] of bad) {
    it(`loại phiên bản và báo lỗi: ${name}`, () => {
      const v = valid() as Record<string, any>
      v.conditions.scoreScale = v.conditions.scoreScale ?? 30
      mutate(v)
      const { versions, errors } = parseRuleVersions([v])
      assert.equal(versions.length, 0)
      assert.match(errors.join('\n'), message)
    })
  }

  it('id trùng → giữ bản đầu, báo lỗi bản sau; phiên bản hợp lệ khác vẫn được nạp', () => {
    const a = valid()
    const dup = { ...valid(), institutionName: 'Bản trùng' }
    const other = { ...valid(), id: 'ok-2' }
    const { versions, errors } = parseRuleVersions([a, dup, other])
    assert.deepEqual(versions.map((v) => v.id), ['ok-1', 'ok-2'])
    assert.match(errors.join('\n'), /versions\[1\] \("ok-1"\): id bị trùng/)
  })

  it('đầu vào gốc sai dạng → báo lỗi, không ném', () => {
    for (const raw of [null, 42, 'x', {}, { versions: 'x' }]) {
      const { versions, errors } = parseRuleVersions(raw)
      assert.equal(versions.length, 0)
      assert.equal(errors.length, 1)
    }
  })
})
