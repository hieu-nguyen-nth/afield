# v0.5 — current product and verification boundary

Baseline: October 31, 2026. This repository packages the latest Master, Explore, Stay Updated and Shared specifications together. Old pre-split PRDs and superseded raw test captures are excluded from publication.

Current changes: Afield branding; text-first briefs and user-approved private cached audio; three per-run coverage choices; independent page/feed/linked-page/site-search controls; recurring publication recommendations with publisher screening; compact persistent subtopic chips; source guidance/tooltips; original-request inspection and revision; progress and retry feedback; one database admission list and shared usage controls.

This release organizes source into domain, features and infrastructure without changing provider behavior or database migrations. Domain models are split across inputs, topics, research, runs and briefs. The README, workflows, user guide, architecture, schema reference, screenshots and test inventory are now maintained in this repository.

## Known gaps

1. Publisher kind/evidence quotes are checked during recommendation but not fully retained in the saved source contract.
2. Update site-search queries use snapshot prompt/preferences; goal, subtopic and coverage-window hints are not fully propagated. Post-fetch freshness validation does not prove exhaustive discovery.
3. Effective model overrides can differ from snapshot defaults; improve runtime model provenance auditing.
4. Fresh admitted-user Google login, email verification/password recovery, real requested narration/transcription/duration/cache reuse, schedule execution and interruption recovery require live acceptance.
5. Export/deletion completion and hosted web/worker operation need end-to-end acceptance. A passing build or synthetic browser screen is insufficient.
6. A real text brief was recorded in the earlier local session, but current prompt/source changes still need usefulness and omission review. The new regression run makes no new live-generation claim.

See [current test results](../testing/RESULTS.md), [case plan](../testing/TEST-PLAN.md) and [decision log](../PRODUCT-DECISIONS.md). No live model, search, audio or cloud-database batch is needed for repository preparation.
