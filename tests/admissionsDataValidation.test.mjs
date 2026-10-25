import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

const source = await readFile(new URL('../src/data/admissionsDataValidation.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText
const { validateAdmissionsDataset, resolveUniqueSourceByTitle } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)

const sourceRecord = {
  title: 'Admission plan',
  url: 'https://example.edu.vn/admission',
  applicableYear: 2026,
  checkedAt: '2026-10-25',
  status: 'verified',
}
const university = {
  id: 'uni-a', name: 'University A', shortName: 'UA', province: 'Da Nang',
  region: 'central', website: 'https://example.edu.vn',
  sources: [sourceRecord], status: 'verified',
}
const program = {
  id: 'program-a', universityId: 'uni-a', name: 'Computer Science',
  majorGroup: 'information_technology',
  tuitionMinVndPerYear: null, tuitionMaxVndPerYear: null, tuitionYear: null,
  admissionMethods: [{
    method: 'high_school_exam', description: 'Exam score', applicableYear: 2026,
    sourceIds: [], status: 'needs_review',
  }],
  historicalCutoff: null, cutoffYear: null, cutoffScale: null,
  sources: [sourceRecord], status: 'needs_review',
}
const cutoffs = {
  title: 'Cutoffs', years: [2025], checkedAt: '2026-10-25',
  scoringPolicy: 'Compare only same method and scale',
  records: [{
    id: 'cutoff-a', programId: 'program-a', universityId: 'uni-a', year: 2025,
    method: 'high_school_exam', cutoffScore: 25, scoreScale: 30,
    sourceUrl: 'https://example.edu.vn/cutoff', checkedAt: '2026-10-25',
    status: 'verified',
  }],
}
const validate = (u = [university], p = [program], c = cutoffs) =>
  validateAdmissionsDataset(u, p, c)

test('accepts a structurally valid dataset with nullable tuition and cutoffs', () => {
  assert.deepEqual(validate(), [])
})

test('rejects invalid source URL, year and status metadata', () => {
  const badUniversity = {
    ...university,
    sources: [{ ...sourceRecord, url: 'javascript:alert(1)', applicableYear: 0, status: 'unknown' }],
  }
  const errors = validate([badUniversity])
  assert.ok(errors.some((error) => error.includes('sources[0]')))
})

test('rejects a cutoff whose university does not own the referenced program', () => {
  const badCutoffs = {
    ...cutoffs,
    records: [{ ...cutoffs.records[0], universityId: 'another-university' }],
  }
  const errors = validate([university, {
    ...university, id: 'another-university', shortName: 'AU',
  }], [program], badCutoffs)
  assert.ok(errors.some((error) => error.includes('does not match its program')))
})

test('rejects duplicate cutoff IDs and scores outside their scale', () => {
  const badRecord = { ...cutoffs.records[0], cutoffScore: 31 }
  const errors = validate([university], [program], {
    ...cutoffs, records: [badRecord, { ...badRecord }],
  })
  assert.ok(errors.some((error) => error.includes('Duplicate cutoff id')))
  assert.ok(errors.some((error) => error.includes('exceeds its scoreScale')))
})

test('rejects malformed admission methods and preserves explicit null values', () => {
  const errors = validate([university], [{
    ...program,
    admissionMethods: [{ ...program.admissionMethods[0], method: 'made_up' }],
  }])
  assert.ok(errors.some((error) => error.includes('admissionMethods[0]')))
  assert.deepEqual(validate(), [])
})

test('resolves source title only when the exact match is unique', () => {
  const first = { ...sourceRecord }
  const second = { ...sourceRecord, title: 'Another source' }
  assert.equal(resolveUniqueSourceByTitle([first, second], first.title), first)
  assert.equal(resolveUniqueSourceByTitle([first], 'missing'), undefined)
  assert.equal(resolveUniqueSourceByTitle([first, { ...first }], first.title), undefined)
})
