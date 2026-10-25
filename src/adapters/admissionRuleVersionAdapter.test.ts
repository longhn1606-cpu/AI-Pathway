import { describe, expect, it } from 'vitest'
import { toAdmissionRuleVersionPair } from './admissionRuleVersionAdapter'
import type { AdmissionRuleVersion } from '../logic/ruleComparison'

const before: AdmissionRuleVersion = {
  id: 'rule-2025',
  institutionId: 'university-a',
  institutionName: 'University A',
  programId: 'program-cs',
  programName: 'Computer Science',
  source: {
    name: 'Admission plan 2025',
    url: 'https://example.edu/admission-2025',
    appliedYear: 2025,
    version: '2025',
    checkedAt: '2025-01-01',
    dataStatus: 'verified',
  },
  admissionMethod: 'high_school_exam',
  conditions: { minimumScore: 22 },
}
const after: AdmissionRuleVersion = {
  ...before,
  id: 'rule-2026',
  source: { ...before.source, name: 'Admission plan 2026', appliedYear: 2026, version: '2026' },
  conditions: { minimumScore: 24 },
}

describe('toAdmissionRuleVersionPair', () => {
  it('preserves two independent version snapshots and their provenance', () => {
    const result = toAdmissionRuleVersionPair(before, after)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.before.id).toBe('rule-2025')
    expect(result.value.after.id).toBe('rule-2026')
    expect(result.value.before.source.appliedYear).toBe(2025)
    expect(result.value.after.source.appliedYear).toBe(2026)
    expect(result.value.before.conditions.minimumScore).toBe(22)
    expect(result.value.after.conditions.minimumScore).toBe(24)
  })

  it('rejects the same snapshot being supplied twice', () => {
    const result = toAdmissionRuleVersionPair(before, before)
    expect(result.ok).toBe(false)
  })

  it('rejects a missing snapshot', () => {
    const result = toAdmissionRuleVersionPair(before, null)
    expect(result.ok).toBe(false)
  })

  it('rejects a current UniversityProgram-like object without version provenance', () => {
    const currentProgram = {
      id: 'program-cs',
      universityId: 'university-a',
      name: 'Computer Science',
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
    expect(toAdmissionRuleVersionPair(currentProgram, currentProgram).ok).toBe(false)
  })
})
