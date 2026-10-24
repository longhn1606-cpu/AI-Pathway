# Data policy

1. Never invent tuition, cutoff scores, quotas, admission rules, program codes, or source URLs.
2. Use `verified` only after checking an official source for the exact program, content, and applicable year.
3. `needs_review` means evidence is incomplete; do not present it as confirmed fact.
4. Unknown numeric values must be `null`, not zero. Simulated data must be labelled and kept separate from real data.
5. Historical cutoffs must include year, method, and score scale. Do not compare unlike scales without an officially supported conversion.
6. Valid JSON and passing structural tests do not establish factual correctness.
7. Do not use `needs_review` records to assert eligibility or predict admission chances.
8. `sourceIds` is empty because the supplied `DataSource` type has no `id`; do not silently alter the shared schema.
