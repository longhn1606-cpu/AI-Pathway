import { compareAndExplainRules, type RuleComparisonResult } from '../logic/ruleComparison'
import type { AdmissionRuleVersion } from '../logic/ruleComparison'
import { createRuleService } from './ruleService'

const ruleService = createRuleService<AdmissionRuleVersion, RuleComparisonResult>({
  compare: compareAndExplainRules,
})

export function compareAdmissionRuleVersions(
  before: AdmissionRuleVersion,
  after: AdmissionRuleVersion,
): RuleComparisonResult {
  return ruleService.compare(before, after)
}
