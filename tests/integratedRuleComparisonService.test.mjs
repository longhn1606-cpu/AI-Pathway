import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
async function compile(relativePath) {
  const source = await readFile(path.join(root, relativePath), 'utf8')
  return ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText
}
const typesUrl = `data:text/javascript;base64,${Buffer.from('export {};').toString('base64')}`
const compareSource = (await compile('src/logic/ruleComparison/compareRules.ts'))
  .replace("from './types'", `from '${typesUrl}'`)
const compareUrl = `data:text/javascript;base64,${Buffer.from(compareSource).toString('base64')}`
const explainSource = (await compile('src/logic/ruleComparison/explainRules.ts'))
  .replace("from './types'", `from '${typesUrl}'`)
const explainUrl = `data:text/javascript;base64,${Buffer.from(explainSource).toString('base64')}`
const facadeSource = (await compile('src/logic/ruleComparison/compareAndExplainRules.ts'))
  .replace("from './types'", `from '${typesUrl}'`)
  .replace("from './compareRules'", `from '${compareUrl}'`)
  .replace("from './explainRules'", `from '${explainUrl}'`)
const facadeUrl = `data:text/javascript;base64,${Buffer.from(facadeSource).toString('base64')}`
let serviceSource = (await compile('src/services/integratedRuleComparisonService.ts'))
  .replace("from '../logic/ruleComparison'", `from '${facadeUrl}'`)
const serviceUrl = `data:text/javascript;base64,${Buffer.from(serviceSource).toString('base64')}`
const { createRuleComparisonService } = await import(serviceUrl)
const service = createRuleComparisonService()

const snapshot = (id, version, minimumScore, tuition = null) => ({
  id,
  institutionId: 'uni-1',
  institutionName: 'Trường minh họa (fixture kiểm thử)',
  programId: 'program-1',
  programName: 'Ngành minh họa (fixture kiểm thử)',
  source: {
    name: 'Fixture mô phỏng kiểm thử',
    url: 'https://example.invalid/rule-fixture',
    appliedYear: 2026,
    version,
    checkedAt: '2026-10-25',
    dataStatus: 'simulated',
  },
  admissionMethod: 'high_school_exam',
  conditions: { minimumScore },
  tuition,
})

test('rule integration delegates to Member 4 and preserves simulated provenance', () => {
  const result = service.compare(
    snapshot('v1', 'v1', 20),
    snapshot('v2', 'v2', 22),
  )
  assert.ok(result.comparison.changes.some((change) => change.field === 'conditions.minimumScore'))
  assert.equal(result.comparison.dataStatus, 'simulated')
  assert.equal(result.explanation.impactLevel, 'requires_review')
})

test('missing tuition snapshots remain unknown, not zero or unchanged', () => {
  const result = service.compare(
    snapshot('v1', 'v1', 20, null),
    snapshot('v2', 'v2', 20, null),
  )
  assert.equal(result.comparison.tuition.old, null)
  assert.equal(result.comparison.tuition.new, null)
  assert.ok(result.explanation.tuitionImpact.some((item) => item.includes('Chưa có snapshot học phí')))
})


test('tuition change with simulated evidence always requires review', () => {
  const oldTuition = {
    minVndPerYear: 20_000_000,
    maxVndPerYear: 25_000_000,
    appliedYear: 2026,
    dataStatus: 'simulated',
    sourceUrl: null,
  }
  const newTuition = { ...oldTuition, minVndPerYear: 22_000_000, appliedYear: 2027 }
  const oldSource = {
    name: 'Official-looking source fixture',
    url: 'https://example.edu/rules',
    appliedYear: 2026,
    version: 'v1',
    checkedAt: '2026-10-25',
    dataStatus: 'verified',
  }
  const newSource = { ...oldSource, appliedYear: 2027, version: 'v2' }
  const oldRule = {
    ...snapshot('v1', 'v1', 20),
    source: { name: 'Verified rule source', url: 'https://example.edu/rules', appliedYear: 2026, version: 'v1', checkedAt: '2026-10-25', dataStatus: 'verified' },
    tuition: oldTuition,
  }
  const newRule = {
    ...snapshot('v2', 'v2', 20),
    source: { name: 'Verified rule source', url: 'https://example.edu/rules', appliedYear: 2027, version: 'v2', checkedAt: '2026-10-25', dataStatus: 'verified' },
    tuition: newTuition,
  }
  const result = service.compare(oldRule, newRule)
  assert.equal(result.explanation.impactLevel, 'requires_review')
})

test('adding incomplete tuition evidence requires review, not medium impact', () => {
  const oldRule = snapshot('v1', 'v1', 20)
  const newRule = snapshot('v2', 'v2', 20, {
    minVndPerYear: null,
    maxVndPerYear: null,
    appliedYear: null,
    dataStatus: 'needs_review',
    sourceUrl: null,
  })
  const result = service.compare(oldRule, newRule)
  assert.equal(result.explanation.impactLevel, 'requires_review')
  assert.ok(result.explanation.tuitionImpact.some((item) => item.includes('chưa có dữ liệu')))
})

test('complete verified tuition change is classified medium by Member 4 logic', () => {
  const sourceV1 = {
    name: 'Verified source fixture',
    url: 'https://example.edu/rules',
    appliedYear: 2026,
    version: 'v1',
    checkedAt: '2026-10-25',
    dataStatus: 'verified',
  }
  const sourceV2 = { ...sourceV1, appliedYear: 2027, version: 'v2' }
  const tuitionV1 = {
    minVndPerYear: 20_000_000,
    maxVndPerYear: 25_000_000,
    appliedYear: 2026,
    dataStatus: 'verified',
    sourceUrl: 'https://example.edu/tuition-2026',
  }
  const tuitionV2 = {
    ...tuitionV1,
    minVndPerYear: 22_000_000,
    appliedYear: 2027,
    sourceUrl: 'https://example.edu/tuition-2027',
  }
  const oldRule = { ...snapshot('v1', 'v1', 20), source: sourceV1, tuition: tuitionV1 }
  const newRule = { ...snapshot('v2', 'v2', 20), source: sourceV2, tuition: tuitionV2 }
  const result = service.compare(oldRule, newRule)
  assert.equal(result.explanation.impactLevel, 'medium')
})
