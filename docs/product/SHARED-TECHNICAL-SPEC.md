# Afield — Shared Technical Specification

Version: 0.5 · Status: Draft · Updated: October 31, 2026

[Master PRD](MASTER-PRD.md) · [Explore PRD](EXPLORE-PRD.md) · [Stay Updated PRD](STAY-UPDATED-PRD.md)

## 1. Responsibilities and contracts

This specification supports two generation intents: `explore` for an ad hoc request and `update` for a followed topic. They share identity, evidence, budget enforcement, publication, audio and history; they differ in setup, research selection, coverage and scheduling.

| ID | Shared requirement |
|---|---|
| SH-01 | Authenticated identity, persistence, and complete user-level isolation |
| SH-02 | Validated requests, durable run state, consistent errors and configuration snapshots |
| SH-03 | Source checks, retrieved evidence, provenance, topic-specific suitability and coverage outcomes |
| SH-04 | One output limit, depth/structure controls, and budget verification |
| SH-05 | Canonical text/audio equivalence, media storage, publication and audio recovery |
| SH-06 | Immutable content, global/mode/topic history and explicit Explore-to-topic handoff |
| SH-07 | Idempotent execution, scheduling, concurrency, retries and coverage integrity |
| SH-08 | Security, privacy, availability bounds and cost/resource controls |
| SH-09 | Observable performance/quality outcomes and end-to-end verification |

## 2. Identity and ownership — SH-01

Use Supabase Auth for email/password and Google OAuth, persistent sessions, logout and recovery/verification. Admission is invite-only through the single `private.allowed_emails` table; no local duplicate list or user-editable JWT metadata is an access authority. Check database admission without caching before email authentication and after OAuth callbacks, and enforce it in data/worker operations so revocation applies to existing sessions. Never merge accounts solely from an unverified matching email.

Account access errors, OAuth cancellation/callback failures, provider throttling and missing configuration require accurate actionable messages. Account navigation opens Account & usage; privacy settings are separate and Sign out has its own labeled action. Key/setup instructions belong to operator documentation, not ordinary user settings.

Derive the owner from the authenticated session; do not accept it as client authority. Topics, runs and briefs carry direct ownership. Evidence and media inherit access through their run/brief. Enforce same-owner relationships in database constraints/access policies and server authorization, including background execution and signed media delivery. RLS and admitted ownership protect browser reads; execution/draft state, cache internals and worker claims are service-only. Account commands use narrowly granted admitted/owned SQL interfaces, not unrestricted browser writes.

Explore requires authentication and persistence but no Topic. Update requires an owned Topic. Global history must return standalone explorations even when a user has no recurring topics. Internal quality-review access requires explicit authorized ownership/admin access; public source origin does not make a user's research history public.

## 3. Request, API and error contracts — SH-02

| Capability | Logical endpoint / contract |
|---|---|
| Explore | `POST /explorations`: prompt, depth/preferences, output limit, sourceMode, ad hoc URL/method pairs, owned approved saved source IDs, idempotency key; returns run ID |
| Topic setup | Create/read/edit drafts; optional subtopic suggestions, manual source checks, screened publication discovery and approval, templates/copy/activate, schedule settings |
| Topic handoff | Create a draft from an owned Explore brief; copy subject/preferences and recommended-source candidates; no schedule/approval side effects |
| Topic lifecycle | Activate/pause/resume an owned valid topic |
| Update | `POST /topics/{id}/updates`: deliberate manual request/key and optional sourceMode override; server snapshots owned settings without mutating them |
| Progress | Owned run/status and timestamped RunEvents; attempt elapsed/estimated timing, delay guidance, sanitized activity download and published result identity |
| History/detail | `GET /briefs` with date range, intent and optional topic filters; `GET /briefs/{id}` |
| Audio | Explicit Generate audio for an owned brief, deduplicated AudioJob/private cache, selected-asset access and explicit retry |
| Account/privacy | Shared usage/resets plus owned request attempts; data export, audio download and deletion status; operator setup remains separate |

Explore server-side invariants: `intent=explore`, `trigger=manual`, `topic_id=null`. Update: `intent=update`, required owned `topic_id`, manual or scheduled trigger. Manual updates require a confirmed active/paused topic with valid configuration; draft topics cannot generate before confirmation. Explore never reaches the scheduler or topic-approval prerequisite. Topic-scoped routes cannot change request intent through payload manipulation.

Snapshot request/settings when accepting the run: raw input, interpreted focus/profile, intent, limit, depth, structure/template version, effective sourceMode and resolved per-URL methods, source approval/policy, narration profile, coverage/as-of context, execution-limit version, and accepted/effective model configuration for audit. Later edits do not modify that snapshot. Date listings are paginated with stable generation-time/ID ordering; display-date filters resolve to UTC intervals using the selected display timezone.

Preserve owner-scoped stage events and separate attempts from accepted request identity. Stop polling terminal states, re-query lists after publication/retry, and bound read loading. Expected-duration/countdown guidance must be labeled provisional, with overrun/stale-worker messages; it is not a fixed completion promise. Classify temporary provider high demand, schema rejection, missing configuration, provider quota, read throttling and app reservation limits accurately rather than showing one generic access/allowance error.

Return structured errors with code, user-readable reason, retryability, and field/stage where applicable: `validation_failed`, `not_authorized`, `configuration_invalid`, `quota_exceeded`, `retrieval_failed`, `insufficient_evidence`, `generation_failed`, `evidence_validation_failed`, `audio_failed`, `budget_not_met`. Do not expose secrets or another user's existence/content through errors.

## 4. Output limits and composition — SH-04

Each request has exactly one discriminated limit:

| Limit type | Contract |
|---|---|
| `words` | Short ≤400, Standard ≤800 (default), Extended ≤1,400 words of canonical prose, excluding reference lists. Store the resolved numerical ceiling. |
| `duration` | 60–900 seconds in whole-minute increments (1–15 minutes), shown before submission. Measure at the configured voice's normal 1× speed. |

Time selection replaces the word preset as the user's limit; composition derives a conservative internal word allowance from calibrated speech rates. Internal allowances must not appear as a second conflicting user constraint. Surface contradictory limits in natural-language input/preferences for resolution before queueing; persist the resolved control as the execution limit. Quick overview, Working knowledge (default), and Deep dive change explanation detail within the chosen limit. Update depth comes from the topic; Explore depth comes from its request. Update limits/tone belong to the selected template; Explore uses request settings and a built-in layout version.

Explore prompt is 1–4,000 characters, optional preferences up to 2,000, URL up to 2,000. The combined ad hoc/resolved source cap is five. Topic setup allows up to 20 subtopics, 10 saved source rows with at most five approved, and 10 templates. Server/database acceptance must preserve these limits and ownership checks.

Limits are maxima, not targets. Do not pad low-signal/short results. Preserve essential substance and evidence while reducing scope to fit. Validate displayed limits and configured input/time maxima before queueing. Decline unsupported values with visible bounds; do not silently change them. Playback speed changes consumption speed, not budget compliance.

## 5. Canonical content, timing and media — SH-05

Canonical text, structured blocks/items and citations are generated/validated together. Audio preserves substantive content, order and depth; speech formatting may omit raw URLs/citation markers and adapt pronunciation. It cannot introduce claims or become a separate summary. Hash the canonical text and bind audio attempts to that hash and voice configuration.

| Request | Publication behavior |
|---|---|
| Word-limited | Validate evidence and word ceiling; publish text with audio `not_requested`. |
| Time-limited | Publish validated text with estimated duration and budget `unverified`; do not synthesize automatically. |
| Explicit Generate audio | Reuse an active job or private matching verified asset, otherwise narrate frozen text, check equivalence and measure at 1×. Select only compliant audio. |
| Audio failure / over limit | Preserve text and report the reason. Retry requires an explicit action; a shorter script requires a deliberately new brief. |

Audio is optional. States are `not_requested`, `processing` (including an accepted queued job), `ready`, or `failed`; `pending` is retained only for compatibility. Viewing, polling, scheduling and text acceptance never authorize speech. Budget is `met`, `unverified`, or `not_met`: word-mode `met` verifies words, while listening-time `met` requires measured compliant audio. Track text completion separately from requested-audio completion.

Published canonical text, blocks and citations are immutable. Bind media to owner/run/hash and a versioned narration profile (provider/model/voice/encoding/equivalence policy). After explicit approval, the same owner may reuse matching verified media across briefs through owned metadata references; never share private caches across accounts. Repeated clicks share an active job. Check cache again after worker recovery before another provider call. Storage cleanup must preserve shared objects until their final reference is removed and protect selected media. Do not release physical storage quota for removing one alias. Provider acceptance followed by a crash can prevent exactly-once remote billing; recovery remains bounded and user-visible.

Narration verification measures encoded audio duration and compares a separate transcription with the frozen script; material omissions/additions, names, amounts, dates, negations and order must agree. Check any time ceiling at normal 1× playback. Do not auto-synthesize during text generation or run an automatic shortening/TTS loop. A known incompatible cached duration is not a reason to repeatedly synthesize the same script.

Provide play/pause, seek, speed, measured duration and private expiring playback access. Audio retries never rewrite saved text. If exact saved text cannot meet a listening limit, offer an explicit new shorter request.

## 6. Source coverage, retrieval methods and evidence — SH-03

Coverage controls whether research can expand beyond supplied sources. A per-source method controls how to retrieve within each supplied source. Persist both; they are not interchangeable settings.

| sourceMode | User choice | Routing |
|---|---|---|
| `sources_only` | Use my sources only | Resolve only accepted ad hoc/owned approved scopes. No wider-web search. Explicit `search` sources still call Tavily within their selected domain. |
| `sources_and_web` | My sources + research | Retrieve supplied scopes and independently discover wider public evidence. |
| `web_only` | Search only | Ignore supplied/saved source values for this run, retain the UI list for switching back, and discover public evidence. |

Explore defaults to sources-only and requires at least one valid input scope in that mode; question-without-URLs research uses an explicit web mode and search connection. Resolve saved IDs against the authenticated owner's current approved sources and enforce the combined five-source limit. A manual Update override affects only the accepted run; scheduled mode derives from the saved approved-only/approved-plus-discovery policy. Snapshot accepted modes/scopes, not subsequent settings.

| scope | UI behavior | Search dependency / boundary |
|---|---|---|
| `page` | Read this exact page | Direct safe fetch of the submitted page; no linked-article traversal or Tavily |
| `feed` | Read feed articles | Parse real RSS/Atom and safely read bounded public entries; no Tavily or guessed feed URL |
| `site` | Follow linked pages | Read seed and up to three topic-ranked public links within the approved origin/section boundary; no Tavily, no promise of searching the archive |
| `search` | Search within this site | One basic Tavily query restricted to the entered URL's domain, even if it is an article URL; deduplicate/filter results and directly read up to five relevant pages, enforcing exact-origin/redirect boundaries |

Search scope searches the domain, not only the entered article/path. Filter foreign origins/redirects and homepage/listing/authentication results. Search excerpts can identify candidates but never substitute for a successful article fetch. Missing search setup, quota failure, unreadable pages and empty indexed results must be visible; no silent expansion, automatic scope change or paid fallback. Sources-only is search-free only when no selected source uses `search`. A manual Check source action fetches its URL directly and does not run domain search or approve it.

Automatic recurring recommendations use checked publisher identity and substantive topic coverage, not title/search rank alone. Search institutional/research and independent specialist-reading channels; inspect up to 10 distinct publishers with bounded safe retrieval. Require eligible publisher kind (independent publication, university, public institution or research nonprofit), valid candidate index and a verbatim quote from the checked publisher text. Reject sales/demo/trial funnels, vendor/consulting/course/marketing sources, trade associations, sponsored/SEO farms, social posts, duplicate candidates, fabricated quotes and unknown identities. Return up to five publication roots as unapproved `search` sources with individual relevance reasons; fewer/none is acceptable. This filter applies to automatic recommendations, not a blanket prohibition on explicit user-supplied evidence. Existing lists are not silently rewritten. Persisted recommendation records currently contain name/URL/rationale/scope; durable publisher-kind/quote audit metadata is a remaining alignment item in the version record.

Persist SourceChecks for scope/query/time, success/empty/blocked/failed outcome, fetched count and reason; retain them even for successful empty feeds. Normalize actual fetched documents with canonical URL/title/publisher, publication/retrieval dates, hashes and retained passages. Results must distinguish selected scope, checked/retrieved evidence and actual cited evidence, and explain material unused-source/narrow-evidence limitations without forcing irrelevant citations.

Explore answers the prompt at its selected depth, including supported reasoning/options/tradeoffs where requested; it must not merely summarize a source or be forced into a recent-news window. Update groups events, compares prior Update coverage and explains meaningful changes; Explore never advances that coverage. Syndication/model confidence/popularity do not establish independent authority.

| Outcome | Explore | Update |
|---|---|---|
| Sufficient relevant evidence | Answer with linked support | Select meaningful developments with support |
| Successful checks, no new developments | Established evidence can still answer the request | Publish short no-news result reflecting checked coverage |
| Evidence cannot support the requested answer | Insufficient evidence, not invented explanation | Fail rather than present unsupported coverage |
| Partial checks | Continue only if sufficient; disclose limits | Disclose partial coverage, including no-news results |
| No relevant source can be checked | Retrieval failure | Retrieval failure, not proof of no news |

An empty document list is not automatically a failed check. Access restrictions remain in force. Evidence/ref checks and independent synthesis review supplement source selection; publisher screening alone cannot guarantee correctness or full coverage.

## 7. Shared pipeline and state — SH-02/SH-07

1. Validate authorization, input/configuration and quota; accept or return an actionable error.
2. Create/reuse the run key and immutable input snapshot; claim applicable execution lock.
3. Retrieve and persist checks/documents/evidence; calculate coverage and mode-specific viability.
4. Select evidence: answer fit for Explore; event grouping/novelty/significance for Update.
5. Compose canonical draft/blocks/items/citations within depth, structure and budget.
6. Validate evidence support/references, dates, mode rules, limits, and representation consistency. Repair within configured bounds or fail.
7. Publish validated text atomically with its content/evidence links, audio not requested and listening-time verification deferred.
8. Finish text generation without creating an audio job. A separate explicit owned audio request reuses/cache-checks/queues narration; keep its state and errors independent.

Run state is `queued → running → completed|failed`; queued scheduled Update work becomes `skipped` if the topic is no longer eligible when claimed. Skipped/failed runs publish no Brief or coverage advance. Completed runs may have text-only audio failure, no-news, or partial coverage; these are separate result attributes. A terminal failure records stage, reason and retryability. Reload/read operations never generate implicitly.

Same owner/intent/idempotency key identifies one accepted request. Repeated network requests return that run. A new intentional request uses a new key even for identical prompts. Stage retries cannot publish duplicate Briefs. Same key plus changed input is an idempotency conflict; edited/revised requests must get a new key. Serialize Update comparison/publication per topic; the personal test profile also serializes active text/audio work with fenced database leases and bounded recovery. Snapshots remain stable across retries. Reuse retained evidence/drafts within a recovered run, but a new question/coverage period performs fresh research; audio caching never substitutes old news for a new update.

## 8. Recurring scheduling — SH-07

Only Update Topics have Schedules. Use daily/weekly cadence, local time, optional weekday and IANA timezone. Schedule keys identify topic and intended local occurrence so a repeated daylight-saving slot executes once. Nonexistent local times use the next valid local time. Missed work becomes one bounded catch-up request. Recompute the next occurrence on schedule edits/resume; manual generation leaves it unchanged.

Eligibility at claim requires active topic and valid source/template configuration. Paused queued work is skipped; running work finishes its accepted snapshot. Disabling the last approved source pauses recurrence with a reason; correction does not silently resume it. Explicit resume revalidates and schedules a future occurrence.

Initial updates use the trailing cadence window. Scheduled coverage thereafter starts at the latest successfully published scheduled coverage end; failed/skipped/manual/Explore runs never move this checkpoint. Manual Update runs use the rolling cadence window and compare prior updates for novelty. Bound long catch-up with configured lookback limits and disclose truncated/uncovered periods. Explore instead stores research-as-of and any timeframe implied/requested by its prompt; no forced update interval applies.

## 9. Logical data model and integrity

Topic/source/template settings and accepted source methods are persisted in JSON configuration/snapshots; adding `search` does not require a separate scope table. Execution events, audio jobs and shared admission/usage have their own protected records.

| Entity | Required fields / relationships |
|---|---|
| User | Auth-linked ID, email/name, display timezone, timestamps; provider-managed credentials/identities |
| Topic | ID, owner, name/description, raw preferences/interpreted profile, goal/depth, research policy, draft/active/paused status and pause reason, active template, optional originating Explore brief, timestamps |
| Subtopic | ID, topic, name, selected, AI/user origin, order |
| Schedule | ID, topic, cadence/weekday/local time/IANA timezone, next occurrence, enabled; checkpoint derived from published scheduled runs |
| Source | ID, topic, canonical URL/name/type, `page`/`feed`/`site`/`search` scope, related subtopics, suitability rationale/evidence URL or unknown, accessibility/check time, recommended/approved/disabled/removed status, AI/user origin |
| Template / TemplateBlock | Topic-owned ID/name, limit type/value, tone/version; blocks with type/enabled/order/settings. Copy creates independent records. |
| GenerationRun | ID, direct owner, intent, nullable topic, manual/scheduled trigger, request/occurrence key, intended occurrence, request/settings snapshot including sourceMode and resolved per-URL methods, research-as-of/optional timeframe or coverage interval, status/stage/attempts, private draft artifact/version, check summary, errors/usage/limits, timestamps |
| SourceCheck | ID, run, optional followed source, checked URL/query/scope, followed/discovered origin, checked time, success/empty/blocked/failed outcome, count/error |
| RetrievedDocument | ID, run/check, optional source, article URL/title/publisher, publication/retrieval dates, hash, retained evidence/passages, context role, suitability rationale/provenance or unknown status for discovered evidence |
| Brief | ID, direct owner, unique run, intent, nullable topic, title/prompt, generation/as-of/coverage metadata, immutable input/configuration snapshot, canonical text/hash/blocks, word count/estimated duration, requested limit, budget status, no-news/partial flags, nullable selected audio asset |
| BriefItem | ID, brief, block/category/order, explanation/headline/summary, why it matters/personal relevance, ranking rationale; optional Update event fingerprint/change summary |
| Citation | ID, brief/optional item, retrieved document/supporting location, optional source; immutable article title/URL/publisher/date snapshot |
| AudioAsset | ID, owner/run, canonical hash, narration profile/version key, attempt, private object path, duration/size/status/error, timestamps. Same-owner reuse creates owned metadata aliases referencing one protected stored object. |
| AudioJob | Service-only owner/brief approval work, queued/running/completed/failed state, attempts, lease/fencing fields; one active job per brief |
| RunEvent | Owner/run, stage/status, redacted error code and event time; supports progress/activity download independently of Update event history |
| UpdateEvent | Owner/topic/brief, event key and summary used for novelty/material-change comparison |
| Admission/usage | Private allowed-emails list plus shared metric/period usage reservations and limits; not browser-editable |

Explore run/brief has no Topic; Update requires an owned Topic. Brief intent/owner/topic must match its run. Topic-origin handoff references an owned Explore brief without changing it. Documents/checks/citations are scoped to the run; nullable Source links support discovery without creating followed sources.

Enforce one Brief per run and one active Schedule per topic. A selected AudioAsset metadata reference belongs to the same run/owner/hash and verified narration profile and meets the current budget; the private physical object may be shared only through same-owner matching cache aliases. Multiple private attempts are allowed, but only the selected published asset is playable. Derive displayed pending/failed audio state from the current hash-matching attempt even before a ready asset is selected. Persisted document origin `followed` denotes explicitly supplied/selected evidence, including ad hoc sources; it does not create a subscription. `discovered` denotes broader-web evidence. Same-topic template/source references cannot cross ownership. Store canonical prose and structured representations consistently in the publication transaction; dates are never unique identifiers.

Index owner/intent/generated time, topic/generated time, run status, scheduled occurrence keys, and event fingerprints used by Update comparison. Source removal preserves citation snapshots. Store timestamps in UTC; retain named local schedule timezones. Keep internal review findings keyed to source/run/brief/item, reviewer/time and defect type; customer-facing review tooling is not required.

## 10. History, lifecycle and handoff — SH-06

Global dashboard offers Explore and recurring Topics, latest results, generation state, next Update occurrences, and a calendar of all published briefs. Filter by intent; topic calendars show their Update briefs. Selecting a date lists every owned result, including multiple standalone explorations and topic updates. Account display timezone controls grouping only.

Show lead previews in compact result cards and refresh them from persisted completion state after retries. A saved detail exposes original prompt/context/depth/limit/mode, per-URL methods, source checks/counts/reasons and actual citations. Revise this exploration creates a prefilled new request with a new identity; it does not edit the old publication. Distinguish not-directly-cited scope checks from evidence actually used, especially for multi-page domains.

Text/items/citations/input snapshots are immutable after publication. Media readiness, selected matching audio and verified-budget status may change without changing the text. Deliberate new requests create new records. Failed/skipped runs remain inspectable as run status, not fabricated published briefs. Retention/account deletion is a separate lifecycle policy.

Explore-to-Update handoff creates a new topic draft, copies subject/relevant preferences and offers source candidates as recommendations. It never creates recurrence, approved sources, or a schedule without topic review/activation; the original exploration remains standalone in history.

## 11. Architecture, security and operational controls — SH-08

| Component | Responsibility |
|---|---|
| Web/API | Mode-specific forms, dashboards/history/detail/playback; server-side validation and authorization |
| Relational store | Ownership/integrity, snapshots/drafts, atomic publication, stable result/item IDs, status/date queries |
| Retrieval service | Public search, direct fetch/RSS, source suitability/provenance, coverage reporting |
| Durable execution | Manual/scheduled dispatch, snapshots, locks, idempotency, bounded stage retries |
| Generation/validation | Structured evidence selection/composition, mode-specific checks and budget repair |
| TTS/private storage | Normal-speed voice generation, measurement, hash-bound attempts, authorized playback and cleanup |

Current implementation: Next.js/TypeScript/React; Supabase Postgres/Auth/private Storage with SQL command boundaries and RLS; Gemini for structured text, narration and transcription; Tavily for explicit domain/wider searches and source recommendations; a database-backed local worker with an optional Trigger.dev adapter. Provider/model settings are operator configuration, not end-user key controls. Effective model choice and version must be auditable per attempt; model schema envelopes must remain compatible with the provider while full validation remains local.

The local worker processes accepted text, approved audio, schedules and cleanup while the host is awake/connected. A stopped worker leaves queued work pending and saved briefs readable when the web app is available. Trigger.dev/hosted execution and any Vercel deployment require separate operational acceptance; localhost is not an external test URL. No additional agent framework is required.

Keep secrets server-side. Treat retrieved pages and model output as untrusted data. Validate URLs/redirects and block internal/private-network requests. Use private media and authorized short-lived delivery. Enforce per-account/run document, prompt, output, duration, concurrency, token/cost and retry limits; show supported bounds before requests and disclose constrained coverage. Do not silently weaken grounding or exceed a user time limit to satisfy an operating quota.

The personal test profile permits no new service spending, paid fallback, automatic plan/quota increases or usage-reset workarounds. Operator live/free-tier flags are attestations, not detection of provider billing status. Use public topics and non-confidential preferences in this profile; provider data-processing terms must be reviewed before sensitive use.

Account & usage shows the app-shared 30/month and 3/day brief reservations, remaining amount, UTC accounting period and resets in the user timezone, plus the user’s request/attempt history. A newly accepted request reserves a slot even if it later fails; retrying that same request reuses the slot. New revisions consume new slots. Read throttles and provider text/search/audio limits are separate; this UI is not a bill or a complete provider-usage meter. Source recommendations use up to two search requests plus a model selection; domain search uses one search request per selected scope/run, so sources-only can still consume search allowance.

Separate Settings & privacy provides export and deletion. JSON export alone is not a full media backup; audio can be downloaded separately. Deletion immediately denies admission; worker cleanup completion must be reported separately, never claimed while pending. Retain published briefs, selected audio and cited passages until account deletion; expire unused evidence after 30 days, redacted operational events after 14 days and unselected media after 24 hours. Object cleanup releases storage only after the last alias reference is removed. Cleanup requires a running worker. Logs exclude credentials and unnecessary full private content; stale queues and bounded recovery remain observable.

## 12. Observability and verification — SH-09

Record intent, run/stage IDs, limit type/value, queue/stage/publication/audio timestamps, coverage outcomes, retries/errors, word count, estimated/measured duration, budget verification, and provider usage/cost where available. Minimal usage events include request accepted, text opened, audio started/progressed, historical result opened, recurring topic activated/paused, and settings changed. Keep telemetry ownership/retention explicit.

| Verification | Required scenario |
|---|---|
| Ownership | Two accounts attempt cross-owner topic/run/brief/evidence/audio access and handoff |
| Mode isolation | Explore succeeds without Topic/Schedule; scheduler processes only eligible Updates; no Explore checkpoint effects |
| Evidence | All three coverage modes; independently mixed page/search/feed/site methods; restricted queries/direct fetch and redirect boundaries; publisher evidence screening; supported/unsupported claims; empty/partial/blocked/quota outcomes |
| Budget/audio | Word and 1–15 minute bounds; no synthesis on text/view/schedule; explicit approval/failed retry, exact-profile same-owner cache, transcription/hash/duration verification, overrun without text rewriting, shared-object cleanup |
| Persistence/UI | Original inputs/source coverage, safe revision, saved activity and bounded polling, refresh after successful retry, same-day/timezone history, prospective edits, source removal, compact keyboard/mobile controls |
| Account | Single noncached database admission list, visible auth/OAuth errors, separate Sign out, shared reservations/local resets, retries versus new slots, export and pending/completed deletion |
| Reliability | Same-key retries, deliberate repeat requests, worker interruption, overlapping Update runs, pause-before-claim, DST and catch-up |
| Product quality | Independent source/answer-fit review for Explore; source/important-event/novelty review for Update; user value observations for both |

Each feature PRD adds its mode-specific acceptance criteria. Material grounding, authorization, budget-labeling and duplicate-publication defects block release. Quality review records evidence and corrections rather than relying only on model confidence.

## 13. Release gates and remaining decisions

| Area | Required resolution/acceptance |
|---|---|
| Real identity | Complete fresh admitted-user Google sign-in and email/recovery flows; callback fixtures and enabled settings alone do not prove them |
| Text quality | Evaluate complete Explore and recurring Update results for prompt fit, source attribution, omissions, novelty and truthful source coverage |
| Requested audio | Verify actual narration/transcription, duration, cache reuse, error recovery and cleanup with real providers under bounded consented tests |
| Scheduling/deployment | Verify real scheduled updates, host sleep/recovery, deletion/cleanup completion, and hosted workers/app access if selected |
| Source audit | Preserve screened publisher kind/quote beyond transient validation; align runtime Update query goal/subtopic/coverage hints; verify per-site retrieval versus cited-article reporting |
| Limits/operations | Monitor provider/account quotas, storage/egress and effective model versions; validate retention/export/restore and current service terms before wider access |

Current test evidence, limitations and the v0.5 change record are in [CHANGELOG.md](CHANGELOG.md). Requirements are release targets; a passing unit/fixture or bounded connection check is not evidence of complete live product acceptance. Later search/bookmarks, follow-ups, ingestion, notes/queues and calendar delivery require the extensions in the master roadmap.
