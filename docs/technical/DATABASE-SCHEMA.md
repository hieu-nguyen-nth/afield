# Relational database schema — generated reference

Generated locally by applying all 5 committed migrations to disposable PostgreSQL and reading its catalogs. This describes the **21 application tables** after all migrations, not a production-data export or the full provider-managed Auth/Storage schema.

Regenerate from the repository root with `npm run docs:schema`. [Model relationships](DATA-MODELS.md) · [Authentication](AUTHENTICATION.md) · [Migration source](../../apps/web/supabase/migrations). The migrations remain authoritative; function bodies, triggers and their permissions must be reviewed there.

Migrations: `20261028104228_initial_learning_brief.sql`, `20261028120924_private_retention_and_run_events.sql`, `20261028193403_afield_opt_in_audio_cache.sql`, `20261030055500_explicit_source_modes.sql`, `20261101000321_single_access_list.sql`.

## private.allowed_emails

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `email` | text (text) | NO | — |

Constraints:

- `allowed_emails_email_check`: `CHECK ((email = lower(email)))`
- `allowed_emails_email_not_null`: `NOT NULL email`
- `allowed_emails_pkey`: `PRIMARY KEY (email)`

Indexes:

- `CREATE UNIQUE INDEX allowed_emails_pkey ON private.allowed_emails USING btree (email)`

Reader/worker grants: `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

No policies; enabling RLS alone does not grant browser access.

## private.usage

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `metric` | text (text) | NO | — |
| `period` | text (text) | NO | — |
| `used` | bigint (int8) | NO | 0 |

Constraints:

- `usage_metric_not_null`: `NOT NULL metric`
- `usage_period_not_null`: `NOT NULL period`
- `usage_pkey`: `PRIMARY KEY (metric, period)`
- `usage_used_not_null`: `NOT NULL used`

Indexes:

- `CREATE UNIQUE INDEX usage_pkey ON private.usage USING btree (metric, period)`

Reader/worker grants: `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

No policies; enabling RLS alone does not grant browser access.

## public.audio_assets

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | gen_random_uuid() |
| `owner_id` | uuid (uuid) | NO | — |
| `run_id` | uuid (uuid) | NO | — |
| `text_hash` | text (text) | NO | — |
| `voice` | jsonb (jsonb) | NO | — |
| `storage_path` | text (text) | NO | — |
| `duration` | double precision (float8) | NO | — |
| `byte_size` | bigint (int8) | NO | — |
| `status` | text (text) | NO | — |
| `attempt` | integer (int4) | NO | — |
| `error` | text (text) | YES | — |
| `created_at` | timestamp with time zone (timestamptz) | NO | now() |
| `profile_key` | text (text) | NO | 'legacy'::text |

Constraints:

- `audio_assets_attempt_not_null`: `NOT NULL attempt`
- `audio_assets_byte_size_check`: `CHECK ((byte_size > 0))`
- `audio_assets_byte_size_not_null`: `NOT NULL byte_size`
- `audio_assets_created_at_not_null`: `NOT NULL created_at`
- `audio_assets_duration_check`: `CHECK ((duration > (0)::double precision))`
- `audio_assets_duration_not_null`: `NOT NULL duration`
- `audio_assets_id_not_null`: `NOT NULL id`
- `audio_assets_id_owner_id_run_id_text_hash_key`: `UNIQUE (id, owner_id, run_id, text_hash)`
- `audio_assets_owner_id_not_null`: `NOT NULL owner_id`
- `audio_assets_pkey`: `PRIMARY KEY (id)`
- `audio_assets_profile_key_not_null`: `NOT NULL profile_key`
- `audio_assets_run_id_not_null`: `NOT NULL run_id`
- `audio_assets_run_id_owner_id_fkey`: `FOREIGN KEY (run_id, owner_id) REFERENCES runs(id, owner_id) ON DELETE CASCADE`
- `audio_assets_status_check`: `CHECK ((status = ANY (ARRAY['processing'::text, 'ready'::text, 'failed'::text])))`
- `audio_assets_status_not_null`: `NOT NULL status`
- `audio_assets_storage_path_not_null`: `NOT NULL storage_path`
- `audio_assets_text_hash_not_null`: `NOT NULL text_hash`
- `audio_assets_voice_not_null`: `NOT NULL voice`

Indexes:

- `CREATE INDEX audio_asset_cache ON public.audio_assets USING btree (owner_id, text_hash, profile_key) WHERE (status = 'ready'::text)`
- `CREATE INDEX audio_asset_object_refs ON public.audio_assets USING btree (storage_path)`
- `CREATE UNIQUE INDEX audio_assets_id_owner_id_run_id_text_hash_key ON public.audio_assets USING btree (id, owner_id, run_id, text_hash)`
- `CREATE UNIQUE INDEX audio_assets_pkey ON public.audio_assets USING btree (id)`
- `CREATE INDEX audio_assets_run_id_created_at_idx ON public.audio_assets USING btree (run_id, created_at DESC)`

Reader/worker grants: `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.audio_jobs

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | gen_random_uuid() |
| `owner_id` | uuid (uuid) | NO | — |
| `brief_id` | uuid (uuid) | NO | — |
| `status` | text (text) | NO | 'queued'::text |
| `lease_token` | uuid (uuid) | YES | — |
| `lease_until` | timestamp with time zone (timestamptz) | YES | — |
| `created_at` | timestamp with time zone (timestamptz) | NO | now() |
| `attempts` | integer (int4) | NO | 0 |

Constraints:

- `audio_jobs_attempts_not_null`: `NOT NULL attempts`
- `audio_jobs_brief_id_not_null`: `NOT NULL brief_id`
- `audio_jobs_brief_id_owner_id_fkey`: `FOREIGN KEY (brief_id, owner_id) REFERENCES briefs(id, owner_id) ON DELETE CASCADE`
- `audio_jobs_created_at_not_null`: `NOT NULL created_at`
- `audio_jobs_id_not_null`: `NOT NULL id`
- `audio_jobs_owner_id_not_null`: `NOT NULL owner_id`
- `audio_jobs_pkey`: `PRIMARY KEY (id)`
- `audio_jobs_status_check`: `CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'completed'::text, 'failed'::text])))`
- `audio_jobs_status_not_null`: `NOT NULL status`

Indexes:

- `CREATE UNIQUE INDEX audio_jobs_pkey ON public.audio_jobs USING btree (id)`
- `CREATE UNIQUE INDEX one_audio_job ON public.audio_jobs USING btree (brief_id) WHERE (status = ANY (ARRAY['queued'::text, 'running'::text]))`

Reader/worker grants: `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

No policies; enabling RLS alone does not grant browser access.

## public.brief_items

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | gen_random_uuid() |
| `owner_id` | uuid (uuid) | NO | — |
| `brief_id` | uuid (uuid) | NO | — |
| `run_id` | uuid (uuid) | NO | — |
| `position` | integer (int4) | NO | — |
| `item` | jsonb (jsonb) | NO | — |

Constraints:

- `brief_items_brief_id_not_null`: `NOT NULL brief_id`
- `brief_items_brief_id_owner_id_fkey`: `FOREIGN KEY (brief_id, owner_id) REFERENCES briefs(id, owner_id) ON DELETE CASCADE`
- `brief_items_id_not_null`: `NOT NULL id`
- `brief_items_id_owner_id_run_id_key`: `UNIQUE (id, owner_id, run_id)`
- `brief_items_item_not_null`: `NOT NULL item`
- `brief_items_owner_id_not_null`: `NOT NULL owner_id`
- `brief_items_pkey`: `PRIMARY KEY (id)`
- `brief_items_position_not_null`: `NOT NULL "position"`
- `brief_items_run_id_not_null`: `NOT NULL run_id`
- `brief_items_run_id_owner_id_fkey`: `FOREIGN KEY (run_id, owner_id) REFERENCES runs(id, owner_id) ON DELETE CASCADE`

Indexes:

- `CREATE UNIQUE INDEX brief_items_id_owner_id_run_id_key ON public.brief_items USING btree (id, owner_id, run_id)`
- `CREATE UNIQUE INDEX brief_items_pkey ON public.brief_items USING btree (id)`

Reader/worker grants: `authenticated: SELECT`, `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.briefs

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | gen_random_uuid() |
| `owner_id` | uuid (uuid) | NO | — |
| `run_id` | uuid (uuid) | NO | — |
| `topic_id` | uuid (uuid) | YES | — |
| `intent` | text (text) | NO | — |
| `title` | text (text) | NO | — |
| `content` | jsonb (jsonb) | NO | — |
| `canonical_text` | text (text) | NO | — |
| `text_hash` | text (text) | NO | — |
| `word_count` | integer (int4) | NO | — |
| `snapshot` | jsonb (jsonb) | NO | — |
| `citations` | jsonb (jsonb) | NO | — |
| `budget_status` | text (text) | NO | — |
| `audio_status` | text (text) | NO | — |
| `audio_error` | text (text) | YES | — |
| `selected_audio_id` | uuid (uuid) | YES | — |
| `partial` | boolean (bool) | NO | false |
| `created_at` | timestamp with time zone (timestamptz) | NO | now() |

Constraints:

- `briefs_audio_status_check`: `CHECK ((audio_status = ANY (ARRAY['not_requested'::text, 'pending'::text, 'processing'::text, 'ready'::text, 'failed'::text])))`
- `briefs_audio_status_not_null`: `NOT NULL audio_status`
- `briefs_budget_status_check`: `CHECK ((budget_status = ANY (ARRAY['met'::text, 'unverified'::text, 'not_met'::text])))`
- `briefs_budget_status_not_null`: `NOT NULL budget_status`
- `briefs_canonical_text_not_null`: `NOT NULL canonical_text`
- `briefs_check`: `CHECK ((((intent = 'explore'::text) AND (topic_id IS NULL)) OR ((intent = 'update'::text) AND (topic_id IS NOT NULL))))`
- `briefs_citations_not_null`: `NOT NULL citations`
- `briefs_content_not_null`: `NOT NULL content`
- `briefs_created_at_not_null`: `NOT NULL created_at`
- `briefs_id_not_null`: `NOT NULL id`
- `briefs_id_owner_id_key`: `UNIQUE (id, owner_id)`
- `briefs_intent_check`: `CHECK ((intent = ANY (ARRAY['explore'::text, 'update'::text])))`
- `briefs_intent_not_null`: `NOT NULL intent`
- `briefs_owner_id_not_null`: `NOT NULL owner_id`
- `briefs_partial_not_null`: `NOT NULL partial`
- `briefs_pkey`: `PRIMARY KEY (id)`
- `briefs_run_id_key`: `UNIQUE (run_id)`
- `briefs_run_id_not_null`: `NOT NULL run_id`
- `briefs_run_id_owner_id_fkey`: `FOREIGN KEY (run_id, owner_id) REFERENCES runs(id, owner_id) ON DELETE CASCADE`
- `briefs_selected_audio_id_owner_id_run_id_text_hash_fkey`: `FOREIGN KEY (selected_audio_id, owner_id, run_id, text_hash) REFERENCES audio_assets(id, owner_id, run_id, text_hash)`
- `briefs_snapshot_not_null`: `NOT NULL snapshot`
- `briefs_text_hash_not_null`: `NOT NULL text_hash`
- `briefs_title_not_null`: `NOT NULL title`
- `briefs_topic_id_owner_id_fkey`: `FOREIGN KEY (topic_id, owner_id) REFERENCES topics(id, owner_id)`
- `briefs_word_count_not_null`: `NOT NULL word_count`

Indexes:

- `CREATE UNIQUE INDEX briefs_id_owner_id_key ON public.briefs USING btree (id, owner_id)`
- `CREATE INDEX briefs_owner_id_created_at_id_idx ON public.briefs USING btree (owner_id, created_at DESC, id DESC)`
- `CREATE UNIQUE INDEX briefs_pkey ON public.briefs USING btree (id)`
- `CREATE UNIQUE INDEX briefs_run_id_key ON public.briefs USING btree (run_id)`
- `CREATE INDEX briefs_topic_id_created_at_idx ON public.briefs USING btree (topic_id, created_at DESC)`

Reader/worker grants: `authenticated: SELECT`, `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.citations

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | gen_random_uuid() |
| `owner_id` | uuid (uuid) | NO | — |
| `run_id` | uuid (uuid) | NO | — |
| `item_id` | uuid (uuid) | NO | — |
| `document_id` | uuid (uuid) | NO | — |

Constraints:

- `citations_document_id_not_null`: `NOT NULL document_id`
- `citations_document_id_owner_id_run_id_fkey`: `FOREIGN KEY (document_id, owner_id, run_id) REFERENCES documents(id, owner_id, run_id)`
- `citations_id_not_null`: `NOT NULL id`
- `citations_item_id_not_null`: `NOT NULL item_id`
- `citations_item_id_owner_id_run_id_fkey`: `FOREIGN KEY (item_id, owner_id, run_id) REFERENCES brief_items(id, owner_id, run_id) ON DELETE CASCADE`
- `citations_owner_id_not_null`: `NOT NULL owner_id`
- `citations_pkey`: `PRIMARY KEY (id)`
- `citations_run_id_not_null`: `NOT NULL run_id`

Indexes:

- `CREATE UNIQUE INDEX citations_pkey ON public.citations USING btree (id)`

Reader/worker grants: `authenticated: SELECT`, `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.documents

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | — |
| `run_id` | uuid (uuid) | NO | — |
| `owner_id` | uuid (uuid) | NO | — |
| `url` | text (text) | NO | — |
| `title` | text (text) | NO | — |
| `publisher` | text (text) | NO | — |
| `published_at` | timestamp with time zone (timestamptz) | YES | — |
| `retrieved_at` | timestamp with time zone (timestamptz) | NO | now() |
| `content_hash` | text (text) | NO | — |
| `text` | text (text) | NO | — |
| `origin` | text (text) | NO | — |

Constraints:

- `documents_content_hash_not_null`: `NOT NULL content_hash`
- `documents_id_not_null`: `NOT NULL id`
- `documents_id_owner_id_run_id_key`: `UNIQUE (id, owner_id, run_id)`
- `documents_origin_check`: `CHECK ((origin = ANY (ARRAY['followed'::text, 'discovered'::text])))`
- `documents_origin_not_null`: `NOT NULL origin`
- `documents_owner_id_not_null`: `NOT NULL owner_id`
- `documents_pkey`: `PRIMARY KEY (id)`
- `documents_publisher_not_null`: `NOT NULL publisher`
- `documents_retrieved_at_not_null`: `NOT NULL retrieved_at`
- `documents_run_id_not_null`: `NOT NULL run_id`
- `documents_run_id_owner_id_fkey`: `FOREIGN KEY (run_id, owner_id) REFERENCES runs(id, owner_id) ON DELETE CASCADE`
- `documents_text_not_null`: `NOT NULL text`
- `documents_title_not_null`: `NOT NULL title`
- `documents_url_not_null`: `NOT NULL url`

Indexes:

- `CREATE UNIQUE INDEX documents_id_owner_id_run_id_key ON public.documents USING btree (id, owner_id, run_id)`
- `CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id)`
- `CREATE INDEX documents_run_id_idx ON public.documents USING btree (run_id)`

Reader/worker grants: `authenticated: SELECT`, `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.events

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | gen_random_uuid() |
| `owner_id` | uuid (uuid) | NO | — |
| `topic_id` | uuid (uuid) | NO | — |
| `brief_id` | uuid (uuid) | NO | — |
| `event_key` | text (text) | NO | — |
| `summary` | text (text) | NO | — |
| `created_at` | timestamp with time zone (timestamptz) | NO | now() |

Constraints:

- `events_brief_id_not_null`: `NOT NULL brief_id`
- `events_brief_id_owner_id_fkey`: `FOREIGN KEY (brief_id, owner_id) REFERENCES briefs(id, owner_id) ON DELETE CASCADE`
- `events_created_at_not_null`: `NOT NULL created_at`
- `events_event_key_not_null`: `NOT NULL event_key`
- `events_id_not_null`: `NOT NULL id`
- `events_owner_id_not_null`: `NOT NULL owner_id`
- `events_pkey`: `PRIMARY KEY (id)`
- `events_summary_not_null`: `NOT NULL summary`
- `events_topic_id_not_null`: `NOT NULL topic_id`
- `events_topic_id_owner_id_fkey`: `FOREIGN KEY (topic_id, owner_id) REFERENCES topics(id, owner_id)`

Indexes:

- `CREATE UNIQUE INDEX events_pkey ON public.events USING btree (id)`
- `CREATE INDEX events_topic_id_created_at_idx ON public.events USING btree (topic_id, created_at DESC)`

Reader/worker grants: `authenticated: SELECT`, `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.outbox

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `run_id` | uuid (uuid) | NO | — |
| `dispatched_at` | timestamp with time zone (timestamptz) | YES | — |
| `attempts` | integer (int4) | NO | 0 |

Constraints:

- `outbox_attempts_not_null`: `NOT NULL attempts`
- `outbox_pkey`: `PRIMARY KEY (run_id)`
- `outbox_run_id_fkey`: `FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE`
- `outbox_run_id_not_null`: `NOT NULL run_id`

Indexes:

- `CREATE UNIQUE INDEX outbox_pkey ON public.outbox USING btree (run_id)`

Reader/worker grants: `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

No policies; enabling RLS alone does not grant browser access.

## public.profiles

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | — |
| `timezone` | text (text) | NO | 'America/Los_Angeles'::text |
| `deleted_at` | timestamp with time zone (timestamptz) | YES | — |

Constraints:

- `profiles_id_fkey`: `FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE`
- `profiles_id_not_null`: `NOT NULL id`
- `profiles_pkey`: `PRIMARY KEY (id)`
- `profiles_timezone_not_null`: `NOT NULL timezone`

Indexes:

- `CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id)`

Reader/worker grants: `authenticated: SELECT`, `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.review_records

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | gen_random_uuid() |
| `owner_id` | uuid (uuid) | NO | — |
| `brief_id` | uuid (uuid) | NO | — |
| `usefulness` | integer (int4) | YES | — |
| `notes` | text (text) | YES | — |
| `created_at` | timestamp with time zone (timestamptz) | NO | now() |

Constraints:

- `review_records_brief_id_not_null`: `NOT NULL brief_id`
- `review_records_brief_id_owner_id_fkey`: `FOREIGN KEY (brief_id, owner_id) REFERENCES briefs(id, owner_id) ON DELETE CASCADE`
- `review_records_created_at_not_null`: `NOT NULL created_at`
- `review_records_id_not_null`: `NOT NULL id`
- `review_records_owner_id_not_null`: `NOT NULL owner_id`
- `review_records_pkey`: `PRIMARY KEY (id)`
- `review_records_usefulness_check`: `CHECK (((usefulness >= 1) AND (usefulness <= 5)))`

Indexes:

- `CREATE UNIQUE INDEX review_records_pkey ON public.review_records USING btree (id)`

Reader/worker grants: `authenticated: SELECT`, `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.run_events

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | gen_random_uuid() |
| `owner_id` | uuid (uuid) | NO | — |
| `run_id` | uuid (uuid) | NO | — |
| `stage` | text (text) | NO | — |
| `status` | text (text) | NO | — |
| `error_code` | text (text) | YES | — |
| `created_at` | timestamp with time zone (timestamptz) | NO | now() |

Constraints:

- `run_events_created_at_not_null`: `NOT NULL created_at`
- `run_events_id_not_null`: `NOT NULL id`
- `run_events_owner_id_not_null`: `NOT NULL owner_id`
- `run_events_pkey`: `PRIMARY KEY (id)`
- `run_events_run_id_not_null`: `NOT NULL run_id`
- `run_events_run_id_owner_id_fkey`: `FOREIGN KEY (run_id, owner_id) REFERENCES runs(id, owner_id) ON DELETE CASCADE`
- `run_events_stage_not_null`: `NOT NULL stage`
- `run_events_status_not_null`: `NOT NULL status`

Indexes:

- `CREATE INDEX run_events_owner_run ON public.run_events USING btree (owner_id, run_id, created_at)`
- `CREATE UNIQUE INDEX run_events_pkey ON public.run_events USING btree (id)`

Reader/worker grants: `authenticated: SELECT`, `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.runs

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | gen_random_uuid() |
| `owner_id` | uuid (uuid) | NO | — |
| `topic_id` | uuid (uuid) | YES | — |
| `intent` | text (text) | NO | — |
| `trigger` | text (text) | NO | — |
| `request_key` | text (text) | NO | — |
| `request_hash` | text (text) | NO | — |
| `snapshot` | jsonb (jsonb) | NO | — |
| `status` | text (text) | NO | 'queued'::text |
| `stage` | text (text) | NO | 'queued'::text |
| `error` | jsonb (jsonb) | YES | — |
| `draft` | jsonb (jsonb) | NO | '{}'::jsonb |
| `lease_token` | uuid (uuid) | YES | — |
| `lease_until` | timestamp with time zone (timestamptz) | YES | — |
| `next_eligible_at` | timestamp with time zone (timestamptz) | YES | — |
| `attempts` | integer (int4) | NO | 0 |
| `created_at` | timestamp with time zone (timestamptz) | NO | now() |
| `updated_at` | timestamp with time zone (timestamptz) | NO | now() |

Constraints:

- `runs_attempts_not_null`: `NOT NULL attempts`
- `runs_check`: `CHECK ((((intent = 'explore'::text) AND (topic_id IS NULL) AND (trigger = 'manual'::text)) OR ((intent = 'update'::text) AND (topic_id IS NOT NULL))))`
- `runs_created_at_not_null`: `NOT NULL created_at`
- `runs_draft_not_null`: `NOT NULL draft`
- `runs_id_not_null`: `NOT NULL id`
- `runs_id_owner_id_key`: `UNIQUE (id, owner_id)`
- `runs_intent_check`: `CHECK ((intent = ANY (ARRAY['explore'::text, 'update'::text])))`
- `runs_intent_not_null`: `NOT NULL intent`
- `runs_owner_id_fkey`: `FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE`
- `runs_owner_id_intent_request_key_key`: `UNIQUE (owner_id, intent, request_key)`
- `runs_owner_id_not_null`: `NOT NULL owner_id`
- `runs_pkey`: `PRIMARY KEY (id)`
- `runs_request_hash_not_null`: `NOT NULL request_hash`
- `runs_request_key_check`: `CHECK (((length(request_key) >= 8) AND (length(request_key) <= 200)))`
- `runs_request_key_not_null`: `NOT NULL request_key`
- `runs_snapshot_not_null`: `NOT NULL snapshot`
- `runs_stage_not_null`: `NOT NULL stage`
- `runs_status_check`: `CHECK ((status = ANY (ARRAY['queued'::text, 'running'::text, 'completed'::text, 'failed'::text, 'skipped'::text])))`
- `runs_status_not_null`: `NOT NULL status`
- `runs_topic_id_owner_id_fkey`: `FOREIGN KEY (topic_id, owner_id) REFERENCES topics(id, owner_id)`
- `runs_trigger_check`: `CHECK ((trigger = ANY (ARRAY['manual'::text, 'scheduled'::text])))`
- `runs_trigger_not_null`: `NOT NULL trigger`
- `runs_updated_at_not_null`: `NOT NULL updated_at`

Indexes:

- `CREATE UNIQUE INDEX runs_id_owner_id_key ON public.runs USING btree (id, owner_id)`
- `CREATE INDEX runs_owner_id_created_at_id_idx ON public.runs USING btree (owner_id, created_at DESC, id DESC)`
- `CREATE UNIQUE INDEX runs_owner_id_intent_request_key_key ON public.runs USING btree (owner_id, intent, request_key)`
- `CREATE UNIQUE INDEX runs_pkey ON public.runs USING btree (id)`
- `CREATE INDEX runs_status_next_eligible_at_lease_until_idx ON public.runs USING btree (status, next_eligible_at, lease_until)`

Reader/worker grants: `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.schedules

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `topic_id` | uuid (uuid) | NO | — |
| `owner_id` | uuid (uuid) | NO | — |
| `config` | jsonb (jsonb) | NO | — |
| `next_at` | timestamp with time zone (timestamptz) | YES | — |
| `checkpoint` | timestamp with time zone (timestamptz) | YES | — |

Constraints:

- `schedules_config_not_null`: `NOT NULL config`
- `schedules_owner_id_not_null`: `NOT NULL owner_id`
- `schedules_pkey`: `PRIMARY KEY (topic_id)`
- `schedules_topic_id_not_null`: `NOT NULL topic_id`
- `schedules_topic_id_owner_id_fkey`: `FOREIGN KEY (topic_id, owner_id) REFERENCES topics(id, owner_id) ON DELETE CASCADE`

Indexes:

- `CREATE INDEX schedules_next_at_idx ON public.schedules USING btree (next_at)`
- `CREATE UNIQUE INDEX schedules_pkey ON public.schedules USING btree (topic_id)`

Reader/worker grants: `authenticated: SELECT`, `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.source_checks

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | gen_random_uuid() |
| `run_id` | uuid (uuid) | NO | — |
| `owner_id` | uuid (uuid) | NO | — |
| `scope` | text (text) | NO | — |
| `outcome` | text (text) | NO | — |
| `document_count` | integer (int4) | NO | — |
| `reason` | text (text) | YES | — |
| `checked_at` | timestamp with time zone (timestamptz) | NO | now() |

Constraints:

- `source_checks_checked_at_not_null`: `NOT NULL checked_at`
- `source_checks_document_count_not_null`: `NOT NULL document_count`
- `source_checks_id_not_null`: `NOT NULL id`
- `source_checks_outcome_check`: `CHECK ((outcome = ANY (ARRAY['success'::text, 'empty'::text, 'blocked'::text, 'failed'::text])))`
- `source_checks_outcome_not_null`: `NOT NULL outcome`
- `source_checks_owner_id_not_null`: `NOT NULL owner_id`
- `source_checks_pkey`: `PRIMARY KEY (id)`
- `source_checks_run_id_not_null`: `NOT NULL run_id`
- `source_checks_run_id_owner_id_fkey`: `FOREIGN KEY (run_id, owner_id) REFERENCES runs(id, owner_id) ON DELETE CASCADE`
- `source_checks_scope_not_null`: `NOT NULL scope`

Indexes:

- `CREATE UNIQUE INDEX source_checks_pkey ON public.source_checks USING btree (id)`
- `CREATE INDEX source_checks_run_id_idx ON public.source_checks USING btree (run_id)`

Reader/worker grants: `authenticated: SELECT`, `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.sources

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | gen_random_uuid() |
| `owner_id` | uuid (uuid) | NO | — |
| `topic_id` | uuid (uuid) | NO | — |
| `config` | jsonb (jsonb) | NO | — |
| `created_at` | timestamp with time zone (timestamptz) | NO | now() |

Constraints:

- `sources_config_not_null`: `NOT NULL config`
- `sources_created_at_not_null`: `NOT NULL created_at`
- `sources_id_not_null`: `NOT NULL id`
- `sources_id_owner_id_topic_id_key`: `UNIQUE (id, owner_id, topic_id)`
- `sources_owner_id_not_null`: `NOT NULL owner_id`
- `sources_pkey`: `PRIMARY KEY (id)`
- `sources_topic_id_not_null`: `NOT NULL topic_id`
- `sources_topic_id_owner_id_fkey`: `FOREIGN KEY (topic_id, owner_id) REFERENCES topics(id, owner_id) ON DELETE CASCADE`

Indexes:

- `CREATE UNIQUE INDEX sources_id_owner_id_topic_id_key ON public.sources USING btree (id, owner_id, topic_id)`
- `CREATE UNIQUE INDEX sources_pkey ON public.sources USING btree (id)`

Reader/worker grants: `authenticated: SELECT`, `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.subtopics

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | gen_random_uuid() |
| `owner_id` | uuid (uuid) | NO | — |
| `topic_id` | uuid (uuid) | NO | — |
| `name` | text (text) | NO | — |
| `position` | integer (int4) | NO | — |

Constraints:

- `subtopics_id_not_null`: `NOT NULL id`
- `subtopics_name_not_null`: `NOT NULL name`
- `subtopics_owner_id_not_null`: `NOT NULL owner_id`
- `subtopics_pkey`: `PRIMARY KEY (id)`
- `subtopics_position_not_null`: `NOT NULL "position"`
- `subtopics_topic_id_not_null`: `NOT NULL topic_id`
- `subtopics_topic_id_owner_id_fkey`: `FOREIGN KEY (topic_id, owner_id) REFERENCES topics(id, owner_id) ON DELETE CASCADE`

Indexes:

- `CREATE UNIQUE INDEX subtopics_pkey ON public.subtopics USING btree (id)`

Reader/worker grants: `authenticated: SELECT`, `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.template_blocks

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | gen_random_uuid() |
| `owner_id` | uuid (uuid) | NO | — |
| `topic_id` | uuid (uuid) | NO | — |
| `template_id` | uuid (uuid) | NO | — |
| `position` | integer (int4) | NO | — |
| `block_type` | text (text) | NO | — |

Constraints:

- `template_blocks_block_type_not_null`: `NOT NULL block_type`
- `template_blocks_id_not_null`: `NOT NULL id`
- `template_blocks_owner_id_not_null`: `NOT NULL owner_id`
- `template_blocks_pkey`: `PRIMARY KEY (id)`
- `template_blocks_position_not_null`: `NOT NULL "position"`
- `template_blocks_template_id_not_null`: `NOT NULL template_id`
- `template_blocks_template_id_owner_id_topic_id_fkey`: `FOREIGN KEY (template_id, owner_id, topic_id) REFERENCES templates(id, owner_id, topic_id) ON DELETE CASCADE`
- `template_blocks_topic_id_not_null`: `NOT NULL topic_id`

Indexes:

- `CREATE UNIQUE INDEX template_blocks_pkey ON public.template_blocks USING btree (id)`

Reader/worker grants: `authenticated: SELECT`, `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.templates

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | gen_random_uuid() |
| `owner_id` | uuid (uuid) | NO | — |
| `topic_id` | uuid (uuid) | NO | — |
| `name` | text (text) | NO | — |
| `config` | jsonb (jsonb) | NO | — |
| `version` | integer (int4) | NO | 1 |

Constraints:

- `templates_config_not_null`: `NOT NULL config`
- `templates_id_not_null`: `NOT NULL id`
- `templates_id_owner_id_topic_id_key`: `UNIQUE (id, owner_id, topic_id)`
- `templates_name_not_null`: `NOT NULL name`
- `templates_owner_id_not_null`: `NOT NULL owner_id`
- `templates_pkey`: `PRIMARY KEY (id)`
- `templates_topic_id_not_null`: `NOT NULL topic_id`
- `templates_topic_id_owner_id_fkey`: `FOREIGN KEY (topic_id, owner_id) REFERENCES topics(id, owner_id) ON DELETE CASCADE`
- `templates_version_not_null`: `NOT NULL version`

Indexes:

- `CREATE UNIQUE INDEX templates_id_owner_id_topic_id_key ON public.templates USING btree (id, owner_id, topic_id)`
- `CREATE UNIQUE INDEX templates_pkey ON public.templates USING btree (id)`

Reader/worker grants: `authenticated: SELECT`, `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.

## public.topics

Row-level security: **enabled**.

| Column | PostgreSQL type | Nullable | Default |
|---|---|---|---|
| `id` | uuid (uuid) | NO | gen_random_uuid() |
| `owner_id` | uuid (uuid) | NO | — |
| `name` | text (text) | NO | — |
| `config` | jsonb (jsonb) | NO | — |
| `status` | text (text) | NO | 'draft'::text |
| `confirmed` | boolean (bool) | NO | false |
| `pause_reason` | text (text) | YES | — |
| `origin_brief_id` | uuid (uuid) | YES | — |
| `created_at` | timestamp with time zone (timestamptz) | NO | now() |
| `updated_at` | timestamp with time zone (timestamptz) | NO | now() |

Constraints:

- `topics_config_not_null`: `NOT NULL config`
- `topics_confirmed_not_null`: `NOT NULL confirmed`
- `topics_created_at_not_null`: `NOT NULL created_at`
- `topics_id_not_null`: `NOT NULL id`
- `topics_id_owner_id_key`: `UNIQUE (id, owner_id)`
- `topics_name_not_null`: `NOT NULL name`
- `topics_origin_brief_id_owner_id_fkey`: `FOREIGN KEY (origin_brief_id, owner_id) REFERENCES briefs(id, owner_id)`
- `topics_owner_id_fkey`: `FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE`
- `topics_owner_id_not_null`: `NOT NULL owner_id`
- `topics_pkey`: `PRIMARY KEY (id)`
- `topics_status_check`: `CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text])))`
- `topics_status_not_null`: `NOT NULL status`
- `topics_updated_at_not_null`: `NOT NULL updated_at`

Indexes:

- `CREATE UNIQUE INDEX topics_id_owner_id_key ON public.topics USING btree (id, owner_id)`
- `CREATE INDEX topics_owner_id_created_at_idx ON public.topics USING btree (owner_id, created_at DESC)`
- `CREATE UNIQUE INDEX topics_pkey ON public.topics USING btree (id)`

Reader/worker grants: `authenticated: SELECT`, `service_role: DELETE`, `service_role: INSERT`, `service_role: REFERENCES`, `service_role: SELECT`, `service_role: TRIGGER`, `service_role: TRUNCATE`, `service_role: UPDATE`.

RLS policies:

- `owned_read` (SELECT, roles: authenticated): USING `((owner_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.admitted() AS admitted))`; WITH CHECK `—`.
