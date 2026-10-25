import { describe, expect, it } from 'vitest'
import { toStudentProfile, validateUiProfile } from './profileAdapter'

describe('profileAdapter', () => {
  const base = {
    score: '27.5',
    interest: 'technology' as const,
    region: 'north' as const,
    budget: 'under20' as const,
    keywords: '',
  }

  it('maps a valid score and selected preferences to StudentProfile', () => {
    expect(toStudentProfile(base)).toEqual({
      expectedScore: 27.5,
      scoreScale: 30,
      interests: ['technology'],
      preferredRegions: ['north'],
      annualBudgetVnd: null,
      preferredMethods: [],
    })
  })

  it.each(['', '   ', 'abc', 'NaN', 'Infinity', '-0.1', '30.1'])(
    'maps invalid score "%s" to null',
    (score) => {
      const profile = toStudentProfile({ ...base, score })
      expect(profile.expectedScore).toBeNull()
      expect(profile.scoreScale).toBeNull()
    },
  )

  it.each(['0', '30'])('accepts score boundary %s', (score) => {
    expect(toStudentProfile({ ...base, score }).expectedScore).toBe(Number(score))
  })

  it('represents undecided interest as an empty preference', () => {
    expect(toStudentProfile({ ...base, interest: 'undecided' }).interests).toEqual([])
  })

  it('maps anywhere or an empty region to nationwide', () => {
    expect(toStudentProfile({ ...base, region: 'anywhere' }).preferredRegions).toEqual(['nationwide'])
  })

  it('keeps budget ranges unknown instead of inventing an exact annual budget', () => {
    for (const budget of ['under20', '20to40', '40to70', 'over70', 'flexible'] as const) {
      expect(toStudentProfile({ ...base, budget }).annualBudgetVnd).toBeNull()
    }
  })

  it('does not invent admission-method preferences', () => {
    expect(toStudentProfile(base).preferredMethods).toEqual([])
  })

  it('validates required form fields and score range', () => {
    expect(validateUiProfile(base)).toEqual([])
    expect(validateUiProfile({ ...base, score: '31' })).toContain('Điểm dự kiến phải nằm trong khoảng 0–30.')
  })
})
