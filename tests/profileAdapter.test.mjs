import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = await readFile(path.join(root, 'src/adapters/profileAdapter.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const adapterUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
const { validateUiProfile, toStudentProfile } = await import(adapterUrl)

const validProfile = {
  score: '24.5',
  interest: 'technology',
  region: 'central',
  budget: '20to40',
  keywords: '',
}

test('accepts a complete valid profile and maps its score to scale 30', () => {
  assert.deepEqual(validateUiProfile(validProfile), [])
  const profile = toStudentProfile(validProfile)
  assert.equal(profile.expectedScore, 24.5)
  assert.equal(profile.scoreScale, 30)
})

test('reports every required field when the profile is incomplete', () => {
  const errors = validateUiProfile({
    score: '',
    interest: '',
    region: '',
    budget: '',
    keywords: '',
  })
  assert.equal(errors.length, 4)
  assert.ok(errors.some((error) => error.includes('điểm')))
  assert.ok(errors.some((error) => error.includes('nhóm ngành')))
  assert.ok(errors.some((error) => error.includes('khu vực')))
  assert.ok(errors.some((error) => error.includes('ngân sách')))
})

test('rejects non-numeric, non-finite, negative, and over-scale scores', () => {
  for (const score of ['abc', 'NaN', 'Infinity', '-0.1', '30.1']) {
    assert.ok(validateUiProfile({ ...validProfile, score }).some((error) => error.includes('0–30')), score)
  }
})
