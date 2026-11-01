# Documentation index

Current product baseline: **v0.5, October 31, 2026**. Documentation describes implemented behavior and explicitly identifies unverified targets. Earlier brainstorms, pre-split PRDs and raw historical evidence remain outside the published set.

| Read | Purpose |
|---|---|
| [Master PRD](product/MASTER-PRD.md) | Product goal, target readers, problems, scope, metrics and roadmap |
| [Explore PRD](product/EXPLORE-PRD.md) | One-off research requirements and acceptance criteria |
| [Stay Updated PRD](product/STAY-UPDATED-PRD.md) | Topic/source/template/schedule requirements and acceptance criteria |
| [Shared technical specification](product/SHARED-TECHNICAL-SPEC.md) | Detailed shared contracts and release requirements |
| [Current status and changes](product/CHANGELOG.md) | Known implementation gaps and live acceptance gates |
| [Product workflows](product/WORKFLOWS.md) | Explore, recurring updates, audio and account flows |
| [Walkthrough](walkthrough/README.md) | All main-flow screens with steps and reproducible fixture captures |
| [User guide](USER-GUIDE.md) | How to use Afield and recover from common problems |
| [Decision log](PRODUCT-DECISIONS.md) | Before/after decisions and implications |
| [Setup](KEYS-AND-SETUP.md) | Fresh-machine configuration and secret handling |
| [Product architecture](technical/PRODUCT-ARCHITECTURE.md) | Feature ownership, product journeys and persistence map |
| [Authentication model](technical/AUTHENTICATION.md) | Identity/contracts, sign-in flow, admission and ownership |
| [Development workflow](technical/DEVELOPMENT-WORKFLOW.md) | Feature folders, short-lived branches and pull requests |
| [Implementation status](technical/IMPLEMENTATION.md) | Current implementation boundary and outstanding acceptance |
| [Architecture](technical/ARCHITECTURE.md) | Components, execution and security boundaries |
| [Generated relational schema](technical/DATABASE-SCHEMA.md) | Actual columns, keys, constraints, indexes, RLS and grants from all migrations |
| [Data models](technical/DATA-MODELS.md) | Actual tables, relationships, JSON contracts and retention |
| [API](technical/API.md) | Current HTTP capabilities, request examples and failure behavior |
| [Deployment](technical/DEPLOYMENT.md) | Source publication, runtime setup, release/rollback checklist |
| [Test plan](testing/TEST-PLAN.md) | Case inventory, commands and acceptance boundaries |
| [Test results](testing/RESULTS.md) | Current checked source, outcomes and raw local evidence |

Workspace: [web application](../apps/web). Repository validation lives in [tooling](../tooling).

Source: [app](../apps/web/src/app) · [workspace shell](../apps/web/src/components) · [shared controls](../apps/web/src/shared) · [domain](../apps/web/src/features) · [features](../apps/web/src/features) · [infrastructure](../apps/web/src/infrastructure) · [config](../apps/web/src/config) · [core](../apps/web/src/core) · [worker entry points](../apps/web/src/trigger) · [migrations](../apps/web/supabase/migrations) · [scripts](../apps/web/scripts) · [tests](../apps/web/tests) · [automation](../.github).
