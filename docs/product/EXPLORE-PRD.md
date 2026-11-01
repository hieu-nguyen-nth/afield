# Afield — Explore PRD

Version: 0.5 · Status: Draft · Updated: October 31, 2026

[Master PRD](MASTER-PRD.md) · [Stay Updated PRD](STAY-UPDATED-PRD.md) · [Shared technical specification](SHARED-TECHNICAL-SPEC.md)

## 1. Purpose and goals

Afield Explore gives users a direct way to research an ad hoc topic/question and receive a source-backed text brief with optional user-requested audio sized to their chosen length or available listening time. Explore supports curiosity without requiring recurring-topic setup, source-list approval, or a schedule.

It serves G1/G3/G4 in the master PRD: explore with little setup, fit the user's context, and preserve verifiable results. Examples include “Explain how real-time payments work in 10 minutes” and “Give me a short overview of cybersecurity risk.” The response follows the actual request; it need not be an introductory overview if the user asks for a comparison or a deeper explanation.

## 2. Users and stories

| Story | Need | Requirements |
|---|---|---|
| ES-01 | As a curious user, I want to enter a topic/question and generate a result without subscribing to it | EX-01/EX-03 |
| ES-02 | As someone with limited time, I want to choose a length or listening-time ceiling and depth | EX-02 |
| ES-03 | As a reader, I want an understandable answer with source links and clear limitations | EX-03/EX-04 |
| ES-04 | As a listener, I want audio that conveys the same content as the text | EX-05 |
| ES-05 | As a returning user, I want to inspect original inputs/coverage and revise a copy without losing the saved answer | EX-06/EX-07/EX-10 |
| ES-06 | As someone who wants future updates, I want to begin recurring setup from the explored subject | EX-08 |
| ES-07 | As a researcher, I want to choose supplied sources versus wider research and control how each URL is read/searched | EX-03/EX-09 |
| ES-08 | As a waiting user, I want clear progress, saved activity and actionable failure/retry information | EX-07/EX-10 |

## 3. Scope

**MVP:** invited authenticated one-off requests; depth/preferences and length/time controls; direct/saved source selection, per-source reading/search controls and optional wider research; text-first output with optional approved/cached audio; durable progress, original-request/coverage inspection and revision; global history and explicit handoff to recurring setup.

Explore does not automatically create a followed Topic, Source list, or Schedule. Interactive follow-up chat, historical search, and bookmarks follow the master roadmap. Asking the same question again is allowed and creates a separate result when deliberately submitted as a new request.

## 4. Inputs and validation

| Input | Required/default | Validation and behavior |
|---|---|---|
| Topic/question | Required | 1–4,000 trimmed characters. Broad topics are valid; no mandatory onboarding interview. |
| Limit | Standard length preselected | One word preset (400/800/1,400) or 1–15 whole listening minutes. Duration remains estimated until requested audio is measured. |
| Depth | Working knowledge | Quick overview, Working knowledge, Deep dive; detail stays within the selected limit. |
| Preferences | Optional | Up to 2,000 characters of audience/perspective/focus; retain original wording and accepted interpretation. |
| Source coverage | `sources_only` | Use my sources only, My sources + research, or Search only. Shared SH-03 defines routing. Sources only requires a valid source; search-only requires no seed URL. |
| Supplied/saved sources | Optional except in sources-only mode | At most five total ad hoc URLs plus resolved approved source IDs. Each URL has its own exact-page/search/feed/linked-page method. Reject foreign/unavailable saved IDs. URLs ≤2,000 characters, safe public HTTP(S), no embedded credentials. |

Use compact mode tabs and a source-row list. Each row contains a single-line URL, its own reading-method control and remove action; + Add source creates/focuses a row immediately. Blank rows are excluded. Search only hides/excludes supplied sources; switching back restores the edited list. Changes to prompt/preferences/limit/source mode/rows create a new request identity; retrying an unchanged accepted request reuses its identity.

Show input/allowance bounds, source-method help and search availability before submission. Conflicting prompt/control limits require resolution. Sources-only forbids wider-web discovery, but an explicitly selected Search within this site method still requires Tavily. Exact pages, feeds and linked pages avoid search calls. A missing connection or quota is not permission to substitute another research mode.

## 5. User flow and interface

1. Open Explore; enter the topic/question, length/time and optional depth/context.
2. Choose source coverage. Add/select sources when needed and choose each URL’s reading/search method. Resolve input/configuration errors before submission.
3. Generate a persisted request. Show current stage, timestamped activity, attempt elapsed time, best-effort expected duration and delay/stale-worker guidance. Activity can be downloaded without secrets or private execution internals.
4. Retrieve under the accepted scopes, write an answer to the actual question, validate evidence/limits, and publish text. Audio is `not_requested`; time-limit status is `unverified`.
5. Open the saved answer and Original request & source coverage: prompt/context, depth/limit, accepted mode, each supplied URL/method, retrieval outcomes/counts, cited references and limitations. Distinguish a retrieved source from one actually cited; do not imply all checked pages informed the answer.
6. Select Generate audio only when wanted. Reuse an active job or same-owner verified matching cache; otherwise narrate and independently check equivalence/duration. Reopening/listening never authorizes new synthesis. Failed narration requires explicit Retry audio.
7. Reopen in history, choose Revise this exploration to prefill a new editable request, or start recurring setup. Revision never edits the old brief and a new submission uses a new request/allowance slot.

A completed retry refreshes dashboard/history status; stale failure cards must not remain. Polling stops at terminal states, and errors distinguish service overload, missing configuration, provider quota, read throttling and the app’s shared brief allowance. A countdown is guidance, not a completion promise. Leaving/reloading restores persisted state without restarting research.

## 6. Feature and output requirements

| ID | Requirement |
|---|---|
| EX-01 | Create a manual `explore` run owned directly by the authenticated user, without requiring a Topic or Schedule. |
| EX-02 | Snapshot prompt, interpreted focus, depth/preferences, and exactly one limit. Apply the limit during research selection/composition, not by speeding playback. |
| EX-03 | Retrieve within the accepted source mode/methods and ground claims in suitable fetched evidence. Web discovery needs no approved seed; no mode silently expands scope or substitutes unverified snippets. |
| EX-04 | Answer the actual question at the chosen depth, including supported reasoning, options/tradeoffs and practical implications where requested; avoid merely summarizing articles. Explain materially narrow evidence or selected-but-unused source coverage without forcing irrelevant citations. |
| EX-05 | Publish validated text first; optionally deliver explicitly requested, matching cached/generated audio under SH-05, with measured duration, status and explicit retry. |
| EX-06 | Persist request, result, evidence, and limit metadata; show Explore in global history/calendar without requiring a recurring topic. |
| EX-07 | Keep published content immutable; retry the same failed run without duplicate publication. A deliberate new exploration creates a new result. |
| EX-08 | Create recurring-topic setup only through an explicit action; prefill subject/preferences, offer sources as unapproved recommendations, and retain the exploration unchanged. |
| EX-09 | Expose three coverage choices and independent per-URL page/search/feed/site controls, owned saved-source resolution, five-source validation, explicit search needs and correct request identity. |
| EX-10 | Persist/display stages and original inputs, source checks and citations; support safe request revision, bounded polling, activity download and fresh dashboard state. |

The standard layout is request-specific and stored as a versioned configuration snapshot. A reusable topic-template library is not required for Explore. A default response uses up to five main points; there is no requirement to fill five points or the available time. Supporting explanation may use established material rather than only recent publications. Publication dates remain visible where relevant, and current claims need current evidence.

## 7. Research and generation rules

Rank evidence for its ability to answer the request, source suitability, accuracy, and relevance. Recency matters according to the question; an evergreen explanation is not limited to the last day/week. Repeating a concept from a previous exploration is permitted. Update-mode novelty suppression must not remove concepts needed to answer an Explore request.

Successful retrieval with insufficient supporting evidence produces an actionable insufficient-evidence result; it does not produce a “No significant updates” brief. A user-requested current-events exploration follows its stated timeframe, while retaining the Explore workflow and ownership model.

## 8. Data, API, and integration contracts

| Contract | Explore behavior |
|---|---|
| Request | `intent=explore`, `trigger=manual`, `topic_id=null`; prompt, depth/preferences, output limit, `sourceMode`, ad hoc URL/method pairs, approved owned saved IDs and idempotency key |
| Result | Shared Brief with direct owner, intent, request snapshot, canonical text/blocks, evidence, requested limit, and budget-verification state |
| Time | Research-as-of timestamp; optional interpreted timeframe when requested. No automatic update coverage checkpoint. |
| Media | Explicit AudioJob references a Brief; assets/cache require same owner, exact canonical hash and narration profile/version. Shared storage references are protected during cleanup. |
| History | List by owner/date/intent; refresh after completed retry. No Topic join is needed. Original accepted settings/source checks support revision into a new request. |
| Handoff | Owned source brief may prefill a new topic draft; no historical association/content is rewritten. |
| Progress/coverage | Owner-scoped RunEvents plus retained SourceChecks and actual citations; status/preview/detail use the same persisted completion state. |

Logical endpoints: `POST /explorations`, `GET /runs/{id}`, `GET /briefs/{id}`, `GET /briefs?intent=explore`, authorized audio access/retry, and creation of a topic draft from an owned brief. Shared SH-02 defines authorization, validation, and error contracts.

## 9. Failure and boundary behavior

| Condition | Required behavior |
|---|---|
| Empty/invalid input or unsupported limit | Inline error; no research job; inputs retained |
| Broad topic | Generate within depth/limit; require supplied sources only when that coverage mode is chosen, not recurring setup |
| Missing/weak evidence | Fail with insufficient-evidence reason and suggest narrowing/rephrasing; no fabricated answer |
| Some sources unavailable | Continue only with sufficient relevant evidence; disclose partial coverage |
| Word/time budget too small for breadth | Prioritize the core answer, disclose omitted scope, and remain within the limit |
| Audio/duration verification fails | Follow shared text-only fallback; distinguish estimated from verified duration and permit safe retry |
| Retry/double submission | Same key returns the same run/result; deliberate new key creates another exploration |
| Reload/navigation | Restore persisted state, stop terminal polling and refresh overview after success; no implicit rerun |
| Search scope unavailable/empty | Explain missing search setup/quota/empty index coverage; no silent wider search or unverified-snippet fallback |
| Provider high demand/read throttling | Show the actual temporary condition and bounded retry guidance; do not mislabel it as missing account access or consumed brief allowance |

## 10. Acceptance criteria

| ID | Scenario and expected result | Coverage |
|---|---|---|
| EAC-01 | An admitted user with no topics submits a valid prompt in search-only mode or with supplied sources and receives text; no Topic, followed Source or Schedule is created | ES-01 / EX-01 |
| EAC-02 | Blank/oversized prompts, conflicting controls or prompt limits, non-positive time, and values outside displayed bounds are resolved/rejected before queueing without losing inputs | ES-02 / EX-02 |
| EAC-03 | Word-mode output stays within its prose ceiling; time-mode ready audio measures no more than the requested limit at 1×; short results are not padded | ES-02 / EX-02 |
| EAC-04 | A request for an established topic succeeds using relevant established evidence even when there is no recent news; prior Explore results do not suppress necessary explanation | ES-01/ES-03 / EX-03/EX-04 |
| EAC-05 | Reviewed explanations/comparisons answer their prompts at the selected depth, with linked evidence for important claims and explicit unsupported-scope limits | ES-03 / EX-03/EX-04 |
| EAC-06 | Missing evidence, partial retrieval, validation failure, and audio failure produce their distinct states under sections 7/9 and shared SH-05 | ES-03/ES-04 / EX-03/EX-05 |
| EAC-07 | Text publication/viewing/polling requests no speech. Explicit approval reuses an active job or same-owner exact-hash/profile verified asset; otherwise generates checked audio. Different owners/text/profile or incompatible budgets cannot reuse it; ready audio matches text and time verification | ES-04 / EX-05 |
| EAC-08 | Global history/calendar includes multiple standalone explorations on the same date; each request/result can be reopened after logout/login | ES-05 / EX-06 |
| EAC-09 | Same-key retries/reloads reuse the accepted reservation/result; a deliberate repeat/revision with changed input gets a new identity and reservation; old text/settings remain unchanged | ES-05 / EX-07 |
| EAC-10 | Create recurring topic opens a prefilled draft and requires source/template/schedule review before activation; the exploration remains unchanged | ES-06 / EX-08 |
| EAC-11 | A second user cannot fetch, change, retry, convert, or play this user's exploration, run, activity, source checks or audio | All / SH-01 |
| EAC-12 | Three coverage choices route correctly; search-only ignores hidden source values, switching back restores edits, and total owned/ad hoc source limits validate | ES-07 / EX-09 |
| EAC-13 | Mixed page/search/feed/site methods persist per URL. Site search is domain-restricted and directly reads matching public pages; foreign redirects, login/homepage results and empty/missing/quota cases follow SH-03 | ES-07 / EX-03/EX-09 |
| EAC-14 | Source-row add/remove/focus, long-URL truncation and keyboard/help controls work without mobile overflow; changed inputs reset request identity | ES-07 / EX-09 |
| EAC-15 | Run activity survives reload, is downloadable by its owner, explains elapsed/overrun/stale work, stops terminal polling, and a completed retry refreshes overview | ES-08 / EX-10 |
| EAC-16 | Original request, per-source methods/check outcomes and cited evidence are reviewable. Revise prefills a new request without rewriting the brief; answer review checks requested reasoning and unused-source limitations | ES-03/ES-05 / EX-04/EX-10 |

## 11. Success measures and release dependencies

Measure validated-text completion and separately requested-audio completion, usefulness/answer fit, time from text request to publication and from audio approval to readiness, limit verification, evidence defects, source coverage, retry/status accuracy and later reopening. Intentionally unrequested audio is not a failure. Compare the effort with the user's existing ad hoc research workflow. Repeat use is measured by subsequent voluntary requests rather than a scheduled-consumption cadence.

Release requires EAC-01–EAC-16, shared verification scenarios, domain-informed answer/source review, and agreed service bounds/voice calibration. Explore can ship independently of the recurring scheduler once its shared dependencies are ready. Follow-up conversations, search, and bookmarks follow the master roadmap.
