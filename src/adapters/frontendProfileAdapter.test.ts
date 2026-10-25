import { describe, expect, it } from 'vitest'
import { toStudentProfile } from './frontendProfileAdapter'

describe('toStudentProfile', () => {
  it('converts a valid score to the shared 30-point scale', () => {
    expect(
      toStudentProfile({
        score: '27.5',
        interest: 'technology',
        region: 'north',
        budget: 'under20',
      }),
    ).toMatchObject({
      expectedScore: 27.5,
      scoreScale: 30,
      interests: ['technology'],
      preferredRegions: ['north'],
      annualBudgetVnd: 20_000_000,
      preferredMethods: [],
    })
  })

  it.each(['', '   ', 'abc', 'NaN', 'Infinity', '-0.1', '30.1'])(
    'maps invalid or missing score "%s" to null',
    (score) => {
      const profile = toStudentProfile({
        score,
        interest: 'undecided',
        region: 'anywhere',
        budget: '',
      })

      expect(profile.expectedScore).toBeNull()
      expect(profile.scoreScale).toBeNull()
    },
  )

  it.each(['0', '30'])('accepts score boundary %s', (score) => {
    const profile = toStudentProfile({
      score,
      interest: 'other',
      region: 'south',
      budget: 'flexible',
    })

    expect(profile.expectedScore).toBe(Number(score))
    expect(profile.scoreScale).toBe(30)
  })

  it('does not emit an interest when the user is undecided', () => {
    const profile = toStudentProfile({
      score: '20',
      interest: 'undecided',
      region: 'central',
      budget: '20to40',
    })

    expect(profile.interests).toEqual([])
  })

  it('uses nationwide when no specific region is selected', () => {
    for (const region of ['', 'anywhere'] as const) {
      expect(
        toStudentProfile({
          score: '20',
          interest: 'technology',
          region,
          budget: 'flexible',
        }).preferredRegions,
      ).toEqual(['nationwide'])
    }
  })

  it.each([
    ['under20', 20_000_000],
    ['20to40', 40_000_000],
    ['40to70', 70_000_000],
    ['over70', null],
    ['flexible', null],
    ['', null],
  ] as const)('maps budget choice "%s" to its documented ceiling', (budget, expected) => {
    const profile = toStudentProfile({
      score: '20',
      interest: 'business',
      region: 'south',
      budget,
    })

    expect(profile.annualBudgetVnd).toBe(expected)
  })

  it('does not invent admission-method preferences', () => {
    const profile = toStudentProfile({
      score: '20',
      interest: 'health',
      region: 'north',
      budget: '40to70',
    })

    expect(profile.preferredMethods).toEqual([])
  })
})
