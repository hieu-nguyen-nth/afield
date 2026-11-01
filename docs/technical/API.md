# HTTP API map

The implementation is authoritative: [application routes](../../apps/web/src/app/api/v1/[...path]/route.ts) and [authentication routes](../../apps/web/src/app/api/auth/[action]/route.ts). JSON request contracts are defined in [domain models](../../apps/web/src/domain). All private application operations require an admitted verified session. Mutations require the configured same origin and bounded JSON bodies. Owner IDs come from the session, never client input. Responses containing private data are not publicly cached.

| Method / path | Purpose |
|---|---|
| `GET /api/v1/me` | Account, shared usage/reset times, provider capabilities |
| `GET /api/v1/topics`, `GET /api/v1/topics/:id` | Owned topics/config |
| `POST /api/v1/topics`, `PATCH /api/v1/topics/:id` | Save validated draft/config |
| `POST /api/v1/topics/from-exploration` | Create a topic draft from a saved exploration |
| `POST /api/v1/topics/:id/activate`, `/pause`, `/resume` | Confirm scheduling state and prerequisites |
| `POST /api/v1/topics/:id/updates` | Queue a manual Update with optional one-off coverage |
| `POST /api/v1/explorations/prepare` | Resolve/validate an Explore request before confirmation |
| `POST /api/v1/explorations` | Accept an idempotent Explore run |
| `GET /api/v1/runs`, `GET /api/v1/runs/:id` | Owned run status/events and allowed retry details |
| `POST /api/v1/runs/:id/retry` | Retry eligible work while retaining run identity |
| `GET /api/v1/briefs`, `GET /api/v1/briefs/:id` | Filtered/cursor history or immutable brief detail |
| `POST /api/v1/briefs/:id/review` | Save usefulness/feedback |
| `POST /api/v1/briefs/:id/audio/generate` | Explicitly request narration / reuse pending or cached media |
| `GET /api/v1/briefs/:id/audio` | Authorized short-lived selected-audio access |
| `POST /api/v1/sources/check` | Check selected reading/search scope and accessibility |
| `POST /api/v1/assist/subtopics`, `/assist/sources` | User-requested assistance; no automatic source approval |
| `GET /api/v1/export` | Owned JSON export, not a media archive |
| `POST /api/v1/account/delete` | Request deletion, immediately revoke admission; cleanup follows |

Authentication uses `/api/auth/:action` for `login`, `signup`, `reset`, `password`, `logout`, `google` and `callback`. Verify the route implementation before writing a client; provider redirects and email confirmation have separate rules.

Example Explore input (prepare uses the same schema; acceptance sends the same JSON plus an Idempotency-Key header):

```json
{"prompt":"Explain enterprise AI evaluation practices","preferences":"Public sources only","depth":"working","limit":{"type":"words","value":400},"sourceMode":"sources_only","sources":[{"url":"https://example.org/report","scope":"page"}],"sourceIds":[],"resolvedConflict":false}
```

The server bounds input length, direct/saved sources, templates and output limits. Web-only omits configured/direct sources; sources-only never silently expands outside selected scopes. Errors use an `error` envelope with code/message/retryability as applicable. Common codes include `validation_failed`, `not_authorized`, `configuration_invalid`, `quota_exceeded`, `idempotency_conflict`, `provider_unavailable`, `retrieval_failed`, `generation_failed`, `budget_not_met` and `stale_lease`. HTTP status reflects validation, origin/session denial, conflict, rate/usage limits or provider failure; use the returned error instead of treating all 503s as missing access. Retries must preserve identity unless the user changes the request.

Internal RPC and worker commands are not public browser APIs. SQL restricts their execution separately from reader endpoints; see [schema](DATA-MODELS.md).
