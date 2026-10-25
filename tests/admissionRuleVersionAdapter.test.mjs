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
const { toAdmissionRuleVersionPair, validateAdmissionRuleVersions } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`
)
const [before, after] = fixture.versions
const clone = (value) => structuredClone(value)

test('validates fixture collection from unknown and preserves null provenance', () => {
  const raw: unknown = fixture.versions
  const result = validateAdmissionRuleVersions(raw)
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.value.length, 2)
  assert.equal(result.value[0].source.dataStatus, 'simulated')
  assert.equal(result.value[0].source.url, null)
  assert.equal(result.value[0].source.appliedYear, null)
  assert.equal(result.value[0].tuition?.minVndPerYear, null)
})

test('rejects a non-array collection, malformed entry and duplicate IDs', () => {
  assert.equal(validateAdmissionRuleVersions(null).ok, false)
  assert.equal(validateAdmissionRuleVersions([before, null]).ok, false)
  assert.equal(validateAdmissionRuleVersions([before, { ...after, id: before.id }]).ok, false)
})

test('rejects malformed source URL, years, timestamps and source status', () => {
  for (const [field, value] of [
    ['url', 'javascript:alert(1)'],
    ['url', 12],
    ['appliedYear', '2026'],
    ['appliedYear', 0],
    ['checkedAt', 'not-a-date'],
    ['dataStatus', 'official'],
  ]) {
    const invalid = clone(before)
    invalid.source[field] = value
    assert.equal(toAdmissionRuleVersionPair(invalid, after).ok, false, `source.${field}`)
  }
})

test('rejects invalid institution/program metadata and admission methods', () => {
  for (const [field, value] of [
    ['id', '  '],
    ['institutionId', 42],
    ['institutionName', ''],
    ['programId', 42],
    ['programName', false],
    ['admissionMethod', 'unknown_method'],
  ]) {
    const invalid = clone(before)
    invalid[field] = value
    assert.equal(toAdmissionRuleVersionPair(invalid, after).ok, false, field)
  }
  for (const field of ['programId', 'programName']) {
    const nullable = clone(before)
    nullable[field] = null
    assert.equal(toAdmissionRuleVersionPair(nullable, after).ok, true)
  }
})

test('rejects malformed nested conditions and non-finite numbers', () => {
  for (const conditions of [[], null, { score: Number.NaN }, { nested: { value: Infinity } }, { value: undefined }]) {
    const invalid = clone(before)
    invalid.conditions = conditions
    assert.equal(toAdmissionRuleVersionPair(invalid, after).ok, false)
  }
})

test('validates all tuition fields, nullability, ranges and source URL', () => {
  const invalidValues = [
    { ...before.tuition, minVndPerYear: '0' },
    { ...before.tuition, maxVndPerYear: -1 },
    { ...before.tuition, minVndPerYear: 10, maxVndPerYear: 5 },
    { ...before.tuition, appliedYear: '2026' },
    { ...before.tuition, dataStatus: 'official' },
    { ...before.tuition, sourceUrl: 'file:///etc/passwd' },
    { ...before.tuition, sourceUrl: 123 },
  ]
  for (const tuition of invalidValues) {
    const invalid = clone(before)
    invalid.tuition = tuition
    assert.equal(toAdmissionRuleVersionPair(invalid, after).ok, false)
  }
  for (const tuition of [null, undefined, {
    minVndPerYear: null,
    maxVndPerYear: null,
    appliedYear: null,
    dataStatus: 'needs_review',
    sourceUrl: null,
  }]) {
    const valid = clone(before)
    if (tuition === undefined) delete valid.tuition
    else valid.tuition = tuition
    assert.equal(toAdmissionRuleVersionPair(valid, after).ok, true)
  }
})

test('rejects same snapshot and missing snapshot', () => {
  assert.equal(toAdmissionRuleVersionPair(before, before).ok, false)
  assert.equal(toAdmissionRuleVersionPair(before, null).ok, false)
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
