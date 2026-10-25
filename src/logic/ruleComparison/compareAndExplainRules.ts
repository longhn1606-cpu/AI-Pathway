import type { AdmissionRuleVersion, RuleComparison, RuleExplanation } from './types'
import { compareRules, type CompareRulesOptions } from './compareRules'
import { explainRules } from './explainRules'

/** Combined result for consumers that need both machine-readable changes and user-facing explanation. */
export interface RuleComparisonResult {
  comparison: RuleComparison
  explanation: RuleExplanation
}

/**
 * Stable integration facade for frontend service ports.
 * The returned function can be passed as the compare method of createRuleService.
 */
export function compareAndExplainRules(
  before: AdmissionRuleVersion,
  after: AdmissionRuleVersion,
  options: CompareRulesOptions = {},
): RuleComparisonResult {
  const comparison = compareRules(before, after, options)
  return {
    comparison,
    explanation: explainRules(comparison),
  }
}
