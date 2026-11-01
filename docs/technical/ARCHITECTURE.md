# System architecture

Afield is a Next.js web application plus an independently running job worker, backed by Supabase. Source publication to GitHub is separate from deploying the web runtime, database and worker.

```mermaid
flowchart LR
  Reader[Reader browser] --> Web[Next.js pages and API]
  Web --> Auth[Supabase Auth]
  Web --> DB[(Supabase Postgres)]
  DB --> Queue[Outbox and leased jobs]
  Queue --> Worker[Local worker or Trigger.dev]
  Worker --> Retrieval[Guarded URL / feed retrieval]
  Worker --> Search[Tavily optional search]
  Worker --> AI[Gemini composition and review]
  Worker --> DB
  Worker --> Speech[Explicitly requested speech and transcription]
  Speech --> Media[Private Supabase Storage]
  Web --> Media
```

## Code boundaries

| Location | Responsibility |
|---|---|
| `src/app` | Next.js pages and route adapters; authenticate, validate origin/body, invoke database/features |
| `src/components` | Reader workspace and reusable input/progress/source controls |
| `src/domain` | Zod inputs, topic/template/schedule contracts, evidence, run and brief models; no provider clients |
| `src/features/research` | Coverage routing, direct/feed/link/site retrieval, source and subtopic suggestions, evidence budgets |
| `src/features/generation` | Leased generation, grounding/review/publication and explicit audio retry orchestration |
| `src/features/audio` | Encoding, probing and transcript comparison helpers |
| `src/features/scheduling` | Named-timezone recurrence, queue polling, dispatch and cleanup |
| `src/infrastructure` | Supabase session/admin clients, admission, guarded network access and Gemini/Tavily adapters |
| `src/config`, `src/core` | Runtime settings, error envelope, hashes and common limits |
| `src/trigger`, `scripts` | Hosted task wrappers and local worker/readiness entry points |

## Request and generation lifecycle

1. Browser sends same-origin JSON. Server verifies the Supabase user, confirmed email and database admission; it derives ownership from the session.
2. Prepare validates the request, source mode and conflicting output limits. Acceptance stores an immutable input snapshot and idempotency key/hash in a run and durable outbox.
3. Worker claims a database lease. Retrieval produces source checks and evidence; safe fetch pins public DNS, blocks private/reserved destinations, rechecks redirects and bounds content/time.
4. Composition uses retrieved evidence and structured outputs. Citation identifiers, bounds and content are checked and reviewed before atomic publication. A failure remains a failed/partial state, rather than fabricated no-news content.
5. Published text remains stable. Audio starts only from an explicit action, using canonical text. The worker verifies transcript/duration and selects a matching private asset; same-owner matching text/profile can reuse verified media.
6. Schedules enqueue new runs using saved topic policy. Cleanup handles retention and requested deletion. Saved text stays readable when workers stop; new work waits.

## Security and operational boundaries

Browser roles use RLS and ownership predicates; privileged run/publication/cache functions require server credentials. `private.allowed_emails` is the sole admission list. Run drafts, lease tokens and private object paths are not reader-editable. Private audio receives short-lived signed access after ownership/hash checks. User data is not publicly cached; mutations enforce origin; React escapes text and a nonce CSP limits scripts.

Source content and model output are untrusted data. No provider secret is sent to source sites or exposed in `NEXT_PUBLIC_` variables. Live calls require explicit runtime switches and operator free-plan verification; those switches do not detect billing status. Shared usage reservations bound calls; provider dashboards remain authoritative for external usage. Text-model choices are explicit with no paid fallback.

Database SQL is authoritative for transactions/leases and privacy constraints. See [models](DATA-MODELS.md), [API](API.md), [deployment](DEPLOYMENT.md) and [known gaps](../product/CHANGELOG.md). Domain-folder separation is a refactor, not a claim that the existing workspace component or API route has been decomposed into a complete service architecture.
