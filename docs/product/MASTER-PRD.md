# Afield — Master PRD

*Explore something new. Keep up with what matters.*

Version: 0.5 · Status: Draft · Updated: October 31, 2026

## 1. Vision and value proposition

Afield helps curious people **explore a topic when curiosity arises and stay updated on topics they choose to follow**, through useful, source-backed text and audio that fit their available time.

The product offers two independent experiences:

- **Explore:** ask about a topic, choose a length or listening-time limit, and receive an ad hoc text brief with optional user-requested audio. No recurring setup is required.
- **Stay Updated:** refine a topic, choose sources and a brief format, and receive recurring updates with the option to generate an update manually.

Both experiences preserve the result and its sources so users can return to it later. Audio is an optional voice version of the written content. It is generated only after an explicit Generate audio action on a saved brief; reopening never regenerates it.

## 2. Customers and problems

The primary audience is curious knowledge workers exploring unfamiliar subjects or following changing fields. Users may enter through either experience and do not need to use both. The initial product serves individual accounts.

| Situation | Problem | Product response |
|---|---|---|
| A topic sparks curiosity or becomes relevant | The user does not know where to start, which sources suit the topic, or how to provide enough context to an AI tool | A direct Explore request with optional preferences and a length/time limit |
| A user follows a changing subject | Newsletters, publications, and feeds create duplication, unread backlogs, and repeated sorting | Personalized recurring updates that select meaningful changes |
| Available attention is limited | Useful content does not fit the user's commute or reading window | Length/time controls and equivalent text/audio |
| A user wants to verify or revisit something | Summaries lack usable links or disappear into an inbox | Linked evidence and persistent global/per-topic history |

Specialist topics require appropriate sources: a general publication may provide context without being sufficient evidence for a specialist claim.

## 3. Goals and user jobs

| Goal | User job | Desired outcome |
|---|---|---|
| G1 — Explore with little setup | “When I want to understand a topic, give me a useful explanation within the length or time I choose.” | A sourced answer in text/audio without creating a recurring topic |
| G2 — Stay meaningfully updated | “Keep me informed about important developments in the topics I follow without making me sort every source.” | Relevant updates, little repetition, and clear significance |
| G3 — Fit the user's context | “Let me choose how much I consume and switch between reading and listening.” | Content respects its limit and both formats convey the same substance |
| G4 — Trust and retain the result | “Let me verify what I receive and find it again later.” | Traceable evidence, saved configuration, and reliable history |

## 4. Customer journey

| Stage | Explore journey | Stay Updated journey |
|---|---|---|
| Enter | Sign in and choose Explore | Sign in and create a topic |
| Express intent | Enter a topic/question; choose length or time; optionally set depth/preferences | Enter a topic; review immediate subtopic suggestions and answer 3–4 setup questions |
| Configure | Choose supplied sources, wider research, or search only; set each supplied URL’s reading/search method. No recurring setup is required. | Add sources manually or request screened publication recommendations; configure template and schedule; confirm final review |
| Receive | Generate one source-backed text brief with optional user-requested audio | Generate the first update and receive subsequent scheduled/manual updates |
| Consume | Read text; choose Generate audio if wanted; inspect original inputs, source coverage and citations | Read text; optionally request/reuse audio; inspect coverage and citations |
| Return | Reopen saved text/audio, revise a copy of the request, or create a new exploration | Browse global/per-topic history; adjust or pause future updates |
| Continue | Optionally start recurring setup using the explored subject | Use Explore separately whenever an ad hoc question arises |

First-time users see Create your first topic with an immediately available Explore option. Returning users open a dashboard offering both experiences; users with only Explore history are not forced into recurring setup. Moving from an exploration to a recurring topic requires explicit configuration and confirmation.

## 5. Overall requirements

| ID | Requirement | Owning specification |
|---|---|---|
| M-01 | Email/password and Google OAuth, persistent sessions, account recovery, durable storage, and user-level isolation | Shared SH-01 |
| M-02 | Ad hoc exploration with a length/time limit, chosen source coverage, sourced text and optional audio, request inspection/revision, and no automatic recurrence | Explore EX-01–EX-10 |
| M-03 | Multiple recurring topics with editable subtopics, preferences, approved sources, schedules, and manual generation | Stay Updated UP-01–UP-09 |
| M-04 | User-controlled depth, length/time, and topic-specific reorderable/reusable templates | Explore EX-02; Stay Updated UP-03; Shared SH-04 |
| M-05 | Explicit source coverage and per-URL retrieval methods; screened learning/reading publications, linked evidence, and honest source/uncertainty reporting | Explore EX-03/EX-09; Stay Updated UP-02/UP-05; Shared SH-03 |
| M-06 | Text-first briefs and optional explicitly requested matching audio, with private reuse, playback controls and independent audio-error recovery | Shared SH-05 |
| M-07 | Global history/calendar covering both modes, per-topic update history, multiple briefs per date, immutable publication | Shared SH-06 |
| M-08 | Durable activity/progress with elapsed time and delay guidance, bounded explicit retry, fresh completion status, and recurring controls | Explore EX-10; Shared SH-02/SH-07 |
| M-09 | Clear invitation access, account/shared-usage history and reset times, separate privacy controls, export and deletion status | Shared SH-01/SH-08/SH-09 |

## 6. MVP boundary

**Included:** both experiences; invited authenticated users with isolated data; public web/news/blogs, accessible newsletter/Substack pages, and RSS; manual source entry plus optional discovery; exact-page/feed/linked-page/site-search methods; length/time controls; text-first publication and explicitly requested audio; source/request transparency; recurring-topic templates; daily/weekly schedules with weekly default; global/per-topic history; account usage and privacy controls.

**Excluded from MVP:** historical search, bookmarks, interactive follow-up conversations, private email/newsletter ingestion, native social integrations, listening queues, standalone generated notes, and external calendar delivery. These remain roadmap items. A one-off exploration is not a subscription or a course.

## 7. Success metrics

Measure Explore and Stay Updated separately, segmented by limit type and chosen duration/length. Record guardrails alongside engagement.

| Metric | Definition |
|---|---|
| Explore completion | Accepted Explore requests that deliver validated sourced text. Track requested-audio completion separately; verified listening-time success requires requested narration measured within its limit |
| Explore usefulness | Post-result assessment of whether the response answered the request and reduced research/prompting effort |
| Update activation | Confirmed recurring topics that produce a first usable update |
| Update relevance and return | Usefulness/relevance ratings and users returning to consume updates across subsequent scheduled opportunities, reported by cadence |
| Time to value | Median/p95 from request acceptance to readable text; separately from explicit audio approval to ready audio |
| Time fit | Ready audio within the requested 1× limit; over-limit/unverified outcomes reported separately |
| Quality | Reviewed unsupported claims, source suitability, material omissions, and repeated unchanged developments in updates |
| Reliability and retrieval | Failed/partial runs, requested-audio failure, duplicate publication, stale overview status, and successful history retrieval. Audio not requested is an intentional state, not failure. |

Pilot reporting includes denominators, failure outcomes, and qualitative explanations. Performance and usefulness targets are set from the initial baseline before wider release. Ownership violations, unsupported evidence links, and duplicate publication are release defects.

## 8. Phased roadmap

| Phase | Scope | Completion evidence |
|---|---|---|
| 1 — Core product | Explore and Stay Updated; shared accounts, research, budget-aware generation, matching audio, and persistent history | Both feature PRDs' MVP acceptance criteria and shared verification scenarios pass; material quality defects are resolved |
| 2 — Retrieval and refinement | Search both histories, bookmark stories/results, richer preference feedback and recommendation evaluation; evaluate cited follow-up questions | Owned content is searchable/savable; feedback affects future requests without rewriting history; follow-ups retain evidence and request lineage |
| 3 — Wider coverage | Private newsletter/email ingestion and additional social/content sources where accessible | Consent, provenance, source controls, and deduplication work for each selected integration |
| 4 — Extended consumption | Longer listening queues, source-linked notes, external calendar reminders/listening blocks | Queues preserve saved content/order; notes retain evidence; authorized delivery is idempotent and links to saved briefs |

Each later feature requires its own release scope and acceptance criteria before implementation. New ingestion and delivery require corresponding permissions, data, and operational support.

## 9. Documentation and release dependencies

| Document | Responsibility |
|---|---|
| [Explore PRD](EXPLORE-PRD.md) | Explore users, flow, input/output behavior, feature requirements, failure handling, and acceptance |
| [Stay Updated PRD](STAY-UPDATED-PRD.md) | Recurring-topic setup/control, templates, schedules, update selection, and acceptance |
| [Shared technical specification](SHARED-TECHNICAL-SPEC.md) | Common accounts, source modes/scopes, data, research, optional audio/cache, history, reliability, security and operating profile |
| [Version history and verification status](CHANGELOG.md) | Release changes, evidence, remaining acceptance gates and implementation gaps |

The current personal test profile uses Next.js, Supabase Postgres/Auth/private Storage, Gemini, Tavily when search is requested, and a local worker. Admission uses one database access list. It must incur no new service spending or paid fallback. A running local worker is required for generation, scheduling, requested audio and cleanup; hosting/external access and managed workers are separate deployment gates. The detailed PRDs own mode-specific behavior; shared contracts live in the technical specification. Verification status is tracked separately from intended MVP acceptance.
