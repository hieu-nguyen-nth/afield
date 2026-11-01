# Source publication and runtime deployment

The GitHub destination is the private `hieu-nguyen-nth/afield` repository. Publication contains reviewed source, lockfile, SQL migrations, current documentation, synthetic screenshots, test cases and current result logs. It excludes environment files, cloud linkage, build/dependency folders, exports, private records/media and superseded planning/test captures.

## Release procedure

1. Review `git status` and the staged file list; run `npm run verify:repo` to check excluded paths, likely credentials and Markdown targets. Review changes to SQL, auth and provider calls separately.
2. Use Node 26; run `npm ci`, typecheck, lint, unit tests, both disposable database suites, and the production build. Run browser regressions against the isolated production test server. Preserve results with exact scope; do not imply fixture tests validate live providers.
3. Commit coherent source/docs/verification changes. CI repeats the quality checks on pull requests and main pushes; it uses dummy values, no cloud database or provider secrets, and read-only repository permissions.
4. Push to the private repository and inspect the commit and Actions result. For future changes, branch and open a pull request using the supplied template; do not force-push shared main.

## Optional hosted web + worker

Choose a compatible Next.js host and configure its server environment using [setup](../KEYS-AND-SETUP.md). Set the exact HTTPS `APP_URL`; configure matching Supabase auth callbacks. Do not deploy `.env.local`, `.vercel` settings or private exports. GitHub Pages cannot run this API/worker/database system.

Use either the local worker connected to the same backend (new work waits when it sleeps) or the supplied Trigger.dev tasks. Hosted workers need their own private environment, FFmpeg/FFprobe support and the current `src/trigger` build. Deploy workers only after confirming the selected service's operating plan; verify generation, dispatch and housekeeping schedules. Set `EXECUTION_MODE=cloud` only after the cloud path works. Stop unnecessary duplicate local polling.

Keep live generation disabled until a real admitted-user sign-in, source-to-text brief, explicit narration, queue recovery and scheduled update pass on the selected environment. Verify usage limits, signed media, export/deletion completion and logs without sensitive content. Existing local project link files are deliberately excluded; a new clone needs its own hosting linkage.

## Rollback and recovery

Revert a bad application commit and redeploy the previously checked app/worker version. Database changes require a reviewed forward-fix or restoration plan; never run reset/down scripts against saved data as an automatic rollback. Back up the database and private media through the operator's provider tools. Reader JSON export excludes media and cannot replace operator backups. Pause new work while investigating provider/queue failures, preserve redacted run IDs/errors and resume only after checking leases and request idempotency.

Remaining acceptance is tracked in [current status](../product/CHANGELOG.md). This repository preparation does not create a new public web deployment or claim hosted readiness.
