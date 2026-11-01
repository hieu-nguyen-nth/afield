# Working on one feature safely

Folders and branches solve different problems. Feature folders define permanent ownership inside the codebase. A Git branch is a temporary, complete snapshot of the repository for an isolated change. Committing a branch records the staged changes, not every file in the repository again. One `apps/web` application can contain all Afield features while retaining clear ownership.

Use short-lived branches from current `main`, such as `fix/auth-callback` or `feature/topic-source-review`. Avoid permanent branches for every feature: they drift apart and make shared changes harder to integrate. `main` represents reviewed integrated work.

1. Fetch the latest remote state and start a branch from current `main`.
2. Find the owning folder using the feature index. Change that feature's model, behavior, screen and colocated tests as needed. Shared contracts/adapters change only when the problem actually crosses that boundary.
3. Review the diff and stage explicit paths. Avoid staging unrelated experiments or local settings.
4. Run focused feature tests, then shared checks appropriate to the impact. Authentication, shared routing, schema and cross-feature changes require broader regression checks.
5. Push the branch and open a pull request describing the problem, behavior, evidence and remaining limits. CI runs on the pull request. Review and merge deliberately; do not force-push shared `main`.

The current feature-boundary work uses `refactor/feature-boundaries`. It splits authentication, UI, API behavior and model ownership across multiple features, so its scope is broader than a routine auth bug fix. Future fixes should normally touch a much smaller feature-owned set. The earlier workspace-layout commit is already integrated; this next change remains reviewable in its pull request until the user chooses to merge.

The repository currently relies on this workflow and CI; branch protection is not claimed to be enabled. Enforcing mandatory reviews through GitHub settings is a separate repository-policy decision. This file does not change access, plans or billing.
