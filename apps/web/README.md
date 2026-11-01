# Afield web application

This folder owns the runnable application, including its source, tests, database migrations, worker entry points and app-specific configuration.

| Folder | Contents |
|---|---|
| [src](src) | Pages, UI, domain models, features and infrastructure adapters |
| [tests](tests) | Unit, disposable database and browser tests |
| [supabase/migrations](supabase/migrations) | Ordered database migrations |
| [scripts](scripts) | Readiness, bounded connection checks and local worker |

Run `npm ci` and the usual `npm run dev`, `npm run build`, `npm test` and worker commands from the repository root. Root commands forward here through the npm workspace. Use the single root lockfile; do not add an application-specific lockfile.

Private local configuration belongs in `apps/web/.env.local` (relative to the repository root). Start from [.env.example](.env.example); never commit private values. App build/test/worker configuration stays in this folder beside [package.json](package.json).

[Product overview](../../README.md) · [Documentation](../../docs/README.md) · [Setup](../../docs/KEYS-AND-SETUP.md) · [Tests](../../docs/testing/TEST-PLAN.md).
