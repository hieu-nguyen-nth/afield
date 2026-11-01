# Current implementation status

Afield is an invite-only personal proof of concept with Explore and Stay Updated, owned persistence, explicit source coverage, text-first publication and requested private narration. Current requirements are [v0.5](docs/product/MASTER-PRD.md); [known gaps](docs/product/CHANGELOG.md) separate release targets from verified behavior.

Source is organized into domain models, feature logic, infrastructure adapters, route/UI entry points and local/hosted workers. Five ordered SQL migrations define the authoritative database. The latest PRDs, user guide, walkthrough and technical documents are included under [docs](docs/README.md). Local secrets, cloud linkage, private data, old plans and historical raw captures are excluded.

See [current test results](docs/testing/RESULTS.md) for this exact repository preparation and [deployment](docs/technical/DEPLOYMENT.md) for operating steps. GitHub publication is source delivery; hosted web/worker readiness remains a separate acceptance gate.
