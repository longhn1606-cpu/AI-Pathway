import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
async function importTypeScript(relativePath) {
  const source = await readFile(path.join(root, relativePath), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
}

const [universities, programs, cutoffs] = await Promise.all([
  readFile(path.join(root, 'data/admissions-seed-2026/universities.json'), 'utf8').then(JSON.parse),
  readFile(path.join(root, 'data/admissions-seed-2026/programs.json'), 'utf8').then(JSON.parse),
  readFile(path.join(root, 'data/admissions-seed-2026/historical_cutoffs.json'), 'utf8').then(JSON.parse),
])
const [{ validateAdmissionsDataset }, { toRecommendationDataset }, { recommendPrograms }] = await Promise.all([
  importTypeScript('src/data/admissionsDataValidation.ts'),
  importTypeScript('src/adapters/recommendationDatasetAdapter.ts'),
  importTypeScript('src/logic/recommendation.ts'),
])

const recommendationSource = await readFile(path.join(root, 'src/logic/recommendation.ts'), 'utf8')
const recommendationCompiled = ts.transpileModule(recommendationSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const recommendationModuleUrl = `data:text/javascript;base64,${Buffer.from(recommendationCompiled).toString('base64')}`
const simulationSource = await readFile(path.join(root, 'src/logic/simulation.ts'), 'utf8')
const simulationCompiled = ts.transpileModule(simulationSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText.replace("from './recommendation'", `from '${recommendationModuleUrl}'`)
const simulationModuleUrl = `data:text/javascript;base64,${Buffer.from(simulationCompiled).toString('base64')}`
const { simulateScenario } = await import(simulationModuleUrl)

let passed = 0
function test(name, fn) {
  fn()
  passed += 1
  process.stdout.write(`✓ ${name}\\n`)
}

test('canonical dataset passes runtime validation', () => {
  assert.deepEqual(validateAdmissionsDataset(universities, programs, cutoffs), [])
})

test('canonical programs are all retained for technology interest aliases', () => {
  const profile = {
    expectedScore: null, scoreScale: null, interests: ['technology'],
    preferredRegions: [], annualBudgetVnd: null, preferredMethods: [],
  }
  const input = toRecommendationDataset(profile, { universities, programs, historicalCutoffs: cutoffs })
  const result = recommendPrograms(input)
  assert.equal(result.results.length, programs.length)
  assert.equal(result.excluded.length, 0)
})

test('historical cutoff is selected only for one explicitly preferred method', () => {
  const profile = {
    expectedScore: 27, scoreScale: 30, interests: [], preferredRegions: [],
    annualBudgetVnd: null, preferredMethods: ['high_school_exam'],
  }
  const input = toRecommendationDataset(profile, { universities, programs, historicalCutoffs: cutoffs })
  const program = input.programs.find((item) => item.id === 'hust-it1')
  const expected = cutoffs.records
    .filter((record) => record.programId === 'hust-it1' && record.method === 'high_school_exam')
    .sort((a, b) => b.year - a.year)[0]
  assert.equal(program.historicalCutoff, expected.cutoffScore)
  assert.equal(program.cutoffYear, expected.year)
  assert.equal(program.cutoffScale, expected.scoreScale)
  if (expected.status === 'simulated') assert.equal(program.status, 'simulated')
})

test('historical cutoff is not applied when the program does not currently offer that method', () => {
  const profile = {
    expectedScore: 24, scoreScale: 30, interests: [], preferredRegions: [],
    annualBudgetVnd: null, preferredMethods: ['academic_record'],
  }
  const input = toRecommendationDataset(profile, { universities, programs, historicalCutoffs: cutoffs })
  const program = input.programs.find((item) => item.id === 'dut-cntt')
  assert.ok(!program.admissionMethods.some((item) => item.method === 'academic_record'))
  assert.equal(program.historicalCutoff, null)
  assert.equal(program.cutoffYear, null)
  assert.equal(program.cutoffScale, null)
})

test('latest canonical tuition values are used for budget filtering', () => {
  const profile = {
    expectedScore: null, scoreScale: null, interests: [], preferredRegions: [],
    annualBudgetVnd: 25_000_000, preferredMethods: [],
  }
  assert.equal(programs.find((item) => item.id === 'dut-cntt').tuitionMinVndPerYear, 28_000_000)
  assert.equal(programs.find((item) => item.id === 'dut-cntt').tuitionYear, 2026)
  const input = toRecommendationDataset(profile, { universities, programs, historicalCutoffs: cutoffs })
  const result = recommendPrograms(input)
  assert.equal(result.results.length, 0)
  assert.equal(result.excluded.length, programs.length)
  assert.ok(result.excluded.every((item) => item.reasons.some((reason) => reason.includes('vượt ngân sách'))))
})

test('simulation re-resolves cutoffs when the preferred admission method changes', () => {
  const baselineProfile = {
    expectedScore: 27, scoreScale: 30, interests: [], preferredRegions: [],
    annualBudgetVnd: null, preferredMethods: ['high_school_exam'],
  }
  const baseline = toRecommendationDataset(baselineProfile, { universities, programs, historicalCutoffs: cutoffs })
  const simulated = simulateScenario(
    baseline,
    { preferredMethods: ['academic_record'] },
    (profile) => toRecommendationDataset(profile, { universities, programs, historicalCutoffs: cutoffs }),
  )
  const beforeDut = simulated.before.results.find((item) => item.programId === 'dut-cntt')
  const afterDut = simulated.after.results.find((item) => item.programId === 'dut-cntt')
  assert.ok(beforeDut)
  assert.ok(afterDut)
  assert.ok(!beforeDut.warnings.some((warning) => warning.includes('Chưa đủ dữ liệu điểm chuẩn lịch sử')))
  assert.ok(afterDut.warnings.some((warning) => warning.includes('Chưa đủ dữ liệu điểm chuẩn lịch sử')))
  assert.deepEqual(baselineProfile.preferredMethods, ['high_school_exam'])
  assert.deepEqual(simulated.scenarioProfile.preferredMethods, ['academic_record'])
})

test('no preferred method means no cross-method cutoff inference', () => {
  const profile = {
    expectedScore: 27, scoreScale: 30, interests: [], preferredRegions: [],
    annualBudgetVnd: null, preferredMethods: [],
  }
  const input = toRecommendationDataset(profile, { universities, programs, historicalCutoffs: cutoffs })
  assert.ok(input.programs.every((program) => program.historicalCutoff === null))
  const result = recommendPrograms(input)
  assert.ok(result.results.every((item) =>
    item.warnings.some((warning) => warning.includes('Chưa đủ dữ liệu điểm chuẩn lịch sử')),
  ))
})

process.stdout.write(`Canonical integration: ${passed}/7 tests passed.\\n`)
