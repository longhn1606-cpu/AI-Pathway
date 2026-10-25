# Frontend integration preparation

## Scope
This branch prepares explicit frontend boundaries without replacing the current UI or duplicating member-owned algorithms.

## Added files
- `src/adapters/profileAdapter.ts`: validates the existing form values and maps them to shared `StudentProfile`.
- `src/services/recommendationService.ts`: dependency-injected port for member 3 `recommendPrograms`.
- `src/services/simulationService.ts`: dependency-injected port for member 3 `simulateScenario`.
- `src/services/ruleService.ts`: generic port for member 4 rule comparison.
- `src/components/DataStatusBadge.tsx`: shared display for all three `DataStatus` values.
- `src/index.css`: status badge styles.

## Important data limitations
- UI score is on scale 30; adapter sets `scoreScale: 30` only for a valid numeric score.
- Existing budget input is a band, not an exact annual VND amount. Adapter deliberately preserves `annualBudgetVnd: null` rather than inventing a precise amount from a range. Replace the UI field with an exact numeric annual budget before enabling budget-based recommendation.
- `anywhere` maps to `preferredRegions: ['nationwide']`.
- The existing UI interest values are passed as interests. Confirm exact `majorGroup` vocabulary with member 3 before production integration.
- The existing UI does not collect preferred admission methods; adapter leaves `preferredMethods: []`.
- No API/backend is introduced.

## Integration dependencies
The member-3 and member-4 implementations are on separate branches/PRs and are not part of the frontend base branch. The ports use dependency injection so frontend can connect the real implementations after coordinated merge without copying their algorithms. Member 4's exact public function and snapshot types must be confirmed before wiring the rule screen.

## Not yet implemented
- App.tsx still renders its clearly-labelled local demo fixture and local filters. It is intentionally not replaced with fake imports or a second recommendation algorithm.
- Simulation and rule comparison screens are not yet wired because their module contracts are not merged/confirmed.
- No fake tuition, cutoff, source, or rule data has been added.

## Verification
This change was authored through GitHub's file API. A local dependency install, TypeScript build, browser run, and automated UI tests have not been executed in this environment. Run `npm install` then `npm run build` in a checkout before merging. Add adapter unit tests when the repository's test runner is selected.
