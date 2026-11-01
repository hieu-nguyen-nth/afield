# Test cases and reproduction

Tests deliberately separate deterministic regression checks from real-service acceptance. Unit tests are colocated under `src/**/__tests__` and mock network/provider boundaries. Database cases run all migrations in disposable PGlite PostgreSQL with synthetic users/roles. Browser cases use the real production UI with explicit API fixtures; guest/origin/CSP cases exercise the real local HTTP server. The isolated browser server uses dummy environment and never starts a worker.

| Case group | Source | Assertions / expected behavior |
|---|---|---|
| Core/model contracts | `core`, `models`, `provider-schema`, `providers` unit tests | Budgets, safe URL/IP rules, supported model selection, schema simplification and provider error envelopes |
| Identity/access | `auth`, `access` unit tests; browser auth/app | Admission checks, OAuth error/callback handling, actionable messages, guest denial, cross-origin denial, nonce CSP |
| Research routing | `source-mode`, `site-search`, `research-links` unit tests | Selected/wider/search-only scope, restricted domain and redirects, bounded linked pages, no fabricated fallback |
| Source/subtopic quality | `source-recommendations`, `subtopics` unit tests; browser cases | Checked publisher evidence, weak candidate rejection, optional context, retained chip selections and accessible guidance |
| Publication/audio | `pipeline`, `audio` tests; `database.ts` | Text first, evidence/lease/idempotency bounds, explicit audio, deduplication, private matching cache and cleanup |
| Persistence | `database.ts`, `source-mode-db.ts` | All five migrations; owner separation, service-only operations, immutable publication, deletion/admission and mixed source snapshots |
| Reader flows | `apps/web/tests/browser` | Explore modes/confirmation, topic source/template review, retry/progress, original request/revision, history/account and desktop/mobile fit |
| Walkthrough | `walkthrough.spec.ts` | Both main journeys through current rendered UI; source approval, request confirmation, saved brief/history and opt-in narration capture |
| Auth guard | `src/features/auth/__tests__/session.test.ts` | Reject invalid/unverified identities, revoked admission/deletion and accept only an admitted verified owner |
| Schema reference | `scripts/export-schema.ts` with disposable database fixture | Generate all current app tables/columns/constraints/indexes/policies/grants; CI rejects drift |
| Repository | `tooling/verify-repository.mjs` | No excluded/private files staged; likely credential scan; local Markdown targets resolve |

```sh
npm run check
npm run lint
npm test
npm run test:db
npm run build
npx playwright install chromium
npm run test:e2e
npm run verify:repo
```

Run all commands from the repository root; npm forwards application commands into `apps/web`. Browser artifacts stay in `apps/web/test-results`, while curated walkthrough images stay in `docs/walkthrough/images`.

Browser tests start an isolated production app on port 3100, with a placeholder Supabase URL/key and live generation disabled. Never attach the suite to a real customer deployment. Walkthrough images use synthetic data and may be regenerated with `npm run docs:screenshots`. Screenshots/logs from superseded local development are excluded. Current logs and source checksums live in [results](RESULTS.md).

## Live acceptance cases — outstanding

Fresh Google and email/password/confirmation/recovery sign-in; one useful cited Explore result and a recurring Update reviewed for omissions/novelty; explicit real TTS/transcript/time validation and private cache reuse; scheduled execution and worker recovery; export/media backup and completed deletion; hosted web/worker auth/origin/media checks. Record exact date, environment, outcome and limitations, with redacted evidence. Do not substitute browser fixtures for these checks or trigger repeated paid/provider calls just to make the suite pass.
