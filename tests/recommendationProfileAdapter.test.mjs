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
const profileAdapterUrl = `data:text/javascript;base64,${Buffer.from(
  await compile('src/adapters/profileAdapter.ts'),
).toString('base64')}`
const adapterSource = (await compile('src/adapters/recommendationProfileAdapter.ts'))
  .replace("from './profileAdapter'", `from '${profileAdapterUrl}'`)
const adapterUrl = `data:text/javascript;base64,${Buffer.from(adapterSource).toString('base64')}`
const { toRecommendationProfile } = await import(adapterUrl)

test('technology UI choice maps to the two canonical dataset taxonomy labels', () => {
  const profile = toRecommendationProfile({
    score: '24.5',
    interest: 'technology',
    region: 'anywhere',
    budget: 'flexible',
    keywords: '',
  })
  assert.deepEqual(profile.interests, ['information_technology', 'engineering'])
  assert.deepEqual(profile.preferredRegions, ['nationwide'])
  assert.equal(profile.annualBudgetVnd, null)
})

test('undecided interest remains unconstrained and does not invent categories', () => {
  const profile = toRecommendationProfile({
    score: '20',
    interest: 'undecided',
    region: 'north',
    budget: '20to40',
    keywords: '',
  })
  assert.deepEqual(profile.interests, [])
  assert.deepEqual(profile.preferredRegions, ['north'])
  assert.equal(profile.annualBudgetVnd, 40_000_000)
})
