import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(root, relativePath), 'utf8'))

const universities = await readJson('data/admissions-seed-2026/universities.json')
const programs = await readJson('data/admissions-seed-2026/programs.json')
const cutoffs = await readJson('data/admissions-seed-2026/historical_cutoffs.json')

// The production adapter imports these canonical exports. The test supplies the
// exact JSON payloads as a module so Node can execute transpiled TypeScript without
// changing the project's runtime or requiring a TypeScript loader.
const canonicalModuleUrl = `data:text/javascript;base64,${Buffer.from(
  `export const universities = ${JSON.stringify(universities)}; export const programs = ${JSON.stringify(programs)}; export const historicalCutoffs = ${JSON.stringify(cutoffs)};`,
).toString('base64')}`

async function compile(relativePath) {
  const source = await readFile(path.join(root, relativePath), 'utf8')
  return ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText
}

const recommendationUrl = `data:text/javascript;base64,${Buffer.from(
  await compile('src/logic/recommendation.ts'),
).toString('base64')}`

const simulationSource = (await compile('src/logic/simulation.ts'))
  .replace("from './recommendation'", `from '${recommendationUrl}'`)
const simulationUrl = `data:text/javascript;base64,${Buffer.from(simulationSource).toString('base64')}`

let serviceSource = await compile('src/services/integratedRecommendationService.ts')
serviceSource = serviceSource
  .replace("from '../data/admissionsData'", `from '${canonicalModuleUrl}'`)
  .replace("from '../logic/recommendation'", `from '${recommendationUrl}'`)
  .replace("from '../logic/simulation'", `from '${simulationUrl}'`)
const serviceUrl = `data:text/javascript;base64,${Buffer.from(serviceSource).toString('base64')}`

const { createIntegratedRecommendationService } = await import(serviceUrl)
const service = createIntegratedRecommendationService()
const profile = {
  expectedScore: 24,
  scoreScale: 30,
  interests: [],
  preferredRegions: ['nationwide'],
  annualBudgetVnd: null,
  preferredMethods: [],
}

test('integrated service reads canonical dataset with stable university/program IDs', async () => {
  const [actualUniversities, actualPrograms] = await Promise.all([
    service.getUniversities(),
    service.getProgramsByUniversity(universities[0].id),
  ])
  assert.equal(actualUniversities.length, universities.length)
  assert.ok(actualUniversities.every((item) => universities.some((source) => source.id === item.id)))
  assert.ok(actualPrograms.every((item) => item.universityId === universities[0].id))
})

test('recommendation results reference canonical program IDs and preserve data status', async () => {
  const response = await service.recommend({ profile })
  const canonicalById = new Map(programs.map((program) => [program.id, program]))
  for (const result of response.results) {
    const source = canonicalById.get(result.programId)
    assert.ok(source, `Unknown programId returned: ${result.programId}`)
    assert.ok(['verified', 'needs_review', 'simulated'].includes(result.dataStatus))
    if (source.status === 'simulated') assert.equal(result.dataStatus, 'simulated')
  }
})

test('simulation applies scenario changes without mutating original profile', async () => {
  const original = structuredClone(profile)
  const result = await service.simulate({ profile }, { expectedScore: 20 })
  assert.equal(result.scenarioProfile.expectedScore, 20)
  assert.deepEqual(profile, original)
  assert.notEqual(result.scenarioProfile, profile)
  assert.ok(Array.isArray(result.before.results))
  assert.ok(Array.isArray(result.after.results))
  assert.ok(Array.isArray(result.comparison.added))
  assert.ok(Array.isArray(result.comparison.removed))
  assert.ok(Array.isArray(result.comparison.retained))
})

test('service returns no invented records for an empty injected dataset', async () => {
  const emptyService = createIntegratedRecommendationService({
    getUniversities: () => [],
    getPrograms: () => [],
  })
  const response = await emptyService.recommend({ profile })
  assert.deepEqual(response.results, [])
  assert.ok(response.warnings.some((warning) => warning.includes('Chưa có chương trình')))
})
