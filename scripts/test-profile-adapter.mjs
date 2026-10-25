import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(path.join(root, 'src/adapters/frontendProfileAdapter.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const { toStudentProfile } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
)

let passed = 0
function test(name, callback) {
  callback()
  passed += 1
  process.stdout.write(`✓ ${name}\n`)
}

const base = { score: '24.5', interest: 'technology', region: 'north', budget: '20to40' }

test('ánh xạ điểm thang 30, ngành, khu vực và ngân sách thành StudentProfile', () => {
  assert.deepEqual(toStudentProfile(base), {
    expectedScore: 24.5,
    scoreScale: 30,
    interests: ['technology'],
    preferredRegions: ['north'],
    annualBudgetVnd: 40_000_000,
    preferredMethods: [],
  })
})

test('điểm trống hoặc ngoài thang không được tự gán giá trị', () => {
  for (const score of ['', '-1', '31', 'abc']) {
    const profile = toStudentProfile({ ...base, score })
    assert.equal(profile.expectedScore, null)
    assert.equal(profile.scoreScale, null)
  }
})

test('chưa xác định ngành và toàn quốc được ánh xạ thành không giới hạn', () => {
  const profile = toStudentProfile({
    ...base, interest: 'undecided', region: 'anywhere', budget: 'flexible',
  })
  assert.deepEqual(profile.interests, [])
  assert.deepEqual(profile.preferredRegions, [])
  assert.equal(profile.annualBudgetVnd, null)
})

test('các dải ngân sách được ánh xạ theo cận trên; lựa chọn không có cận trên là null', () => {
  const expected = {
    under20: 20_000_000,
    '20to40': 40_000_000,
    '40to70': 70_000_000,
    over70: null,
    flexible: null,
  }
  for (const [budget, ceiling] of Object.entries(expected)) {
    assert.equal(toStudentProfile({ ...base, budget }).annualBudgetVnd, ceiling)
  }
})

test('phương thức xét tuyển để trống vì UI hiện tại không hỏi người dùng', () => {
  assert.deepEqual(toStudentProfile(base).preferredMethods, [])
})

process.stdout.write(`\nFrontend adapter: ${passed}/5 tests passed.\n`)
