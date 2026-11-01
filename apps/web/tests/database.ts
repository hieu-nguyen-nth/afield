import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
let checks = 0;
await db.exec(
  `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`,
);
const files = (await readdir("supabase/migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort();
for (const f of files)
  await db.exec(await readFile("supabase/migrations/" + f, "utf8"));
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222";
await db.exec(
  `insert into auth.users values('${a}','a@example.test',now()),('${b}','b@example.test',now());insert into private.allowed_emails values('a@example.test'),('b@example.test');`,
);
async function asUser(id: string) {
  await db.exec(
    `reset role;set role authenticated;set request.jwt.claim.sub='${id}';`,
  );
}
async function privileged() {
  await db.exec("reset role;");
}
async function fails(fn: () => Promise<unknown>, label: string) {
  await assert.rejects(fn, label);
  checks++;
}
await db.exec("set role service_role");
assert.equal(
  (
    await db.query<{ allowed: boolean }>(
      "select public.is_email_allowed(' A@EXAMPLE.TEST ') as allowed",
    )
  ).rows[0].allowed,
  true,
);
assert.equal(
  (
    await db.query<{ allowed: boolean }>(
      "select public.is_email_allowed('missing@example.test') as allowed",
    )
  ).rows[0].allowed,
  false,
);
checks += 2;
await db.exec("reset role;set role anon");
await fails(
  () => db.query("select public.is_email_allowed('a@example.test')"),
  "anonymous cannot query invitations",
);
await asUser(a);
await fails(
  () => db.query("select public.is_email_allowed('a@example.test')"),
  "authenticated browsers cannot query invitations",
);
const source = "44444444-4444-4444-8444-444444444444",
  template = "55555555-5555-4555-8555-555555555555";
const config = {
  name: "AI",
  goal: "Understand changes",
  preferences: "",
  depth: "working",
  subtopics: ["Models"],
  researchPolicy: "approved_only",
  sources: [
    {
      id: source,
      url: "https://example.com/feed",
      name: "Feed",
      scope: "feed",
      status: "approved",
    },
  ],
  templates: [
    {
      id: template,
      name: "Default",
      tone: "Clear",
      limit: { type: "words", value: 800 },
      blocks: ["Main developments", "Sources"],
    },
  ],
  activeTemplateIndex: 0,
  schedule: {
    cadence: "weekly",
    weekday: 1,
    time: "08:00",
    timezone: "America/Los_Angeles",
  },
};
const topicResult = await db.query<{ id: string }>(
  "select public.save_topic(null,$1::jsonb,null) id",
  [JSON.stringify(config)],
);
const topicId = topicResult.rows[0].id;
assert.equal((await db.query("select id from public.sources")).rows.length, 1);
assert.equal(
  (await db.query("select id from public.template_blocks")).rows.length,
  2,
);
checks += 2;
await asUser(b);
await fails(
  () =>
    db.query("select public.save_topic(null,$1::jsonb,null)", [
      JSON.stringify(config),
    ]),
  "cross-owner source/template identifiers cannot be adopted",
);
await asUser(a);
await fails(
  () => db.query("select public.topic_action($1,'activate',null)", [topicId]),
  "activation requires a valid future schedule",
);
const input = {
  prompt: "An established concept",
  preferences: "",
  depth: "working",
  limit: { type: "words", value: 800 },
};
const first = await db.query<{ id: string }>(
  `select public.accept_run('explore',null,$1::jsonb,'request-0001','samehash') id`,
  [JSON.stringify(input)],
);
const run = first.rows[0].id;
const again = await db.query<{ id: string }>(
  `select public.accept_run('explore',null,$1::jsonb,'request-0001','samehash') id`,
  [JSON.stringify(input)],
);
assert.equal(again.rows[0].id, run);
checks++;
await fails(
  () =>
    db.query(
      `select public.accept_run('explore',null,$1::jsonb,'request-0001','changedhash')`,
      [JSON.stringify(input)],
    ),
  "same key cannot identify changed input",
);
await fails(
  () =>
    db.query(`update public.runs set status='completed' where id=$1`, [run]),
  "client cannot forge execution state",
);
await fails(
  () => db.query(`select draft from public.runs where id=$1`, [run]),
  "client cannot read private drafts",
);
await asUser(b);
assert.equal((await db.query("select id from public.runs")).rows.length, 0);
checks++;
await fails(
  () => db.query(`select public.retry_run($1)`, [run]),
  "cross-owner run mutation fails",
);
await fails(
  () => db.query(`select public.claim_run($1)`, [run]),
  "client cannot invoke worker commands",
);
await privileged();
const claimed = await db.query<{ r: { lease_token: string } }>(
  "select public.claim_run($1) r",
  [run],
);
const token = claimed.rows[0].r.lease_token;
await fails(
  () => db.query(`select public.checkpoint($1,$2,'writing','{}')`, [run, b]),
  "stale writer cannot checkpoint",
);
const doc = "33333333-3333-4333-8333-333333333333";
await db.query(
  `insert into public.documents(id,run_id,owner_id,url,title,publisher,content_hash,text,origin) values($1,$2,$3,'https://example.com/source','A source','example.com','hash','A supported claim.','discovered')`,
  [doc, run, a],
);
const content = {
  title: "Supported answer",
  noNews: false,
  limitations: [],
  blocks: [
    {
      heading: "Answer",
      items: [{ text: "A supported claim.", citationIds: [doc] }],
    },
  ],
};
const text = "Answer\n\nA supported claim.";
const published = await db.query<{ id: string }>(
  `select public.publish_brief($1,$2,$3::jsonb,$4,encode(sha256(convert_to($4,'UTF8')),'hex'),4,'met',false,null) id`,
  [run, token, JSON.stringify(content), text],
);
const brief = published.rows[0].id;
assert.equal(
  (
    await db.query<{ audio_status: string }>(
      "select audio_status from public.briefs where id=$1",
      [brief],
    )
  ).rows[0].audio_status,
  "not_requested",
);
assert.equal(
  (await db.query("select id from public.audio_jobs")).rows.length,
  0,
);
checks += 2;
await asUser(a);
const approval = (
  await db.query<{ v: { jobId: string } }>(
    "select public.request_audio($1) v",
    [brief],
  )
).rows[0].v;
const repeated = (
  await db.query<{ v: { jobId: string } }>(
    "select public.request_audio($1) v",
    [brief],
  )
).rows[0].v;
assert.equal(approval.jobId, repeated.jobId);
assert.equal(
  (
    await db.query<{ audio_status: string }>(
      "select audio_status from public.briefs where id=$1",
      [brief],
    )
  ).rows[0].audio_status,
  "processing",
);
checks += 2;
await asUser(b);
await fails(
  () => db.query("select public.request_audio($1)", [brief]),
  "foreign owner cannot approve or reuse audio",
);
await fails(
  () => db.query("select public.reuse_audio($1)", [brief]),
  "cache internals are service-only",
);
await privileged();

await fails(
  () =>
    db.query(
      `update public.briefs set canonical_text='rewritten' where id=$1`,
      [brief],
    ),
  "published text is immutable even to ordinary server updates",
);
await asUser(b);
assert.equal((await db.query("select id from public.briefs")).rows.length, 0);
assert.equal(
  (await db.query("select id from public.documents")).rows.length,
  0,
);
checks += 2;
await asUser(a);
assert.equal((await db.query("select id from public.briefs")).rows.length, 1);
checks++;
await fails(
  () =>
    db.query(
      `select public.publish_brief($1,$2,$3::jsonb,$4,'forged',4,'met',false,null)`,
      [run, token, JSON.stringify(content), text],
    ),
  "authenticated user cannot publish",
);
await privileged();
await db.query(`select public.finish_run($1,$2,null,null)`, [run, token]);
await asUser(a);
await db.query(
  `select public.accept_run('explore',null,$1::jsonb,'request-0002','two')`,
  [JSON.stringify(input)],
);
await db.query(
  `select public.accept_run('explore',null,$1::jsonb,'request-0003','three')`,
  [JSON.stringify(input)],
);
await fails(
  () =>
    db.query(
      `select public.accept_run('explore',null,$1::jsonb,'request-0004','four')`,
      [JSON.stringify(input)],
    ),
  "daily free quota is atomic",
);
await privileged();
const queued = (
  await db.query<{ id: string }>(
    "select id from public.runs where status='queued' order by created_at limit 1",
  )
).rows[0].id;
const current = (
  await db.query<{ claim: { lease_token: string } }>(
    "select public.claim_run($1) claim",
    [queued],
  )
).rows[0].claim;
await db.exec(
  "delete from private.allowed_emails where email='a@example.test'",
);
await fails(
  () =>
    db.query("select public.checkpoint($1,$2,'writing','{}')", [
      queued,
      current.lease_token,
    ]),
  "revoked owner cannot extend an in-flight lease",
);
await db.exec("insert into private.allowed_emails values('a@example.test')");
await asUser(a);
await db.query("select public.request_deletion()");
await fails(
  () => db.query("select public.get_usage()"),
  "account deletion immediately blocks admission",
);
await privileged();
assert.equal(
  (
    await db.query<{ claim: unknown }>("select public.claim_run($1) claim", [
      queued,
    ])
  ).rows[0].claim,
  null,
);
checks++;
const unused = "66666666-6666-4666-8666-666666666666";
await db.query(
  "update public.documents set retrieved_at=now()-interval '31 days' where id=$1",
  [doc],
);
await db.query(
  "insert into public.documents(id,run_id,owner_id,url,title,publisher,content_hash,text,origin,retrieved_at) values($1,$2,$3,'https://example.com/unused','Unused','Example','hash','Unused passage','discovered',now()-interval '31 days')",
  [unused, run, a],
);
await db.exec(
  "update public.run_events set created_at=now()-interval '15 days'",
);
await db.query("select public.retain_private_data()");
assert.equal(
  (await db.query("select id from public.documents where id=$1", [unused])).rows
    .length,
  0,
);
assert.equal(
  (await db.query("select id from public.documents where id=$1", [doc])).rows
    .length,
  1,
);
assert.equal(
  (
    await db.query(
      "select id from public.run_events where created_at<now()-interval '14 days'",
    )
  ).rows.length,
  0,
);
checks += 3;
const asset = "77777777-7777-4777-8777-777777777777";
// Restore synthetic admission only to exercise selected-media cleanup protection.
await db.query("update public.profiles set deleted_at=null where id=$1", [a]);
await db.query(
  "insert into public.audio_assets(id,owner_id,run_id,text_hash,voice,storage_path,duration,byte_size,status,attempt,created_at,profile_key) values($1,$2,$3,encode(sha256(convert_to($4,'UTF8')),'hex'),'{}','test/audio.mp3',1,100,'ready',1,now()-interval '2 days','gemini-3.8-flash-tts:Kore:mp3-mono-64k:equivalence-v1')",
  [asset, a, run, text],
);
await db.query("select public.attach_audio($1,$2,null)", [brief, asset]);
assert.equal(
  (await db.query("select id from public.orphan_audio()")).rows.length,
  0,
);
await db.query("select public.release_audio($1)", [asset]);
assert.equal(
  (await db.query("select id from public.audio_assets where id=$1", [asset]))
    .rows.length,
  1,
);
checks += 2;

async function copyBrief(
  owner: string,
  suffix: string,
  change = false,
  duration?: number,
) {
  const rr = (
    await db.query<{ id: string }>(
      "insert into public.runs(owner_id,intent,trigger,request_key,request_hash,snapshot,status) select $1,'explore','manual',$2,$2,snapshot,'completed' from public.runs where id=$3 returning id",
      [owner, suffix, run],
    )
  ).rows[0].id;
  const cc = text + (change ? " Changed." : "");
  const snap = duration
    ? JSON.stringify({ ...input, limit: { type: "duration", value: duration } })
    : JSON.stringify(input);
  return (
    await db.query<{ id: string }>(
      "insert into public.briefs(owner_id,run_id,intent,title,content,canonical_text,text_hash,word_count,snapshot,citations,budget_status,audio_status) values($1,$2,'explore','Cache fixture',$3::jsonb,$4,encode(sha256(convert_to($4,'UTF8')),'hex'),4,$5::jsonb,'[]'::jsonb,'unverified','not_requested') returning id",
      [owner, rr, JSON.stringify(content), cc, snap],
    )
  ).rows[0].id;
}
const copy = await copyBrief(a, "cache-copy");
await asUser(a);
assert.equal(
  (
    await db.query<{ v: { cached: boolean } }>(
      "select public.request_audio($1) v",
      [copy],
    )
  ).rows[0].v.cached,
  true,
);
assert.equal(
  (
    await db.query<{ v: { cached: boolean } }>(
      "select public.request_audio($1) v",
      [copy],
    )
  ).rows[0].v.cached,
  true,
);
checks += 2;
await privileged();
assert.equal(
  (await db.query("select id from public.audio_jobs where brief_id=$1", [copy]))
    .rows.length,
  0,
);
checks++;
const changed = await copyBrief(a, "changed-script", true),
  foreign = await copyBrief(b, "foreign-copy");
await asUser(a);
assert.equal(
  (
    await db.query<{ v: { cached: boolean } }>(
      "select public.request_audio($1) v",
      [changed],
    )
  ).rows[0].v.cached,
  false,
);
checks++;
await asUser(b);
assert.equal(
  (
    await db.query<{ v: { cached: boolean } }>(
      "select public.request_audio($1) v",
      [foreign],
    )
  ).rows[0].v.cached,
  false,
);
checks++;
await privileged();
// Deleting one cached reference cannot delete or release quota for shared selected audio.
const alias = (
  await db.query<{ selected_audio_id: string }>(
    "select selected_audio_id from public.briefs where id=$1",
    [copy],
  )
).rows[0].selected_audio_id;
await db.query("delete from public.briefs where id=$1", [copy]);
await db.query(
  "update public.audio_assets set created_at=now()-interval '2 days' where id=$1",
  [alias],
);
await db.query("select public.orphan_audio()");
assert.equal(
  (
    await db.query<{ v: boolean }>(
      "select public.can_remove_audio_object($1) v",
      [alias],
    )
  ).rows[0].v,
  false,
);
await db.query(
  "insert into private.usage values('storage','retained',100) on conflict(metric,period) do update set used=100",
);
await db.query("select public.release_audio($1)", [alias]);
assert.equal(
  (
    await db.query<{ used: number }>(
      "select used from private.usage where metric='storage' and period='retained'",
    )
  ).rows[0].used,
  100,
);
assert.equal(
  (
    await db.query(
      "select id from public.audio_assets where id=$1 and status='ready'",
      [asset],
    )
  ).rows.length,
  1,
);
checks += 3;
await db.query("update public.audio_assets set duration=61 where id=$1", [
  asset,
]);
const tooLong = await copyBrief(a, "shorter-listening-limit", false, 60);
await asUser(a);
await fails(
  () => db.query("select public.request_audio($1)", [tooLong]),
  "known over-limit cached audio does not trigger another generation",
);
await privileged();
assert.equal(
  (
    await db.query("select id from public.audio_jobs where brief_id=$1", [
      tooLong,
    ])
  ).rows.length,
  0,
);
checks++;
const newVoice = await copyBrief(a, "changed-voice");
await db.query(
  "update public.audio_assets set profile_key='different-voice-version' where id=$1",
  [asset],
);
await asUser(a);
assert.equal(
  (
    await db.query<{ v: { cached: boolean } }>(
      "select public.request_audio($1) v",
      [newVoice],
    )
  ).rows[0].v.cached,
  false,
);
checks++;
await privileged();
console.log(
  `PASS: ${checks} PostgreSQL ownership, privilege, fencing, publication, idempotency, and quota assertions.`,
);
await db.close();
