# AI Pathway

AI Pathway helps Vietnamese high-school students and parents explore universities, majors, admission methods, tuition, and application pathways across Vietnam.

## Current status

The current frontend is a UI/demo prototype. Its sample university/program records are simulated examples and are **not official admissions data**. Do not use demo recommendations as an admission prediction.

## Requirements

- Node.js compatible with the Vite version in this repository
- npm

## Run locally

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Vite prints the local URL. In GitHub Codespaces, open the forwarded port shown by Codespaces.

## Build and preview

```bash
npm run build
npm run preview -- --host 0.0.0.0
```

The current `build` script runs TypeScript project checks followed by a Vite production build. The repository currently has no dedicated lint, unit-test, or automated E2E script; do not assume those checks have run.

## Project contract and QA

- [Technical contract](docs/TECHNICAL_CONTRACT.md): shared data schema, invariants, service boundary, and recommendation rules.
- [QA / E2E checklist](docs/QA_CHECKLIST.md): manual end-to-end and deployment smoke checks.

Shared TypeScript data contracts are defined in `src/types/index.ts`. Keep those types as the source of truth and coordinate schema changes with the team.

## Scope and data quality

The product scope is nationwide and covers all major groups. Any narrow selection of fields or majors in the demo is illustrative, not the complete product scope. For real admissions records, keep official source URLs, applicable years, verification dates, and status. Use `simulated` for mock data, `needs_review` for unverified/incomplete records, and `verified` only after checking the source.

## Deployment

Deploy only after `npm run build` passes and the QA checklist is reviewed. Configure secrets and environment variables in the hosting provider. Keep the deployment URL and reviewed commit SHA in the project handoff.
