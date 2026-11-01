import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
);
for (const f of (await readdir("supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort())
  await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
const owner = "11111111-1111-4111-8111-111111111111";
await db.exec(
  `insert into auth.users values('${owner}','test@example.test',now());insert into private.allowed_emails values('test@example.test');set role authenticated;set request.jwt.claim.sub='${owner}';`,
);
const config = {
  name: "Adoption",
  goal: "Track news",
  depth: "working",
  preferences: "",
  subtopics: [],
  sources: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      name: "Source",
      url: "https://example.com",
      scope: "site",
      status: "approved",
    },
  ],
  templates: [
    {
      name: "Brief",
      limit: { type: "words", value: 400 },
      blocks: ["Main developments"],
    },
  ],
  activeTemplateIndex: 0,
  researchPolicy: "approved_only",
  schedule: {
    cadence: "weekly",
    weekday: 1,
    time: "08:00",
    timezone: "America/Los_Angeles",
  },
};
const t = (
  await db.query<{ id: string }>(
    "select public.save_topic(null,$1::jsonb,null) id",
    [JSON.stringify(config)],
  )
).rows[0].id;
await db.query(
  "select public.topic_action($1,'activate',now()+interval '1 day')",
  [t],
);
const r = (
  await db.query<{ id: string }>(
    "select public.accept_run('update',$1,$2::jsonb,'mode-test-1','hash') id",
    [t, JSON.stringify({ sourceMode: "web_only" })],
  )
).rows[0].id;
assert.equal(
  (
    await db.query<{ snapshot: { sourceMode: string } }>(
      "select snapshot from public.runs where id=$1",
      [r],
    )
  ).rows[0].snapshot.sourceMode,
  "web_only",
);
assert.equal(
  (
    await db.query<{ config: { researchPolicy: string } }>(
      "select config from public.topics where id=$1",
      [t],
    )
  ).rows[0].config.researchPolicy,
  "approved_only",
);
console.log(
  "PASS: source override is snapshotted; saved policy remains unchanged.",
);
const searchRun = (
  await db.query<{ id: string }>(
    "select public.accept_run('explore',null,$1::jsonb,'search-mode-fixture','search-hash') id",
    [
      JSON.stringify({
        prompt: "Enterprise AI",
        limit: { type: "words", value: 400 },
        sourceMode: "sources_only",
        sources: [
          { url: "https://example.com/analysis/", scope: "search" },
          { url: "https://other.example/article", scope: "page" },
        ],
      }),
    ],
  )
).rows[0].id;
const savedSearch = (
  await db.query<{ snapshot: { sources: { scope: string }[] } }>(
    "select snapshot from public.runs where id=$1",
    [searchRun],
  )
).rows[0].snapshot;
assert.deepEqual(
  savedSearch.sources.map((source) => source.scope),
  ["search", "page"],
);
console.log(
  "PASS: mixed per-source search and exact-page settings persist in the accepted run.",
);
await db.close();
