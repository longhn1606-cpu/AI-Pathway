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
const encodeBase64 = (value) => btoa(Array.from(new TextEncoder().encode(value), (byte) => String.fromCharCode(byte)).join(''))
const datasetAdapterSource = await compile('src/adapters/recommendationDatasetAdapter.ts')
const datasetAdapterUrl = `data:text/javascript;base64,${encodeBase64(datasetAdapterSource)}`
serviceSource = serviceSource.replace("from '../adapters/recommendationDatasetAdapter'", `from '${datasetAdapterUrl}'`)
const serviceUrl = `data:text/javascript;base64,${Buffer.from(serviceSource).toString('base64')}`
const { createIntegratedRecommendationService } = await import(serviceUrl)
const profileAdapterSource = await compile('src/adapters/profileAdapter.ts')
const profileAdapterUrl = `data:text/javascript;base64,${Buffer.from(profileAdapterSource).toString('base64')}`
const recommendationProfileSource = (await compile('src/adapters/recommendationProfileAdapter.ts'))
  .replace("from './profileAdapter'", `from '${profileAdapterUrl}'`)
const recommendationProfileUrl = `data:text/javascript;base64,${Buffer.from(recommendationProfileSource).toString('base64')}`
const { toRecommendationProfile } = await import(recommendationProfileUrl)
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

test('UI technology profile maps to canonical IT and engineering program groups', async () => {
  const uiProfile = toRecommendationProfile({
    score: '24',
    interest: 'technology',
    region: 'anywhere',
    budget: 'flexible',
    keywords: '',
  })
  const response = await service.recommend({ profile: uiProfile })
  const returnedPrograms = programs.filter((program) =>
    response.results.some((result) => result.programId === program.id),
  )
  assert.ok(returnedPrograms.length > 0)
  assert.ok(returnedPrograms.every((program) =>
    ['information_technology', 'engineering'].includes(program.majorGroup),
  ))
})

test('scale mismatch is surfaced without direct score comparison; null tuition remains unknown', async () => {
  const source = {
    title: 'Structural test source',
    url: 'https://example.edu.vn/admissions',
    applicableYear: 2026,
    checkedAt: '2026-10-25',
    status: 'verified',
  }
  const testUniversity = {
    id: 'test-university',
    name: 'Structural test university',
    shortName: 'Test U',
    province: 'Da Nang',
    region: 'central',
    website: 'https://example.edu.vn',
    sources: [source],
    status: 'verified',
  }
  const testProgram = {
    id: 'test-program',
    universityId: testUniversity.id,
    name: 'Structural test program',
    majorGroup: 'technology',
    tuitionMinVndPerYear: null,
    tuitionMaxVndPerYear: null,
    tuitionYear: null,
    admissionMethods: [],
    historicalCutoff: 24,
    cutoffYear: 2025,
    cutoffScale: 100,
    sources: [source],
    status: 'verified',
  }
  const testService = createIntegratedRecommendationService({
    getUniversities: () => [testUniversity],
    getPrograms: () => [testProgram],
  })
  const response = await testService.recommend({
    profile: {
      ...profile,
      interests: ['technology'],
      preferredRegions: ['nationwide'],
      annualBudgetVnd: 20_000_000,
    },
  })
  assert.equal(response.results.length, 1)
  assert.ok(response.results[0].warnings.some((warning) => warning.includes('Không so sánh điểm trực tiếp')))
  assert.ok(response.results[0].warnings.some((warning) => warning.includes('Chưa đủ dữ liệu học phí')))
})


const cutoffDataset = {
  title: 'Method-specific integration fixture',
  years: [2024, 2025],
  checkedAt: '2026-10-25',
  scoringPolicy: 'Compare only the same program, year, method and score scale.',
  records: [
    { id: 'p-hs-2024', programId: 'method-program', universityId: 'method-university', year: 2024, method: 'high_school_exam', cutoffScore: 26, scoreScale: 30, sourceUrl: 'https://example.edu.vn/cutoff-2024', checkedAt: '2026-10-25', status: 'verified' },
    { id: 'p-hs-2025', programId: 'method-program', universityId: 'method-university', year: 2025, method: 'high_school_exam', cutoffScore: 24, scoreScale: 30, sourceUrl: 'https://example.edu.vn/cutoff-2025', checkedAt: '2026-10-25', status: 'verified' },
    { id: 'p-ar-2025', programId: 'method-program', universityId: 'method-university', year: 2025, method: 'academic_record', cutoffScore: 23, scoreScale: 30, sourceUrl: 'https://example.edu.vn/academic-2025', checkedAt: '2026-10-25', status: 'simulated' },
  ],
}
const methodUniversity = {
  id: 'method-university', name: 'Method University', shortName: 'MU',
  province: 'Da Nang', region: 'central', website: 'https://example.edu.vn',
  sources: [{ title: 'Base source', url: 'https://example.edu.vn/admissions', applicableYear: 2026, checkedAt: '2026-10-25', status: 'verified' }],
  status: 'verified',
}
const methodProgram = {
  id: 'method-program', universityId: 'method-university', name: 'Method Program',
  majorGroup: 'technology', tuitionMinVndPerYear: null, tuitionMaxVndPerYear: null,
  tuitionYear: null,
  admissionMethods: [
    { method: 'high_school_exam', description: 'High school exam', applicableYear: 2026, sourceIds: ['Base source'], status: 'verified' },
    { method: 'academic_record', description: 'Academic record', applicableYear: 2026, sourceIds: ['Base source'], status: 'verified' },
  ],
  historicalCutoff: null, cutoffYear: null, cutoffScale: null,
  sources: [{ title: 'Base source', url: 'https://example.edu.vn/admissions', applicableYear: 2026, checkedAt: '2026-10-25', status: 'verified' }],
  status: 'verified',
}
const methodProfile = {
  expectedScore: 25, scoreScale: 30, interests: ['technology'],
  preferredRegions: ['nationwide'], annualBudgetVnd: null,
  preferredMethods: ['high_school_exam'],
}
const methodService = createIntegratedRecommendationService({
  getUniversities: () => [methodUniversity],
  getPrograms: () => [methodProgram],
  getHistoricalCutoffs: () => cutoffDataset,
})

test('historical cutoff adapter selects the latest unique record for the one selected method', async () => {
  const response = await methodService.recommend({ profile: methodProfile })
  assert.equal(response.results.length, 1)
  assert.ok(response.results[0].suitabilityReasons.some((reason) => reason.includes('năm 2025')))
  assert.ok(!response.results[0].warnings.some((warning) => warning.includes('Chưa đủ dữ liệu điểm chuẩn')))
})

test('simulation re-resolves cutoff for the changed admission method in both before and after states', async () => {
  const result = await methodService.simulate(
    { profile: methodProfile },
    { preferredMethods: ['academic_record'] },
  )
  assert.ok(result.before.results[0].suitabilityReasons.some((reason) => reason.includes('năm 2025')))
  assert.equal(result.before.results[0].dataStatus, 'verified')
  assert.ok(result.after.results[0].suitabilityReasons.some((reason) => reason.includes('năm 2025')))
  assert.equal(result.after.results[0].dataStatus, 'simulated')
  assert.equal(result.scenarioProfile.preferredMethods[0], 'academic_record')
})

test('historical method not currently declared by a program is not mapped into its cutoff slot', async () => {
  const unavailableMethodService = createIntegratedRecommendationService({
    getUniversities: () => [methodUniversity],
    getPrograms: () => [{
      ...methodProgram,
      admissionMethods: methodProgram.admissionMethods.filter((item) => item.method === 'high_school_exam'),
    }],
    getHistoricalCutoffs: () => cutoffDataset,
  })
  const response = await unavailableMethodService.recommend({
    profile: { ...methodProfile, preferredMethods: ['academic_record'] },
  })
  assert.ok(response.results[0].warnings.some((warning) => warning.includes('Chưa đủ dữ liệu điểm chuẩn')))
})

test('multiple selected methods leave the single cutoff slot unknown instead of choosing arbitrarily', async () => {
  const response = await methodService.recommend({
    profile: { ...methodProfile, preferredMethods: ['high_school_exam', 'academic_record'] },
  })
  assert.ok(response.results[0].warnings.some((warning) => warning.includes('Chưa đủ dữ liệu điểm chuẩn')))
})
