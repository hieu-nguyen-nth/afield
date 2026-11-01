# Product decision log

Concise record reconstructed from the three development chats and the current code. Dates reflect recorded decision periods, not invented approval timestamps. The current v0.5 specifications govern scope; this log explains how it changed.

| Period | Before | Decision / after | Reason and consequence |
|---|---|---|---|
| Initial planning | Generic summaries and loosely specified persistence | Email/password + Google OAuth, durable user-owned records and calendar/history are explicit requirements | Readers need continuity and private retrieval; identity and ownership shape the database |
| Initial planning | One general learning-brief experience | Separate Explore and Stay Updated with shared text/audio/history infrastructure | One-off learning and recurring change tracking need different inputs and evaluation |
| Initial planning | Fixed output | Per-topic reusable ordered block templates, depth and natural-language context | Readers control the form and relevance of future briefs |
| Initial planning | Fill a standard amount of news | Prioritize high-signal changes, default five main items, allow short/no-news | Avoid filler; successful empty coverage differs from retrieval failure |
| Oct 28 | “Learning Brief” / working name alternatives | **Afield**; “Explore something new. Keep up with what matters.” | Name covers exploration and ongoing updates |
| Oct 28 | Broader pilot assumptions | Personal invite-only Option 2 implementation using verified free plans and no paid fallback | Constrain scope and spending; runtime attestations still need provider checks |
| Oct 28–29 | Audio generated for every result | Text first; explicit Generate audio, private exact-script/profile cache, one pending job | Avoid unnecessary synthesis; listening budgets stay unverified until measured |
| Oct 29 | Ambiguous “question-only” search explanation | Explain that Tavily finds fresh information without user-supplied links; worker choice is separate | Search controls coverage; local/hosted workers control execution availability |
| Oct 29 | One combined source behavior | Three manual coverage modes; per-run overrides preserve recurrence settings | Let users test selected sources, wider discovery or both independently |
| Oct 31 | One broad URL scope / homepage treated as adequate | Independent exact-page, feed, linked-page and site-search settings per URL | Match intended coverage; site search can consume Tavily in sources-only mode |
| Oct 31 | Static suggested article reused for recurring updates | Recommend publication roots searched afresh | Recurring topics need new material, while existing source settings remain explicit |
| Oct 31 | Search titles and institution-like branding used as quality signals | Fetch publisher pages, screen sales funnels, require grounded publisher-role evidence and allow fewer/none | Reduce vendor/SEO recommendations; recommendation quality still needs human evaluation |
| Oct 31 | Large subtopic rows, “Selected” labels, removal on deselection | Compact color/tick chips; retain deselected options; preserve selected chips during regeneration | Faster review with less layout movement |
| Oct 31 | Disabled suggestion button and unclear source modes | Clickable missing-topic guidance, optional subtopics, mode explanations/tooltips | Make prerequisites and reading behavior understandable |
| Oct 31 | Hidden request/coverage and stale run status | Inspect original inputs and source checks, revise a new request, stop terminal polling and clarify retry/errors | Improve trust and diagnosis without modifying published text |
| Oct 31 | Local + database invitation configuration | One database admission list | Keep access changes consistent without local restarts |
| Repository preparation | Flat library, PRDs outside app, accumulating old screenshots/logs | Domain/feature/infrastructure folders; current docs and new synthetic walkthrough/test evidence in the repo | Make ownership and review clear; exclude old drafts and local/private artifacts |

| Repository cleanup | App configuration, tests and policies mixed at the top level | One runnable `apps/web` workspace, shared `docs`, GitHub policies/templates and repository `tooling` | Make the root easy to navigate while keeping root npm commands and one lockfile |

| Feature ownership and review | Auth and feature behavior scattered across shared infrastructure, a large UI file and a central route | Feature-owned models/API/UI/tests, explicit auth design and short-lived feature branches with pull requests | Make a feature easy to find and change while preserving shared guards and SQL ownership constraints |

## Open decisions and follow-through

Improve persisted publisher evidence, Update query hints and effective-model provenance before claiming full requirement alignment. Validate real OAuth, narration, schedules and hosted operation before expanding the pilot. Future search/bookmarks, follow-ups, inbox ingestion and collaboration remain roadmap items, not released features. Record future decisions with a dated before/after, owner rationale, affected requirements and validation evidence; do not backfill assumptions as approved decisions.
