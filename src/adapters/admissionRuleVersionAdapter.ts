import type { AdmissionRuleVersion } from '../logic/ruleComparison'

export interface AdmissionRuleVersionPair {
  before: AdmissionRuleVersion
  after: AdmissionRuleVersion
}

export type RuleVersionPairResult =
  | { ok: true; value: AdmissionRuleVersionPair }
  | { ok: false; error: string }

function isRuleVersion(value: unknown): value is AdmissionRuleVersion {
  if (!value || typeof value !== 'object') return false
  const rule = value as Partial<AdmissionRuleVersion>
  return typeof rule.id === 'string' && rule.id.trim().length > 0
    && typeof rule.institutionId === 'string' && rule.institutionId.trim().length > 0
    && typeof rule.institutionName === 'string'
    && !!rule.source && typeof rule.source === 'object'
    && typeof rule.source.name === 'string'
    && typeof rule.source.version === 'string'
    && ['verified', 'needs_review', 'simulated'].includes(rule.source.dataStatus)
    && !!rule.conditions && typeof rule.conditions === 'object' && !Array.isArray(rule.conditions)
}

/**
 * Accepts two independently sourced historical snapshots.
 * Deliberately does not accept UniversityProgram: a current program row cannot
 * be duplicated or transformed into historical evidence.
 */
export function toAdmissionRuleVersionPair(
  before: unknown,
  after: unknown,
): RuleVersionPairResult {
  if (!isRuleVersion(before) || !isRuleVersion(after)) {
    return {
      ok: false,
      error: 'Cần cung cấp đầy đủ hai snapshot AdmissionRuleVersion độc lập.',
    }
  }
  if (before.id === after.id) {
    return {
      ok: false,
      error: 'Hai phiên bản phải có ID khác nhau.',
    }
  }
  return { ok: true, value: { before, after } }
}
