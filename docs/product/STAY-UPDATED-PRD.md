# Afield — Stay Updated PRD

Version: 0.5 · Status: Draft · Updated: October 31, 2026

[Master PRD](MASTER-PRD.md) · [Explore PRD](EXPLORE-PRD.md) · [Shared technical specification](SHARED-TECHNICAL-SPEC.md)

## 1. Purpose and goals

Afield Stay Updated helps users keep up with chosen topics through recurring, personalized, source-backed updates rather than repeatedly collecting and sorting publications themselves. Users control topic focus, sources, output structure, depth, length/time, and cadence.

This experience serves G2/G3/G4 in the master PRD. It explains significant changes and their relevance, retains verifiable history, and supports reading or listening. Ad hoc questions without recurrence belong to Explore; manual update generation remains available within a followed topic.

## 2. Users and stories

| Story | Need | Requirements |
|---|---|---|
| US-01 | As a user interested in a topic, help me discover and refine its relevant subtopics without extensive prompting | UP-01 |
| US-02 | As a reader, recommend credible ongoing publications and let me add/check/approve sources and choose how each is read or searched | UP-02 |
| US-03 | As a recipient, let me configure and reuse a brief format suited to what I want to read/hear | UP-03 |
| US-04 | As someone following a field, deliver updates on my schedule and let me request one now | UP-04/UP-05 |
| US-05 | As a busy user, prioritize meaningful developments and avoid repeating unchanged stories or padding quiet periods | UP-05/UP-06 |
| US-06 | As a reader/listener, let me consume and revisit previous updates with their evidence | UP-07 |
| US-07 | As my interests change, let me adjust future updates or pause/resume them, and make a one-off research choice without changing recurrence | UP-04/UP-08 |
| US-08 | As an Explore user, let me explicitly start following the explored subject | UP-09 |

## 3. Scope and inputs

**MVP:** multiple topics, immediate editable subtopic suggestions, 3–4 setup questions, source discovery/approval, topic-owned templates, daily/weekly scheduling, manual updates, short/no-news behavior, text/audio, global/per-topic history, and future-setting controls.

| Input | Required/default | Validation |
|---|---|---|
| Topic name | Required | Non-empty within displayed bounds; users may maintain multiple topics |
| Goal/perspective | Required goal; optional preferences | Preserve raw wording and editable interpreted profile |
| Subtopics | Optional; AI suggestions plus user choices | Compact selectable chips. Keep selected interests on regeneration; deselection keeps the chip available. Topic-only source suggestions must work. |
| Depth | Working knowledge | Quick overview, Working knowledge, Deep dive; stored per topic |
| Sources | At least one approved accessible source before activation | Manual entry or screened publication recommendations; independent page/search/feed/site method per source. Up to 10 saved rows, at most five approved. Checking and approval are separate. |
| Research policy | `approved_only` | Optional explicit `approved_plus_discovery`; extra evidence never silently becomes followed sources |
| Template | Default Update template | At least one content block; inline verification remains mandatory |
| Output limit | Standard length | One shared word preset or listening-time limit; stored on the selected template |
| Schedule | Weekly cadence | Select weekday when relevant, local time, and IANA timezone; daily also supported |

Source discovery follows topic configuration. Schedule/template controls are configuration steps, not additional onboarding interview questions. Private inbox/social ingestion and custom recurrence are outside MVP.

## 4. Setup and activation flow

1. Create a topic, or open a draft prefilled from an owned exploration.
2. Immediately show suggested subtopics as compact wrapping chips with inline loading/errors and optional rationale. Select with a tick/color, not a repeated Selected label. Regenerate preserves selections and refreshes remaining suggestions; deselected chips remain available. Deduplicate case-insensitively and discard stale suggestions after context changes. Manual editing/addition/removal remains available.
3. Use at most four personalization questions: goal, aspects of interest (subtopic selection), depth, and frequency. Accept optional natural-language preferences and let users correct the interpreted profile.
4. Add public sources manually or request screened publication recommendations using topic/goal and any selected subtopics. Zero selected subtopics is valid. A missing topic shows actionable guidance/settings access when the recommendation action is clicked, rather than a silently disabled button. Add name/URL and reading/search method, check accessibility, then explicitly approve; checking alone never approves or establishes expertise.
5. Configure the block template, limit/tone, research policy, and local schedule.
6. Show one editable final review of goal, profile, subtopics, sources/policy, template, and schedule. Confirming activates the topic only if configuration validates.
7. Offer Generate first update now and show the next scheduled run. Activation alone does not silently create multiple immediate runs.

Drafts persist and can resume. AI failure allows manual subtopics/sources and the default template. Insufficient configuration remains a draft with actionable errors; no scheduled job starts.

## 5. Templates and output design

Templates belong to a topic. Save multiple named templates, select an active one, reorder/enable/disable blocks, and reuse through an independent copy to another topic. Depth belongs to the topic; template settings control structure, limit, and tone. An active template requires a content block. Custom free-form blocks are outside MVP.

| Default order | Output |
|---|---|
| Big picture | A concise account of what changed, with context appropriate to depth |
| Main developments | Up to five main items: what happened, why it matters, personal relevance, linked evidence |
| Emerging signals | Brief mentions of meaningful secondary developments |
| What to watch | Supported upcoming developments; facts and interpretation/uncertainty distinguished |
| Sources | Linked references; disabling this block never disables inline verification links |

Other available blocks: From your sources, Technical deep dive, Recommended reading. Empty blocks may be omitted. The five-main-item default applies across blocks; short secondary mentions share the overall length/time budget. Prefer fewer meaningful items over filling space. When a time limit and depth compete, preserve key substance and reduce scope rather than exceed the limit or remove evidence.

Each update identifies topic, generation time, coverage interval, configuration used, and material source-coverage limitations. Shared SH-04/SH-05 own budget and canonical text/audio behavior. Publication is read-only; changing a template affects future updates.

## 6. Generation, relevance, and source behavior

Scheduled and manual updates use an accepted configuration snapshot. Rank developments by relevance to interests/goal, significance, novelty, recency, suitable evidence and independent corroboration. Compare prior Update briefs for the same topic; suppress unchanged stories, explain material changes and distinguish syndicated copies. Explore results never advance update coverage or suppress an explanation needed in a separate exploration.

### Recurring publication recommendations

Recommend publications that can supply new articles each run, not isolated search hits treated as ongoing sources. Return publication roots with Search within this site (`search`) as the default retrieval method; feeds can be entered when a real feed URL is known. Preserve existing saved methods. A manually supplied exact page remains a valid clearly labeled static reference, not a promise of future updates.

Automatic recommendations must have checked publisher evidence for an independent editorial publication (including paid journalism/newsletters), university, public institution/regulator, or research nonprofit, plus relevant substantive coverage. Exclude vendor/product funnels, consultancies/agencies, course sellers, marketing/trade associations, sponsored/SEO farms, social posts and unknown publisher identities from these automatic learning/reading recommendations. Nonprofit status, search rank, an official-sounding name or a matching article is insufficient.

Search institutional/research and independent specialist-reading channels, interleave candidates, inspect bounded publisher pages and retain excerpts for relevance checking. Select at most five distinct publishers; return fewer or none when evidence is weak. Validate candidate identity and a verbatim publisher-evidence quote before accepting a recommendation. Give each result a specific short explanation of what the user can learn; do not invent feed support, access, credentials or publication frequency.

These automatic-screening rules do not erase existing sources or prohibit explicit user-added public sources. Checking access, recommending and approving are separate actions. Topic-only discovery works; subtopics refine it. Source cards group description, controls and relevant help compactly, use consistent accessible menus/tooltips, and explain missing input or a full source list. Only in-flight work prevents duplicate recommendation requests.

### Source coverage and per-source methods

Scheduled `approved_only` maps to `sources_only`; `approved_plus_discovery` maps to `sources_and_web`. Before a manual Update, the user may choose supplied sources only, broader search only, or both. Snapshot that one-off override without editing source approvals, recurrence policy, or scheduled coverage checkpoint. Web-only evidence is not silently approved/followed.

Every selected source has its own exact-page, domain-search, feed or bounded linked-page method under shared SH-03. Search sources run a fresh domain-restricted query using topic/goal/context and coverage hints, then directly read matching public pages. A homepage or provider snippet alone does not establish article coverage. Index results/coverage hints are not an exhaustive archive search or guaranteed event completeness.

Sources-only permits explicitly requested domain searches but never wider discovery. Search scopes and wider modes need Tavily; exact pages/feeds/linked pages do not. A direct accessibility check does not call search. Empty/unavailable site search never silently expands scope. Successful checks with no meaningful changes yield a short no-news update; partial/unavailable checks remain distinct and visible. Audio is never generated automatically, including for scheduled/no-news results.

## 7. Schedule and topic lifecycle

| Action/state | Behavior |
|---|---|
| Draft | Editable/resumable; no scheduled work |
| Activate | Validate source/template/schedule; mark active and compute next future occurrence |
| Edit settings | Apply to new runs; running work retains its snapshot. Schedule edits recompute the next occurrence. |
| Disable/remove a source | Stop future retrieval from it; preserve historical evidence. If no approved source remains, pause with an actionable reason. |
| Pause | Prevent future/queued scheduled work from starting; running work finishes; manual updates remain available if configuration is valid |
| Resume | Revalidate and schedule the next future occurrence; no automatic burst of backfilled updates |
| Generate now | Create a deliberate manual Update run; retain the recurring schedule |

First updates use the cadence's trailing day/week. Subsequent scheduled coverage starts at the last successfully published scheduled coverage end; manual updates use the current trailing cadence window and never move that checkpoint. Compare prior updates to avoid repeating manual coverage as new.

Missed scheduled work becomes one catch-up run, subject to the displayed research lookback cap. Disclose truncation/uncovered periods. On daylight-saving transitions, use the next valid local time for a nonexistent slot and execute a repeated slot only once. Shared SH-07 owns dispatch, idempotency, concurrency, and state integrity.

## 8. Consumption and history

The dashboard shows latest completed update, next scheduled run, active/paused state and pending/failure indicators; it refreshes after publication/retry. Topic workspace provides Latest, History, Sources, Templates and Settings. Reading exposes accepted settings and selected/retrieved/cited-source coverage. Generate audio is an independent explicit action; Listen reuses already verified media. Progress/activity, private cache and audio-error recovery follow the shared contracts.

Global history/calendar includes both modes; the topic calendar lists its updates. Selecting a date lists every update for that date with generation time; multiple same-day updates remain distinct. Display timezone groups dates; the topic timezone controls generation. Configuration/source edits never rewrite older content or citations.

## 9. Feature requirements

| ID | Requirement | Technical dependency |
|---|---|---|
| UP-01 | Persist draft/profile, optional editable subtopics, compact selection/regeneration state, inline suggestion feedback, final review and activation | Topic/Subtopic; SH-01/SH-02 |
| UP-02 | Support proactive manual source checking/approval, evidence-screened recurring publications, independent page/search/feed/site methods and accessible guidance; retain research policy/approval separately | Source/SourceCheck; SH-03 |
| UP-03 | Persist named/copyable/reorderable templates and enforce content/limit settings | Template/TemplateBlock; SH-04 |
| UP-04 | Support timezone-aware daily/weekly and manual execution; snapshot one-off source-mode overrides without changing saved recurrence settings; preserve pause/resume/catch-up rules | Schedule/GenerationRun; SH-07 |
| UP-05 | Select and explain meaningful new/materially updated developments, preserving evidence and prior-coverage comparison | BriefItem/Citation; SH-03/SH-07 |
| UP-06 | Distinguish no-news, partial coverage, retrieval failure, and validation failure without padding | SourceCheck and run/brief outcomes; SH-02/SH-03 |
| UP-07 | Publish immutable text/history with original settings/source coverage and fresh completion state; independently deliver explicitly approved matching private cached/generated audio | Brief/AudioAsset; SH-05/SH-06 |
| UP-08 | Apply setting changes prospectively and revalidate topic state when prerequisites are lost | Snapshot/configuration validation; SH-02/SH-07 |
| UP-09 | Prefill a topic draft from an owned exploration without auto-approving sources or starting recurrence | Topic origin reference; SH-01/SH-06 |

## 10. Data and API contracts

Update requests have `intent=update`, a required owned `topic_id`, `trigger=manual|scheduled`, configuration snapshot including effective `sourceMode` and each source method, output limit, and coverage interval. Source/Template/Schedule belong to the topic; every run/brief also has a direct owner. The Brief links to its unique run. The scheduled checkpoint is derived from successfully published scheduled Update runs, not arbitrary user history.

Logical API capabilities: create/read/edit topic drafts; suggest subtopics; discover/approve/disable/remove sources; create/copy/activate templates; configure schedules; activate/pause/resume; `POST /topics/{id}/updates`; read run status, topic history, brief and audio. Activation and generation validate both ownership and configuration. The shared specification owns field relationships, publication/media contracts, and common error codes.

## 11. Failure and edge cases

| Condition | Behavior |
|---|---|
| Invalid source/template/schedule at activation | Keep draft and identify fields; no job |
| Setup AI unavailable | Retain draft; permit manual setup/default template |
| Topic/subtopics absent in source discovery | Explain missing topic locally; subtopics are optional. Do not call discovery for an empty topic or silently disable the action. |
| Weak/vendor-only recommendation candidates | Return fewer/none with actionable guidance; do not pad, claim authority or mutate saved sources |
| Search connection/quota unavailable | Explain affected source/mode and preserve input; no silent wider search or paid fallback |
| Source access deteriorates | Show source failure and partial coverage; do not infer quiet news from inability to check sources |
| Large news volume | Keep highest-signal main developments, briefly mention secondary ones, respect limit |
| No meaningful changes | Publish a short no-news result with checked-source coverage |
| Simultaneous manual/scheduled runs | Serialize comparison/publication and preserve each deliberate request's identity |
| Pause after queueing | Skip work not yet claimed; preserve audit status and coverage checkpoint |
| Budget/audio failure | Shared text-only/verification behavior; no silent over-limit ready audio |
| Retry/reload | Reuse the same run when retrying; never regenerate historical content on read |

## 12. Acceptance criteria

| ID | Scenario and expected result | Coverage |
|---|---|---|
| UAC-01 | Compact subtopics support selection/deselection, edits, case-insensitive deduplication, preserved selections on regeneration, stale-response rejection and inline loading/errors; no more than four questions; draft/final review persist | US-01 / UP-01 |
| UAC-02 | Manual name/URL/method entry works before discovery; direct checks use no search and do not approve. Source access/method/rationale validate; changes affect future retrieval and preserve history | US-02 / UP-02 |
| UAC-03 | Approved-only excludes unapproved sources; opted-in discovery labels evidence without following sources; the chosen policy persists in run/brief snapshots | US-02 / UP-02 |
| UAC-04 | Multiple templates save/copy/activate independently; selected order, depth, tone, and word/time limit affect output; inline citations survive Sources-block removal | US-03 / UP-03 |
| UAC-05 | Invalid activation stays draft; valid activation computes next occurrence and offers exactly one user-requested first run | US-01/US-04 / UP-01/UP-04 |
| UAC-06 | Daily/weekly, manual, timezone/DST, missed-run and resume fixtures follow section 7; manual/Explore results never advance the scheduled checkpoint | US-04 / UP-04 |
| UAC-07 | New/unchanged/material-update/syndication fixtures yield meaningful new coverage, suppress repeats, explain changes, and respect the main-item/limit rules | US-05 / UP-05 |
| UAC-08 | Empty successful checks, quiet news, partial checks, wholly blocked retrieval, and invalid generation produce distinct documented outcomes | US-05 / UP-06 |
| UAC-09 | First/manual/scheduled text publication never queues speech; explicit approval deduplicates jobs or reuses same-owner exact-hash/profile compatible audio. Ready audio passes equivalence/time checks; not-requested/failed/unverified states stay distinct and text stays unchanged | US-06 / UP-07 |
| UAC-10 | Global/topic calendars list all same-day results; history and source/profile/template snapshots remain unchanged after edits | US-06 / UP-07/UP-08 |
| UAC-11 | Same-key retries do not duplicate publication; overlapping deliberate runs serialize; a queued run paused before claim is skipped and does not advance coverage | US-04/US-07 / UP-04/UP-08 |
| UAC-12 | Disabling the last approved source pauses recurrence with an actionable reason; restoring a source requires explicit resume; running snapshots stay intact | US-07 / UP-02/UP-08 |
| UAC-13 | Explore handoff requires setup/review/activation; retrieved sources begin as recommendations and the original exploration is unchanged | US-08 / UP-09 |
| UAC-14 | A second user cannot access/change/activate/generate for a topic or retrieve its runs, evidence, briefs, or media | All / SH-01 |
| UAC-15 | Missing-topic guidance is actionable with no discovery call; topic-only suggestions work; optional subtopics refine results; menus/help work by keyboard/focus/tap and fit mobile layouts | US-01/US-02 / UP-01/UP-02 |
| UAC-16 | Vendor pitches/social posts/unknown publishers, duplicate hosts and invented publisher quotes are rejected. Checked suitable publication roots remain unapproved with search method; weak candidates return fewer/none and saved rows are preserved | US-02 / UP-02 |
| UAC-17 | Domain-search sources discover relevant indexed pages beyond homepage links, enforce exact-origin/redirect bounds and directly read candidates; empty/blocked/quota cases do not imply full coverage or use snippets as evidence | US-02/US-05 / UP-02/UP-05/UP-06 |
| UAC-18 | Manual source coverage overrides route correctly without changing saved policy, approvals, future snapshots or checkpoints; source methods persist independently | US-04/US-07 / UP-04/UP-08 |
| UAC-19 | Fresh result status/preview, original configuration and selected/retrieved/cited-source reporting survive reload; progress and terminal polling follow SH-02/SH-09 | US-06 / UP-07 |

## 13. Success measures and release dependencies

Measure topic activation, time to first usable update, relevance/omissions/repetition, consumption across chosen scheduled opportunities, history reuse, partial/failure outcomes, limit compliance, and operational cost. Evaluate source fit and important developments with a domain-informed reviewer independently of generated output.

Release requires UAC-01–UAC-19, shared verification scenarios, adequate source/claim review, scheduler tests, and configured operating/privacy limits. Search, bookmarks, feedback/follow-ups, wider ingestion, notes and calendar delivery follow the master roadmap; they do not add hidden requirements to this release.
