# Product features

Each feature owns its models, server behavior, reader UI and local unit tests where applicable. HTTP route files are framework adapters; `components/workspace.tsx` composes screens. Shared UI and HTTP helpers live in `src/shared`; provider/database/cookie/network adapters live in `src/infrastructure`.

| Feature | Responsibility | Start here |
|---|---|---|
| [auth](auth) | Sign-in, OAuth, credentials contracts, verified sessions and admission | [Models](auth/models.ts), [handlers](auth/handlers.ts), [guard](auth/session.ts), [tests](auth/__tests__) |
| [account](account) | Usage/account summary, export/deletion and privacy screens | [Models](account/models.ts), [API](account/api), [UI](account/ui) |
| [explore](explore) | One-off question inputs, preparation and acceptance | [Models](explore/models.ts), [API](explore/api), [UI](explore/ui) |
| [topics](topics) | Topic/source/template configuration and recurring setup | [Models](topics/models.ts), [API](topics/api), [UI](topics/ui), [tests](topics/__tests__) |
| [research](research) | Source methods/recommendations, retrieval and evidence | [Models](research/models.ts), [API](research/api), [tests](research/__tests__) |
| [generation](generation) | Leased text generation, validation, publication and run status | [Models](generation/models.ts), [pipeline](generation/pipeline.ts), [API](generation/api), [tests](generation/__tests__) |
| [briefs](briefs) | Saved text/citations, review, reading cards and detail | [Models](briefs/models.ts), [API](briefs/api), [UI](briefs/ui) |
| [history](history) | Calendar/topic/date navigation over saved briefs | [UI](history/ui); reuses brief models and queries |
| [audio](audio) | Explicit narration jobs, transcript/duration verification and cache use | [Service](audio/service.ts), [tools](audio/audio-tools.ts), [tests](audio/__tests__) |
| [scheduling](scheduling) | Named-timezone recurrence, dispatch and retention | [Schedule](scheduling/schedule.ts), [worker](scheduling/worker.ts) |

The shared output budget/depth contract is in [shared/contracts/output.ts](../shared/contracts/output.ts). SQL migrations remain together in [supabase/migrations](../../supabase/migrations) so the schema has one ordered history. Browser and database integration tests stay in [tests](../../tests); feature unit tests are colocated in `__tests__`.

[Product architecture](../../../../docs/technical/PRODUCT-ARCHITECTURE.md) · [System design](../../../../docs/technical/ARCHITECTURE.md) · [Models and schema](../../../../docs/technical/DATA-MODELS.md) · [Authentication](../../../../docs/technical/AUTHENTICATION.md).
