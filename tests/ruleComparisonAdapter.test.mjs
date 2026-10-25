import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/logic/adapters/ruleComparisonAdapter.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const adapter = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

const program = {
  tuitionMinVndPerYear: 10_000_000,
  tuitionMaxVndPerYear: 20_000_000,
  tuitionYear: 2026,
}

test('ruleSourceToDataSource maps valid source fields', () => {
  assert.deepEqual(adapter.ruleSourceToDataSource({
    name: 'Official admission plan',
    url: 'https://example.edu.vn/admissions',
    appliedYear: 2026,
    version: 'v1',
    checkedAt: '2026-10-25',
    dataStatus: 'verified',
  }), {
    title: 'Official admission plan',
    url: 'https://example.edu.vn/admissions',
    applicableYear: 2026,
    checkedAt: '2026-10-25',
    status: 'verified',
  })
})

test('ruleSourceToDataSource rejects missing or whitespace provenance', () => {
  const base = {
    name: 'Source', url: 'https://example.edu.vn', appliedYear: 2026,
    version: 'v1', checkedAt: '2026-10-25', dataStatus: 'verified',
  }
  assert.equal(adapter.ruleSourceToDataSource({ ...base, url: '  ' }), null)
  assert.equal(adapter.ruleSourceToDataSource({ ...base, checkedAt: '  ' }), null)
  assert.equal(adapter.ruleSourceToDataSource({ ...base, appliedYear: null }), null)
  assert.equal(adapter.ruleSourceToDataSource({ ...base, name: '  ' }), null)
  assert.equal(adapter.ruleSourceToDataSource({ ...base, url: 'javascript:alert(1)' }), null)
  assert.equal(adapter.ruleSourceToDataSource({ ...base, appliedYear: 2201 }), null)
  assert.equal(adapter.ruleSourceToDataSource({ ...base, checkedAt: '2026-02-30' }), null)
})

test('dataSourceToRuleSource preserves source fields and supplied version', () => {
  const source = {
    title: 'Official source',
    url: 'https://example.edu.vn',
    applicableYear: 2026,
    checkedAt: '2026-10-25',
    status: 'needs_review',
  }
  assert.deepEqual(adapter.dataSourceToRuleSource(source, 'amendment-2'), {
    name: source.title,
    url: source.url,
    appliedYear: source.applicableYear,
    version: 'amendment-2',
    checkedAt: source.checkedAt,
    dataStatus: source.status,
  })
})

test('applyTuitionSnapshot maps tuition and keeps provenance', () => {
  const result = adapter.applyTuitionSnapshot(program, {
    minVndPerYear: 12_000_000,
    maxVndPerYear: 24_000_000,
    appliedYear: 2027,
    dataStatus: 'verified',
    sourceUrl: 'https://example.edu.vn/tuition',
  })
  assert.deepEqual(result.tuition, {
    tuitionMinVndPerYear: 12_000_000,
    tuitionMaxVndPerYear: 24_000_000,
    tuitionYear: 2027,
  })
  assert.deepEqual(result.provenance, {
    dataStatus: 'verified',
    sourceUrl: 'https://example.edu.vn/tuition',
  })
})

test('applyTuitionSnapshot preserves null values instead of converting them to zero', () => {
  const result = adapter.applyTuitionSnapshot(program, {
    minVndPerYear: null,
    maxVndPerYear: null,
    appliedYear: null,
    dataStatus: 'needs_review',
    sourceUrl: null,
  })
  assert.deepEqual(result.tuition, {
    tuitionMinVndPerYear: null,
    tuitionMaxVndPerYear: null,
    tuitionYear: null,
  })
  assert.deepEqual(result.provenance, { dataStatus: 'needs_review', sourceUrl: null })
})

test('applyTuitionSnapshot without a snapshot leaves program tuition unchanged', () => {
  assert.deepEqual(adapter.applyTuitionSnapshot(program, null), {
    tuition: {
      tuitionMinVndPerYear: program.tuitionMinVndPerYear,
      tuitionMaxVndPerYear: program.tuitionMaxVndPerYear,
      tuitionYear: program.tuitionYear,
    },
    provenance: null,
  })
})
