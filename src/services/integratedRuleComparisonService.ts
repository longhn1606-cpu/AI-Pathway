import {
  compareAndExplainRules,
  type AdmissionRuleVersion,
  type CompareRulesOptions,
  type RuleComparisonResult,
} from '../logic/ruleComparison'

/**
 * Thin Member 5 boundary around Member 4's public API.
 * Callers must provide two real, explicitly versioned snapshots. This service
 * does not derive historical rules from the current admissions dataset.
 */
export interface RuleComparisonService {
  compare(
    before: AdmissionRuleVersion,
    after: AdmissionRuleVersion,
    options?: CompareRulesOptions,
  ): RuleComparisonResult
}

export function createRuleComparisonService(): RuleComparisonService {
  return {
    compare(before, after, options) {
      return compareAndExplainRules(before, after, options)
    },
  }
}

export const integratedRuleComparisonService = createRuleComparisonService()
