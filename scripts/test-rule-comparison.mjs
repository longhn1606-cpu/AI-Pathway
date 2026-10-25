import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function loadTypeScript(relativePath) {
  const source = await readFile(path.join(root, relativePath), 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      verbatimModuleSyntax: true,
    },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(output).toString('base64')}`)
}

const [{ compareRules }, { explainRules }] = await Promise.all([
  loadTypeScript('src/logic/ruleComparison/compareRules.ts'),
  loadTypeScript('src/logic/ruleComparison/explainRules.ts'),
])

const source = (overrides = {}) => ({
  name: 'Demo source',
  url: 'https://example.edu/admissions',
  appliedYear: 2026,
  version: 'v1',
  checkedAt: '2026-10-25',
  dataStatus: 'verified',
  ...overrides,
})

const rule = (overrides = {}) => ({
  id: 'rule-v1',
  institutionId: 'uni-1',
  institutionName: 'University One',
  programId: 'program-1',
  programName: 'Computer Science',
  source: source(),
  admissionMethod: 'high_school_exam',
  conditions: {
    minimumScore: 24,
    combinations: ['A00'],
    documents: { transcript: true },
  },
  ...overrides,
})

let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  process.stdout.write(`✓ ${name}\n`)
}

test('hai phiên bản giống nhau không có thay đổi', () => {
  const result = compareRules(rule(), rule())
  assert.equal(result.changes.length, 0)
})

test('phát hiện trường được thêm', () => {
  const result = compareRules(rule(), rule({ conditions: { ...rule().conditions, interview: true } }))
  assert.ok(result.changes.some((change) => change.field === 'conditions.interview' && change.changeType === 'added'))
})

test('phát hiện trường bị xóa', () => {
  const result = compareRules(rule(), rule({ conditions: { minimumScore: 24, combinations: ['A00'] } }))
  assert.ok(result.changes.some((change) => change.field === 'conditions.documents' && change.changeType === 'removed'))
})

test('phát hiện giá trị thay đổi trong object lồng nhau', () => {
  const result = compareRules(rule(), rule({ conditions: {
    ...rule().conditions,
    documents: { transcript: false },
  } }))
  assert.ok(result.changes.some((change) => change.field === 'conditions.documents.transcript' && change.changeType === 'modified'))
})

test('phát hiện nhiều thay đổi trong cùng lần so sánh', () => {
  const result = compareRules(rule(), rule({ conditions: {
    minimumScore: 25,
    combinations: ['A00', 'D01'],
    documents: { transcript: false, identity: true },
  } }))
  assert.ok(result.changes.length >= 4)
})

test('phân biệt null với giá trị số', () => {
  const result = compareRules(rule({ conditions: { minimumScore: null } }), rule({ conditions: { minimumScore: 0 } }))
  assert.equal(result.changes[0].changeType, 'modified')
  assert.equal(result.changes[0].oldValue, null)
  assert.equal(result.changes[0].newValue, 0)
})

test('phân biệt null với thiếu trường', () => {
  const result = compareRules(rule({ conditions: { quota: null } }), rule({ conditions: {} }))
  assert.equal(result.changes[0].changeType, 'removed')
  assert.equal(result.changes[0].oldValue, null)
  assert.equal(result.changes[0].newValue, undefined)
})

test('tổ hợp môn không đổi khi chỉ thay đổi thứ tự phần tử', () => {
  const result = compareRules(rule({ conditions: { combinations: ['A00', 'D01'] } }), rule({ conditions: { combinations: ['D01', 'A00'] } }))
  assert.equal(result.changes.length, 0)
})

test('mảng dạng tập hợp có thể bỏ qua khác biệt thứ tự', () => {
  const result = compareRules(
    rule({ conditions: { combinations: ['A00', 'D01'] } }),
    rule({ conditions: { combinations: ['D01', 'A00'] } }),
    { unorderedArrayPaths: ['conditions.combinations'] },
  )
  assert.equal(result.changes.length, 0)
})

test('không sửa dữ liệu đầu vào', () => {
  const oldRule = rule()
  const newRule = rule({ conditions: { minimumScore: 25 } })
  const beforeOld = structuredClone(oldRule)
  const beforeNew = structuredClone(newRule)
  compareRules(oldRule, newRule)
  assert.deepEqual(oldRule, beforeOld)
  assert.deepEqual(newRule, beforeNew)
})

test('chỉ liên kết chương trình khi institutionId và programId cùng khớp', () => {
  assert.deepEqual(compareRules(rule(), rule({ id: 'v2' })).affectedPrograms, ['program-1'])
  assert.deepEqual(compareRules(rule(), rule({ institutionId: 'uni-2' })).affectedPrograms, [])
  assert.deepEqual(compareRules(rule(), rule({ programId: null })).affectedPrograms, [])
})

test('trạng thái simulated không bị nâng thành verified', () => {
  const result = compareRules(rule({ source: source({ dataStatus: 'simulated' }) }), rule())
  assert.equal(result.dataStatus, 'simulated')
})

test('trạng thái needs_review được giữ trong kết quả', () => {
  const result = compareRules(rule({ source: source({ dataStatus: 'needs_review' }) }), rule())
  assert.equal(result.dataStatus, 'needs_review')
})

test('thiếu URL nguồn tạo giới hạn minh bạch', () => {
  const result = compareRules(rule({ source: source({ url: null }) }), rule())
  assert.ok(result.limitations.some((item) => item.includes('Thiếu URL nguồn')))
})

test('không có programId thì không khẳng định chương trình bị ảnh hưởng', () => {
  const result = compareRules(rule({ programId: null }), rule({ programId: null, id: 'v2' }))
  assert.deepEqual(result.affectedPrograms, [])
  const explanation = explainRules(result)
  assert.ok(explanation.potentiallyAffected[0].includes('Chưa xác định'))
})

test('giải thích template nêu rõ dữ liệu mô phỏng và không suy diễn xác suất', () => {
  const result = compareRules(
    rule({ source: source({ dataStatus: 'simulated', url: null }) }),
    rule({ id: 'v2', source: source({ dataStatus: 'simulated', url: null, version: 'v2' }) }),
  )
  const explanation = explainRules(result)
  assert.equal(explanation.mode, 'template')
  assert.ok(explanation.summary.includes('mô phỏng'))
  assert.ok(explanation.unknowns.some((item) => item.includes('khả năng trúng tuyển')))
})

test('giải thích có bước tiếp theo và công khai nguồn', () => {
  const explanation = explainRules(compareRules(rule(), rule({ id: 'v2', conditions: { minimumScore: 25 } })))
  assert.ok(explanation.nextSteps.length >= 3)
  assert.ok(explanation.sourceDisclosure.some((item) => item.includes('Demo source')))
})


test('metadata trường/ngành và nguồn thay đổi được phát hiện', () => {
  const result = compareRules(rule(), rule({ institutionName: 'Renamed', programName: 'New major', source: source({ version: 'v2', appliedYear: 2027, url: 'https://example.edu/v2' }) }))
  for (const field of ['institutionName', 'programName', 'source.version', 'source.appliedYear', 'source.url']) {
    assert.ok(result.changes.some((change) => change.field === field), field)
  }
})

test('học phí thay đổi theo số tiền và năm được phát hiện', () => {
  const oldTuition = { minVndPerYear: 20_000_000, maxVndPerYear: 25_000_000, appliedYear: 2026, dataStatus: 'verified', sourceUrl: 'https://example.edu/tuition' }
  const newTuition = { ...oldTuition, minVndPerYear: 22_000_000, appliedYear: 2027 }
  const result = compareRules(rule({ tuition: oldTuition }), rule({ id: 'v2', tuition: newTuition }))
  assert.ok(result.changes.some((change) => change.field === 'tuition.minVndPerYear'))
  assert.ok(result.changes.some((change) => change.field === 'tuition.appliedYear'))
  assert.equal(result.tuitionStatus, 'verified')
  assert.ok(explainRules(result).tuitionImpact.length > 0)
})

test('không có học phí không bị hiểu là học phí bằng 0 hoặc không đổi', () => {
  const result = compareRules(rule(), rule({ id: 'v2' }))
  assert.equal(result.tuitionStatus, null)
  assert.ok(explainRules(result).tuitionImpact.some((item) => item.includes('Không thể kết luận')))
  assert.ok(result.limitations.some((item) => item.includes('Thiếu snapshot học phí')))
})

test('học phí mô phỏng luôn được gắn cảnh báo', () => {
  const tuition = { minVndPerYear: 10_000_000, maxVndPerYear: 12_000_000, appliedYear: 2026, dataStatus: 'simulated', sourceUrl: null }
  const result = compareRules(rule({ tuition }), rule({ id: 'v2', tuition }))
  assert.equal(result.tuitionStatus, 'simulated')
  assert.ok(explainRules(result).tuitionImpact.some((item) => item.includes('simulated')))
})

test('học phí thiếu một đầu khoảng không được tự ước tính', () => {
  const tuition = { minVndPerYear: null, maxVndPerYear: 12_000_000, appliedYear: 2026, dataStatus: 'needs_review', sourceUrl: null }
  const result = compareRules(rule({ tuition }), rule({ id: 'v2', tuition }))
  assert.equal(result.tuitionStatus, 'needs_review')
  assert.ok(result.limitations.some((item) => item.includes('chưa có dữ liệu')))
})

test('trạng thái nguồn thay đổi được phản ánh trong kết quả', () => {
  const result = compareRules(rule(), rule({ source: source({ dataStatus: 'needs_review' }) }))
  assert.ok(result.changes.some((change) => change.field === 'source.dataStatus'))
  assert.equal(result.dataStatus, 'needs_review')
})

test('URL nguồn học phí thay đổi được phát hiện', () => {
  const tuition = { minVndPerYear: 10, maxVndPerYear: 20, appliedYear: 2026, dataStatus: 'verified', sourceUrl: 'https://example.edu/a' }
  const result = compareRules(rule({ tuition }), rule({ id: 'v2', tuition: { ...tuition, sourceUrl: 'https://example.edu/b' } }))
  assert.ok(result.changes.some((change) => change.field === 'tuition.sourceUrl'))
})

test('khác trường thì không gán ngành bị ảnh hưởng', () => {
  const result = compareRules(rule(), rule({ institutionId: 'uni-2', id: 'v2' }))
  assert.deepEqual(result.affectedPrograms, [])
  assert.ok(result.limitations.some((item) => item.includes('institutionId khác nhau')))
})

test('thiếu năm áp dụng được cảnh báo trong giải thích', () => {
  const result = compareRules(rule({ source: source({ appliedYear: null }) }), rule({ id: 'v2' }))
  assert.ok(explainRules(result).unknowns.some((item) => item.includes('Thiếu năm áp dụng')))
})

test('dữ liệu học phí null vẫn được giữ nguyên khi giải thích', () => {
  const tuition = { minVndPerYear: null, maxVndPerYear: null, appliedYear: null, dataStatus: 'needs_review', sourceUrl: null }
  const result = compareRules(rule({ tuition }), rule({ id: 'v2', tuition }))
  assert.equal(result.changes.length, 0)
  assert.ok(result.limitations.some((item) => item.includes('chưa có dữ liệu')))
})

const scenariosPath = path.join(root, 'data/admission-rule-comparison/demo-scenarios.json')
const scenarios = JSON.parse(await readFile(scenariosPath, 'utf8'))
test('bộ kịch bản demo có ít nhất 7 tình huống được gắn nhãn simulated', () => {
  assert.ok(scenarios.scenarios.length >= 7)
  assert.ok(scenarios.scenarios.every((item) =>
    item.oldRule.source.dataStatus === 'simulated'
    && item.newRule.source.dataStatus === 'simulated'
    && item.notice.includes('mô phỏng'),
  ))
})
for (const scenario of scenarios.scenarios) {
  test(`kịch bản demo: ${scenario.id} — ${scenario.title}`, () => {
    const result = compareRules(scenario.oldRule, scenario.newRule)
    assert.ok(result.changes.some((change) => scenario.expectedChangedFields.includes(change.field)),
      `Thiếu thay đổi mong đợi: ${scenario.expectedChangedFields.join(', ')}`)
    const explanation = explainRules(result)
    assert.ok(explanation.whatChanged.length > 0)
    assert.ok(explanation.sourceDisclosure.length === 2)
    assert.ok(explanation.impactAssessment.length > 0)
    assert.equal(explanation.impactLevel, 'requires_review',
      'Kịch bản mô phỏng phải yêu cầu rà soát, không được kết luận mức ảnh hưởng thực tế')
  })
}
test('đánh giá mức độ ảnh hưởng cao chỉ dùng khi nguồn và năm đã verified', () => {
  const verifiedSource = source({ url: 'https://university.example/admissions', appliedYear: 2027, dataStatus: 'verified' })
  const oldRule = rule({ source: verifiedSource, conditions: { minimumScore: 22 } })
  const newRule = rule({ id: 'rule-v2', source: { ...verifiedSource, version: 'v2' }, conditions: { minimumScore: 25 } })
  const explanation = explainRules(compareRules(oldRule, newRule))
  assert.equal(explanation.impactLevel, 'high')
})
test('metadata đơn thuần được phân loại mức ảnh hưởng thấp khi dữ liệu verified', () => {
  const verifiedSource = source({ url: 'https://university.example/admissions', appliedYear: 2027, dataStatus: 'verified' })
  const oldRule = rule({ source: verifiedSource })
  const newRule = rule({ id: 'rule-v2', source: { ...verifiedSource, version: 'v2' } })
  const explanation = explainRules(compareRules(oldRule, newRule))
  assert.equal(explanation.impactLevel, 'low')
})


test('thay đổi học phí verified được phân loại mức ảnh hưởng trung bình', () => {
  const verifiedSource = source({ url: 'https://university.example/admissions', appliedYear: 2027, dataStatus: 'verified' })
  const oldTuition = { minVndPerYear: 20_000_000, maxVndPerYear: 25_000_000, appliedYear: 2026, dataStatus: 'verified', sourceUrl: 'https://university.example/tuition' }
  const newTuition = { ...oldTuition, minVndPerYear: 22_000_000, appliedYear: 2027 }
  const oldRule = rule({ source: verifiedSource, tuition: oldTuition })
  const newRule = rule({ id: 'rule-v2', source: { ...verifiedSource, version: 'v2' }, tuition: newTuition })
  assert.equal(explainRules(compareRules(oldRule, newRule)).impactLevel, 'medium')
})


test('học phí simulated không được phân loại medium dù nguồn quy định verified', () => {
  const verifiedSource = source({ url: 'https://university.example/admissions', appliedYear: 2027, dataStatus: 'verified' })
  const oldTuition = { minVndPerYear: 20_000_000, maxVndPerYear: 25_000_000, appliedYear: 2026, dataStatus: 'simulated', sourceUrl: null }
  const newTuition = { ...oldTuition, minVndPerYear: 22_000_000, appliedYear: 2027 }
  const oldRule = rule({ source: verifiedSource, tuition: oldTuition })
  const newRule = rule({ id: 'rule-v2', source: { ...verifiedSource, version: 'v2' }, tuition: newTuition })
  assert.equal(explainRules(compareRules(oldRule, newRule)).impactLevel, 'requires_review')
})

test('thêm snapshot học phí không đầy đủ phải yêu cầu rà soát', () => {
  const verifiedSource = source({ url: 'https://university.example/admissions', appliedYear: 2027, dataStatus: 'verified' })
  const tuition = { minVndPerYear: null, maxVndPerYear: null, appliedYear: null, dataStatus: 'needs_review', sourceUrl: null }
  const oldRule = rule({ source: verifiedSource })
  const newRule = rule({ id: 'rule-v2', source: { ...verifiedSource, version: 'v2' }, tuition })
  assert.equal(explainRules(compareRules(oldRule, newRule)).impactLevel, 'requires_review')
})

test('thay đổi học phí đầy đủ và verified được phân loại medium', () => {
  const verifiedSource = source({ url: 'https://university.example/admissions', appliedYear: 2027, dataStatus: 'verified' })
  const oldTuition = { minVndPerYear: 20_000_000, maxVndPerYear: 25_000_000, appliedYear: 2026, dataStatus: 'verified', sourceUrl: 'https://university.example/tuition-2026' }
  const newTuition = { ...oldTuition, minVndPerYear: 22_000_000, appliedYear: 2027, sourceUrl: 'https://university.example/tuition-2027' }
  const oldRule = rule({ source: verifiedSource, tuition: oldTuition })
  const newRule = rule({ id: 'rule-v2', source: { ...verifiedSource, version: 'v2' }, tuition: newTuition })
  assert.equal(explainRules(compareRules(oldRule, newRule)).impactLevel, 'medium')
})



test('thay đổi phương thức xét tuyển được phát hiện', () => {
  const result = compareRules(rule(), rule({ admissionMethod: 'academic_record' }))
  assert.ok(result.changes.some((change) => change.field === 'admissionMethod' && change.oldValue === 'high_school_exam' && change.newValue === 'academic_record'))
})

test('tổ hợp môn phát hiện phần tử thêm dù thứ tự không có ý nghĩa', () => {
  const result = compareRules(
    rule({ conditions: { subjectCombinations: ['A00'] } }),
    rule({ conditions: { subjectCombinations: ['D01', 'A00'] } }),
  )
  assert.ok(result.changes.some((change) => change.field === 'conditions.subjectCombinations'))
})

test('phát hiện thay đổi chỉ tiêu và cách tính điểm khi các trường có trong dữ liệu', () => {
  const before = rule({ conditions: { quota: 100, scoring: { formula: 'sum', scale: 30 } } })
  const after = rule({ conditions: { quota: 120, scoring: { formula: 'weighted', scale: 100 } } })
  const result = compareRules(before, after)
  for (const field of ['conditions.quota', 'conditions.scoring.formula', 'conditions.scoring.scale']) {
    assert.ok(result.changes.some((change) => change.field === field), field)
  }
})

test('không so sánh điều kiện giữa hai trường khác nhau', () => {
  const before = rule({ conditions: { minimumScore: 20 } })
  const after = rule({ institutionId: 'uni-2', conditions: { minimumScore: 28 } })
  const result = compareRules(before, after)
  assert.ok(result.changes.some((change) => change.field === 'institutionId'))
  assert.equal(result.changes.some((change) => change.field.startsWith('conditions.')), false)
  assert.equal(result.comparableScope, false)
  assert.deepEqual(result.affectedUniversities, [])
  assert.deepEqual(result.affectedMajors, [])
  assert.equal(explainRules(result).impactLevel, 'requires_review')
})

test('không so sánh điều kiện giữa hai ngành khác nhau trong cùng trường', () => {
  const before = rule({ conditions: { minimumScore: 20 } })
  const after = rule({ programId: 'program-2', programName: 'Other major', conditions: { minimumScore: 28 } })
  const result = compareRules(before, after)
  assert.equal(result.changes.some((change) => change.field.startsWith('conditions.')), false)
  assert.deepEqual(result.affectedUniversities, [])
  assert.deepEqual(result.affectedMajors, [])
  assert.equal(result.comparableScope, false)
})

test('xác định trường và ngành bị ảnh hưởng chỉ khi định danh khớp', () => {
  const result = compareRules(rule(), rule({ id: 'v2', conditions: { minimumScore: 25 } }))
  assert.deepEqual(result.affectedUniversities, ['uni-1'])
  assert.deepEqual(result.affectedMajors, ['program-1'])
  assert.deepEqual(result.affectedPrograms, ['program-1'])
  const explanation = explainRules(result)
  assert.ok(explanation.potentiallyAffected.some((item) => item.includes('uni-1')))
  assert.ok(explanation.potentiallyAffected.some((item) => item.includes('program-1')))
})

test('phạm vi cấp trường với programId null có thể so sánh, nhưng không gán ngành', () => {
  const result = compareRules(
    rule({ programId: null, programName: null, conditions: { quota: 100 } }),
    rule({ id: 'v2', programId: null, programName: null, conditions: { quota: 120 } }),
  )
  assert.equal(result.comparableScope, true)
  assert.ok(result.changes.some((change) => change.field === 'conditions.quota'))
  assert.deepEqual(result.affectedUniversities, ['uni-1'])
  assert.deepEqual(result.affectedMajors, [])
})

test('khác phạm vi không tạo giải thích học phí như thể đã so sánh', () => {
  const tuition = { minVndPerYear: 10, maxVndPerYear: 20, appliedYear: 2026, dataStatus: 'verified', sourceUrl: 'https://example.edu/tuition' }
  const result = compareRules(rule({ tuition }), rule({ programId: 'program-2', tuition: { ...tuition, minVndPerYear: 15 } }))
  const explanation = explainRules(result)
  assert.ok(explanation.tuitionImpact.some((item) => item.includes('không cùng phạm vi')))
  assert.equal(result.changes.some((change) => change.field.startsWith('tuition')), false)
})

test('giải thích mỗi thay đổi có giá trị trước và sau', () => {
  const result = compareRules(rule({ conditions: { minimumScore: 22 } }), rule({ conditions: { minimumScore: 25 } }))
  const explanation = explainRules(result)
  assert.ok(explanation.whatChanged.some((item) => item.includes('22') && item.includes('25')))
})

test('thiếu nguồn/năm và simulated không được nâng thành verified', () => {
  const oldRule = rule({ source: source({ url: null, appliedYear: null, dataStatus: 'simulated' }) })
  const newRule = rule({ id: 'v2', source: source({ url: null, appliedYear: null, dataStatus: 'simulated', version: 'v2' }) })
  const result = compareRules(oldRule, newRule)
  const explanation = explainRules(result)
  assert.equal(result.dataStatus, 'simulated')
  assert.equal(explanation.impactLevel, 'requires_review')
  assert.ok(explanation.sourceDisclosure.every((item) => item.includes('simulated') && item.includes('không có URL')))
})

test('đầu vào không có snapshot thứ hai được phân biệt qua contract input bắt buộc', () => {
  assert.throws(() => compareRules(rule(), undefined), TypeError)
})

process.stdout.write(`\nTổng kết cuối: ${passed} kiểm thử passed.\n`)
