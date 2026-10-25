export interface RuleComparisonPort<Input, Output> {
  compare(before: Input, after: Input): Output
}

/**
 * Generic port for member-4 rule comparison. Keep member-4's domain types at
 * the integration edge; do not recreate or reinterpret their rule algorithm.
 */
export function createRuleService<Input, Output>(engine: RuleComparisonPort<Input, Output>) {
  return {
    compare(before: Input, after: Input): Output {
      return engine.compare(before, after)
    },
  }
}
