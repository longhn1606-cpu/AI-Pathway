# Rule comparison frontend integration

## Data contract

The frontend integration passes an explicit pair:

```ts
interface AdmissionRuleVersionPair {
  before: AdmissionRuleVersion
  after: AdmissionRuleVersion
}
```

Use `toAdmissionRuleVersionPair(before, after)` from
`src/adapters/admissionRuleVersionAdapter.ts`. It validates both independent
snapshots and rejects missing records or identical version IDs. It preserves
source metadata, data status, conditions and nullable tuition as supplied.

A `UniversityProgram` is a current catalog record, not a historical snapshot.
It must not be duplicated, cast, or used as both `before` and `after`.
If either historical version is unavailable, the frontend must not compare.

## Facade and service flow

```text
Two explicit AdmissionRuleVersion snapshots
  -> toAdmissionRuleVersionPair adapter
  -> admissionRuleComparisonService
  -> createRuleService port
  -> compareAndExplainRules facade (Member 4)
  -> comparison + explanation
  -> RuleComparisonPanel
```

The integration imports Member 4's public facade and does not reimplement the
comparison or explanation rules.

## Demo fixture

`data/admission-rule-comparison/demo-rules.json` currently contains two
independent simulated snapshots for one illustrative program. The panel labels
them as simulated and does not present them as official admission rules.
Production data must replace this fixture with two source-backed snapshots
including distinct IDs, source URLs, applicable years, versions and statuses.

## Validation

- Both snapshots must have non-empty IDs and institution IDs.
- Snapshot IDs must differ.
- Source name, version and data status must be present.
- Conditions must be an object.
- Null tuition/source metadata remains null; no missing value is inferred.
- Different institution/program IDs are not silently treated as the same
  affected program; Member 4's comparison result carries the limitation.

Run `npm test` and `npm run build`.
