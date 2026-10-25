import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixture = JSON.parse(await readFile(path.join(root, 'data/admission-rule-comparison/demo-rules.json'), 'utf8'))
const source = await readFile(path.join(root, 'src/adapters/admissionRuleVersionAdapter.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText
const { toAdmissionRuleVersionPair } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
)
const [before, after] = fixture.versions

test('accepts two independent simulated snapshots and preserves provenance', () => {
  const result = toAdmissionRuleVersionPair(before, after)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.value.before.id, before.id)
  assert.equal(result.value.after.id, after.id)
  assert.equal(result.value.before.source.dataStatus, 'simulated')
  assert.equal(result.value.after.source.dataStatus, 'simulated')
  assert.equal(result.value.before.source.url, null)
  assert.equal(result.value.after.source.url, null)
})

test('rejects the same snapshot supplied as both versions', () => {
  const result = toAdmissionRuleVersionPair(before, before)
  assert.equal(result.ok, false)
})

test('rejects a missing snapshot', () => {
  const result = toAdmissionRuleVersionPair(before, null)
  assert.equal(result.ok, false)
})

test('rejects a current UniversityProgram-like record without version provenance', () => {
  const currentProgram = {
    id: 'dut-cntt',
    universityId: 'dut',
    name: 'Công nghệ thông tin',
    majorGroup: 'information_technology',
    tuitionMinVndPerYear: null,
    tuitionMaxVndPerYear: null,
    tuitionYear: null,
    admissionMethods: [],
    historicalCutoff: null,
    cutoffYear: null,
    cutoffScale: null,
    sources: [],
    status: 'needs_review',
  }
  assert.equal(toAdmissionRuleVersionPair(currentProgram, currentProgram).ok, false)
})
