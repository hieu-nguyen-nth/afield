# Fresh setup and private configuration

Use Node.js 26 and run `npm ci` from the repository root. Copy [.env.example](../apps/web/.env.example) to `apps/web/.env.local`; fill values privately and keep the file ignored. No secrets, local project links, admitted addresses or customer data are supplied by this repository. `npm run preflight` reports configuration readiness without printing values. Restart the web server/worker after changing configuration.

| Variable | Purpose |
|---|---|
| `APP_URL` | Exact web origin; localhost for local work, HTTPS deployment origin when hosted |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project's public URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public browser-compatible key; never substitute a server secret |
| `SUPABASE_SECRET_KEY` | Privileged server/worker key, never in frontend/public configuration |
| `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL` | Server generation key and explicitly supported text model |
| `TAVILY_API_KEY` | Optional broader web search, selected-site search and searched source recommendations |
| `EXECUTION_MODE` | `local` or `cloud`; local requires the local worker process |
| `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_REF` | Optional hosted-worker credentials/reference |
| `DEPLOYMENT_PROFILE` | Supplied profile is `personal_free` |
| `FREE_TIERS_VERIFIED`, `LIVE_GENERATION_ENABLED` | Leave false until required accounts/limits and setup are verified |

## Database and authentication

Create a separate Supabase project. Apply all five [migrations](../apps/web/supabase/migrations) in filename order through your reviewed migration process; do not reset a project containing saved data. The migrations define tables, ownership/RLS, RPCs, private media and admission. Supabase Auth/Storage must be available. No production seed or private user export is committed.

Configure the exact app Site URL and callback (`http://localhost:3000/api/auth/callback` locally; the same path on your deployed origin when hosted). Keep email confirmation enabled. Check email delivery constraints for your configured SMTP. Add invited verified account addresses to `private.allowed_emails` through the operator's database console; never commit that list. Google OAuth, if enabled, uses Google credentials stored in Supabase's provider configuration and the callback it supplies; never put the Google client secret in frontend code.

## Providers and execution

Use public topics and non-confidential preferences. Verify actual access, content-processing terms, quotas and no-overage free-plan settings in your accounts before enabling generation. Supported model names are explicitly selected in [models](../apps/web/src/infrastructure/providers/models.ts) and [providers](../apps/web/src/infrastructure/providers/providers.ts); availability is not guaranteed by a successful build. No paid fallback or automatic billing changes are implemented.

Direct page/feed/linked-page retrieval can work without Tavily. Wider discovery, automatic searched recommendations and selected domain-search sources require it. Sources-only restricts discovery scope; an explicitly selected site-search source still uses Tavily. It does not bypass paywalls.

For local operation run `npm run build`, `npm run start` and, separately, `npm run worker:local`. Jobs/schedules/cleanup wait while the worker or computer is asleep. For hosted execution see [deployment](technical/DEPLOYMENT.md); web and worker environments must both be configured. GitHub publication alone does not deploy either runtime.

Start live acceptance with one small public-topic text request, then explicitly request one narration, and verify one manual/scheduled update. Do not run batches to diagnose a single provider failure. If a key leaks, revoke it with the provider and update private environments; deleting a file alone is insufficient. See [security policy](../.github/SECURITY.md).
