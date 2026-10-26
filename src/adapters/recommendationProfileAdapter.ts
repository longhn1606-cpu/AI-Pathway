import type { StudentProfile } from '../types'
import {
  toStudentProfile,
  type UiStudentProfile,
} from './profileAdapter'

/**
 * Member 5 boundary mapping between the UI's broad "technology" choice and
 * the canonical dataset's observed majorGroup values. Member 3's engine
 * normalizes "engineering" to technology but treats "information_technology"
 * as a separate normalized label, so both explicit dataset labels are passed.
 *
 * This is a taxonomy adapter only; it does not alter recommendation scoring.
 */
const UI_INTEREST_TO_DATASET_GROUPS: Record<string, string[]> = {
  technology: ['information_technology', 'engineering'],
}

export function toRecommendationProfile(input: UiStudentProfile): StudentProfile {
  const profile = toStudentProfile(input)
  return {
    ...profile,
    interests: profile.interests.flatMap((interest) =>
      UI_INTEREST_TO_DATASET_GROUPS[interest] ?? [interest],
    ),
  }
}
