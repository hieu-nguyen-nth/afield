# Afield web application

This folder owns the runnable application, including its source, tests, database migrations, worker entry points and app-specific configuration.

| Folder | Contents |
|---|---|
| [src](src) | Framework adapters, feature-owned models/UI/services/tests, shared controls and infrastructure |
| [tests](tests) | Disposable database and cross-feature browser tests; unit tests live beside each feature |
| [supabase/migrations](supabase/migrations) | Ordered database migrations |
| [scripts](scripts) | Readiness, bounded connection checks and local worker |

Run `npm ci` and the usual `npm run dev`, `npm run build`, `npm test` and worker commands from the repository root. Root commands forward here through the npm workspace. Use the single root lockfile; do not add an application-specific lockfile.

Private local configuration belongs in `apps/web/.env.local` (relative to the repository root). Start from [.env.example](.env.example); never commit private values. App build/test/worker configuration stays in this folder beside [package.json](package.json).

[Product overview](../../README.md) · [Documentation](../../docs/README.md) · [Setup](../../docs/KEYS-AND-SETUP.md) · [Tests](../../docs/testing/TEST-PLAN.md).
