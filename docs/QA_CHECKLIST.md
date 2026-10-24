# AI Pathway — QA / E2E Checklist

Run this checklist against the deployed preview or local Vite server. Mark each item only after performing the check.

## Build and startup
- [ ] `npm install` completes without dependency errors.
- [ ] `npm run build` passes (TypeScript project build and Vite production build).
- [ ] `npm run dev -- --host 0.0.0.0` starts successfully.
- [ ] Production preview starts with `npm run preview -- --host 0.0.0.0`.

## Main student journey
- [ ] Landing page loads without console errors.
- [ ] Navigation links move to Explore, Recommendations, and How it works sections.
- [ ] Submitting the profile with required fields missing is blocked by browser validation.
- [ ] Valid profile submission scrolls to the recommendation section.
- [ ] Interest, region, and keyword filters produce the expected results.
- [ ] “Show more” / collapsed result behavior works when enough results exist.
- [ ] Resetting the profile clears the form and recommendation state.
- [ ] Save/profile affordance communicates accurately whether data is only local demo state or actually persisted.

## Data integrity and admissions safety
- [ ] Demo records are clearly labelled as simulated.
- [ ] No illustrative school or program is presented as a real university/admissions fact.
- [ ] No recommendation promises admission or states guaranteed pass/fail.
- [ ] Missing tuition/cutoff values appear as unknown, not zero.
- [ ] Any real admissions claim shows source URL, applicable year, and verification status.
- [ ] University/program IDs and references are stable and valid.
- [ ] Score scales are shown consistently; unlike scales are not directly compared.

## Responsive and accessibility
- [ ] At narrow mobile width, navigation menu opens and closes and links remain usable.
- [ ] At tablet and desktop widths, content does not overflow horizontally.
- [ ] All form controls have visible labels and required fields are clear.
- [ ] Keyboard-only navigation reaches all links, controls, and buttons.
- [ ] Focus indicators are visible.
- [ ] Text contrast and zoom to 200% remain usable.
- [ ] Reduced-motion preference is respected where animated scrolling or decorative motion is used.

## Deployment smoke checks
- [ ] The deployment URL loads over HTTPS.
- [ ] Direct refresh on the app route does not return a 404.
- [ ] Browser console has no uncaught errors or failed required assets.
- [ ] The deployed commit SHA matches the reviewed commit.
- [ ] Environment variables and credentials are configured in the hosting provider, not committed.
- [ ] Demo-only data and limitations are documented for reviewers.

## Evidence
Record date, branch/commit SHA, tester, build output, deployment URL, failed items, and screenshots/video link in the pull request or project handoff notes.
