import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
async function compile(relativePath) {
  const source = await readFile(path.join(root, relativePath), 'utf8')
  return ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
}
async function load(relativePath) {
  const compiled = await compile(relativePath)
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
}
const recommendationUrl = `data:text/javascript;base64,${Buffer.from(await compile('src/logic/recommendation.ts')).toString('base64')}`
const simulationSource = (await compile('src/logic/simulation.ts'))
  .replace("from './recommendation'", `from '${recommendationUrl}'`)
const simulationUrl = `data:text/javascript;base64,${Buffer.from(simulationSource).toString('base64')}`
const [{ simulateScenario }, { universities }, { programs }] = await Promise.all([
  import(simulationUrl),
  load('src/data/universities.ts'),
  load('src/data/programs.ts'),
])
const profile = {
  expectedScore: 24, scoreScale: 30, interests: [],
  preferredRegions: ['nationwide'], annualBudgetVnd: null, preferredMethods: [],
}
const input = { profile, universities, programs }
const snapshot = JSON.stringify(input)
let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  process.stdout.write(`✓ ${name}\n`)
}

test('mô phỏng thay đổi điểm tạo hồ sơ kịch bản độc lập', () => {
  const result = simulateScenario(input, { expectedScore: 20 })
  assert.equal(result.scenarioProfile.expectedScore, 20)
  assert.equal(profile.expectedScore, 24)
  assert.notEqual(result.scenarioProfile, profile)
})
test('mô phỏng thay đổi ngân sách không sửa hồ sơ gốc', () => {
  const result = simulateScenario(input, { annualBudgetVnd: 20000000 })
  assert.equal(result.scenarioProfile.annualBudgetVnd, 20000000)
  assert.equal(profile.annualBudgetVnd, null)
})
test('mô phỏng thay đổi ngành học được áp dụng', () => {
  const result = simulateScenario(input, { interests: ['technology'] })
  assert.deepEqual(result.scenarioProfile.interests, ['technology'])
})
test('mô phỏng thay đổi khu vực được áp dụng', () => {
  const result = simulateScenario(input, { preferredRegions: ['central'] })
  assert.deepEqual(result.scenarioProfile.preferredRegions, ['central'])
})
test('mô phỏng thay đổi phương thức được áp dụng', () => {
  const result = simulateScenario(input, { preferredMethods: ['academic_record'] })
  assert.deepEqual(result.scenarioProfile.preferredMethods, ['academic_record'])
})
test('kết quả có đầy đủ trước, sau và so sánh', () => {
  const result = simulateScenario(input, { preferredRegions: ['south'] })
  assert.ok(Array.isArray(result.before.results))
  assert.ok(Array.isArray(result.after.results))
  assert.ok(Array.isArray(result.comparison.added))
  assert.ok(Array.isArray(result.comparison.removed))
  assert.ok(Array.isArray(result.comparison.retained))
})
test('mảng trong hồ sơ kịch bản không dùng chung reference với hồ sơ gốc', () => {
  const result = simulateScenario(input, { interests: ['technology'] })
  result.scenarioProfile.interests.push('business')
  assert.deepEqual(profile.interests, [])
})
test('nhiều lần chạy cùng kịch bản cho kết quả xác định', () => {
  const a = simulateScenario(input, { preferredRegions: ['north'] })
  const b = simulateScenario(input, { preferredRegions: ['north'] })
  assert.deepEqual(a.after, b.after)
  assert.deepEqual(a.comparison, b.comparison)
})
test('chạy mô phỏng không làm thay đổi bất kỳ phần nào của input', () => {
  simulateScenario(input, { expectedScore: 27, annualBudgetVnd: 30000000 })
  assert.equal(JSON.stringify(input), snapshot)
})
test('không truyền thay đổi vẫn tạo kịch bản tương đương baseline', () => {
  const result = simulateScenario(input, {})
  assert.deepEqual(result.before, result.after)
  assert.deepEqual(result.comparison.added, [])
  assert.deepEqual(result.comparison.removed, [])
})
process.stdout.write(`\nSimulation: ${passed}/10 tests passed.\n`)
