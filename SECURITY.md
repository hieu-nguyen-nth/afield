# Security policy

Report security issues privately to the repository owner through GitHub. Do not include credentials, private source text, admitted addresses, exports or signed media URLs in public issues. If a credential is exposed, revoke it at the provider, update private runtime environments and inspect affected access; deleting the visible file is insufficient.

Server keys stay out of browser/public variables. Supabase RLS, same-owner/run references, session/admission checks, same-origin mutations, guarded public-source retrieval and private media are core boundaries. Tests cover selected failures but do not establish a complete independent security audit. Live free-plan switches are operator attestations and do not guarantee billing/usage status. See [architecture](docs/technical/ARCHITECTURE.md) and [known gaps](docs/product/CHANGELOG.md).

No cloud credentials, user records or production seed is included. Use separate test environments and synthetic users. Keep the repository private and review staged files before publication.
