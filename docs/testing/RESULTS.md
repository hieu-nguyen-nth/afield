# Afield — test results

## Current feature boundaries and architecture — October 31, 2026

Feature-owned models, UI, API handlers/services and unit tests now live together. Authentication has explicit identity/credential contracts, a verified-session guard, admission rules, handlers and its own tests. Framework routes and the workspace compose the features; the shared auth/origin/rate checks still run before product handlers. No SQL migration or remote auth setting changed.

| Check | Result | Evidence |
|---|---|---|
| TypeScript | Pass | [Output](current/features-check.log) |
| ESLint | Pass, no warnings | [Output](current/features-lint.log) |
| Unit tests | 44 tests in 14 files passed | [Output](current/features-unit.log); includes four new verified-session/revocation cases |
| Disposable database | 47 assertions plus both source-setting scenarios passed | [Output](current/features-db.log) |
| Production build | Pass | [Output](current/features-build.log) |
| Complete browser suite | All 21 cases passed | [Output](current/features-browser.log) |
| Schema generation | 21 app tables from all five migrations | [Output](current/features-schema.log); local catalogs, no provider connection or data rows |
| Repository/docs | Pass | [Output](current/features-repository.log) |

The [source inventory](current/SOURCE-SHA256.txt) identifies the current feature layout. The generated [schema reference](../technical/DATABASE-SCHEMA.md) and [JSON model](../technical/schema.json) capture columns, constraints, indexes, RLS policies and role grants; CI regenerates them and checks for drift. The remaining live-service acceptance gates below still apply. This work is on a feature branch and pull request, not automatically merged to main.

## Earlier workspace-layout verification

The application, app-specific configuration, tests, scripts and database migrations now live in `apps/web/`. Root npm commands forward to that workspace; the root lockfile remains authoritative. Policies/templates are in `.github/`, current documentation is in `docs/`, and shared validation is in `tooling/`.

| Check | Result | Evidence |
|---|---|---|
| Root command forwarding / TypeScript | Pass | [Output](current/structure-check.log) |
| ESLint | Pass, no warnings | [Output](current/structure-lint.log) |
| Unit tests | 40 passed in 13 files | [Output](current/structure-unit.log) |
| Disposable PostgreSQL | 47 assertions and both source-setting scenarios passed | [Output](current/structure-db.log) |
| Clean production build | Pass | [Output](current/structure-build.log) |
| Complete browser suite | All 21 cases passed in one run | [Output](current/structure-browser.log) |
| Repository and documentation | Pass | [Output](current/structure-repository.log) |

The old generated build cache needed a clean rebuild after the directory move; it was retained outside the repository. Readiness verification confirmed that private app settings load from the new app folder without exposing values. The local worker/readiness commands use Node's TypeScript loader directly. Browser checks used an isolated production server with dummy settings and no worker or live-provider calls. Hosting root-directory requirements are documented; no hosted project was changed.

The [source inventory](current/SOURCE-SHA256.txt) identifies the current workspace paths. The sections below retain the initial publication evidence and its narrower test-run boundaries. Live-service acceptance remains outstanding as described below.

## Initial publication evidence

Date: October 31, 2026 (America/Los_Angeles). Environment: macOS, Node.js 26.8.1, npm, local production Next.js server, installed Google Chrome. Scope: the organized current implementation and documentation; [source SHA-256 inventory](current/SOURCE-SHA256.txt) identifies tested code/configuration. No cloud database, live model, search or speech call was needed for this regression run.

| Check | Result | Evidence / boundary |
|---|---|---|
| TypeScript | Pass | [Output](current/typecheck.log); domain/model/import refactor and test source compile |
| ESLint | Pass | [Output](current/lint.log); no remaining warning |
| Vitest | 40 tests, 13 files passed | [Output](current/unit.log); mocked provider/network boundaries |
| Disposable PostgreSQL | 47 assertions + both source-setting scenarios passed | [Output](current/database.log); all five migrations, synthetic owners/roles, no remote records |
| Production build | Pass | [Output](current/build.log); built with dummy public config and live generation disabled |
| Browser regression | 20 existing cases passed | [Full-suite output](current/browser.log); real local HTTP security checks, fixture-backed authenticated UI |
| New illustrated journey | 1 case passed after test-selector corrections | [Final output](current/walkthrough.log); both journeys, explicit source/audio consent and 17 screenshots |
| Repository hygiene | Pass | [Output](current/repository.log); ignore rules, likely credential patterns and local documentation links |

The initial full browser run passed all 20 existing cases but the new walkthrough stopped on an overly strict account-button selector. Its corrected case passed in a focused rerun. Other walkthrough development corrections concerned button names and expected pending text; no product failure was hidden or changed into fabricated success. There are **21 distinct passing browser cases**, not 21 cases from one uninterrupted final run. The earlier failed log is retained so the result is reviewable.

Database tests initially encountered a local process restriction in the `tsx` CLI wrapper. The package script now invokes Node with the same TypeScript loader directly; both disposable suites pass without that wrapper. The local browser server required permission to bind a loopback port. Neither issue required using production services.

Screenshots are synthetic and contain no real account history, private topic content, signed media or provider credentials. Representative composer, brief/coverage, activation, topic-controls and mobile screens were visually inspected; the automated journey verifies the remaining state transitions and narrow-viewport fit. The older raw development captures are excluded from publication rather than presented as current results.

## What remains unverified

Fresh live Google/email sign-in and recovery; current real brief quality/omissions; requested real TTS/transcription/duration/cache lifecycle; schedule execution and worker recovery; completed export/deletion/media backup; and hosted web/worker operation. Earlier local sessions recorded bounded connection checks and one text brief, but this repository release does not claim a new all-provider acceptance pass. Known implementation alignment gaps remain in [current status](../product/CHANGELOG.md).

The [first GitHub Linux run](https://github.com/hieu-nguyen-nth/afield/actions/runs/41271965904) passed every step, including the complete browser suite. It reported old action-runtime deprecation and an impending runner-image migration. The workflow was then refreshed to the current official v7 actions using immutable commit references and pinned Ubuntu 24.04; inspect the [Actions page](https://github.com/hieu-nguyen-nth/afield/actions) for that final workflow run. No hosted runtime deployment is implied by source publication.
