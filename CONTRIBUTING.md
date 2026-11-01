# Contributing

Use Node 26 and `npm ci`. Work on a branch and make focused commits. Keep domain contracts in `src/domain`, feature behavior in `src/features`, external adapters in `src/infrastructure`, and HTTP/UI entry points in their existing folders. Avoid moving provider logic into components. Pin dependency versions and commit the npm lockfile.

Run the checks in [the test plan](docs/testing/TEST-PLAN.md). Tests must use synthetic data and isolated databases; never reset real Supabase data or commit `.env.local`, cloud linkage, user exports or private media. Keep current product/technical/user docs aligned with behavior, label requirements versus verified implementation, and regenerate walkthrough screenshots when a flow changes. Schema changes require a reviewed migration and ownership/privilege tests. Do not rewrite applied migrations as a shortcut.

Use the PR template to describe the user-visible change, validation evidence and remaining limitations. Do not change spending plans, admission policy, hosted production or public visibility as part of a routine refactor. This private repository has no open-source license; obtain permission before redistributing it.
