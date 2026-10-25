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

test('mảng giữ thứ tự mặc định', () => {
  const result = compareRules(rule({ conditions: { combinations: ['A00', 'D01'] } }), rule({ conditions: { combinations: ['D01', 'A00'] } }))
  assert.equal(result.changes[0].changeType, 'modified')
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

process.stdout.write(`\nTổng kết: ${passed} kiểm thử passed.\n`)
