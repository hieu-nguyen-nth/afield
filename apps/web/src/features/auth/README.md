# Authentication

Start with [models.ts](models.ts). It defines the public `AuthIdentity`, the verified server `VerifiedAuthUser`, normalized email/password request validation, and password-update validation. These are application contracts; Supabase Auth owns persisted identities, password handling and sessions. The application does not maintain a separate password table.

| File / folder | Purpose |
|---|---|
| [handlers.ts](handlers.ts) | Email login/signup, Google OAuth/callback, reset/password update and sign-out |
| [session.ts](session.ts) | Verify the provider identity, confirmed email and current database admission |
| [access.ts](access.ts) | Service-side lookup of the sole invitation list |
| [feedback.ts](feedback.ts) | Reader-facing authentication messages |
| [ui/login.tsx](ui/login.tsx) | Sign-in and account-creation screen |
| [__tests__](__tests__) | Callback/access regressions and verified-session/revocation tests |

The cookie-aware Supabase client is an adapter in [infrastructure/supabase](../../infrastructure/supabase). URL/body checks are in [infrastructure/http](../../infrastructure/http); they are shared transport rules. The framework [auth route](../../app/api/auth/[action]/route.ts) delegates to this feature.

Database links: `auth.users.id` is the owner identity; `public.profiles.id` references it; private admission matches the verified email against `private.allowed_emails`; topic/run ownership and RLS restrict product data. Login does not grant admission, and account deletion denies further data access while cleanup is pending. See [authentication design](../../../../../docs/technical/AUTHENTICATION.md) for the full flow, table relationships and current verification limits.
