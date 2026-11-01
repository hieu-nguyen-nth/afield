import { writeFile } from "node:fs/promises";
import { createTestDatabase } from "../tests/support/database";
const { db, migrations } = await createTestDatabase();
try {
  const { rows: tables } = await db.query<{
    schema: string;
    name: string;
    rls: boolean;
  }>(`
    select n.nspname as schema,c.relname as name,c.relrowsecurity as rls
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname in ('public','private') and c.relkind='r'
    order by n.nspname,c.relname`);
  if (!tables.length)
    throw new Error("Migrations produced no application tables");
  const schema = [];
  for (const table of tables) {
    const params = [table.schema, table.name];
    const columns = (
      await db.query<Record<string, unknown>>(
        `select column_name,data_type,udt_name,is_nullable,column_default from information_schema.columns where table_schema=$1 and table_name=$2 order by ordinal_position`,
        params,
      )
    ).rows;
    const constraints = (
      await db.query<Record<string, unknown>>(
        `select con.conname as name,con.contype as type,pg_get_constraintdef(con.oid) as definition from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname=$1 and c.relname=$2 order by con.conname`,
        params,
      )
    ).rows;
    const indexes = (
      await db.query<Record<string, unknown>>(
        `select indexname as name,indexdef as definition from pg_indexes where schemaname=$1 and tablename=$2 order by indexname`,
        params,
      )
    ).rows;
    const policies = (
      await db.query<Record<string, unknown>>(
        `select policyname as name,roles,cmd,qual,with_check from pg_policies where schemaname=$1 and tablename=$2 order by policyname`,
        params,
      )
    ).rows;
    const grants = (
      await db.query<Record<string, unknown>>(
        `select grantee,privilege_type from information_schema.role_table_grants where table_schema=$1 and table_name=$2 and grantee in ('anon','authenticated','service_role') order by grantee,privilege_type`,
        params,
      )
    ).rows;
    schema.push({ ...table, columns, constraints, indexes, policies, grants });
  }
  const escape = (value: unknown) =>
    String(value ?? "—")
      .replace(/\|/g, "\\|")
      .replace(/\n/g, " ");
  const lines = [
    "# Relational database schema — generated reference",
    "",
    `Generated locally by applying all ${migrations.length} committed migrations to disposable PostgreSQL and reading its catalogs. This describes the **${schema.length} application tables** after all migrations, not a production-data export or the full provider-managed Auth/Storage schema.`,
    "",
    "Regenerate from the repository root with `npm run docs:schema`. [Model relationships](DATA-MODELS.md) · [Authentication](AUTHENTICATION.md) · [Migration source](../../apps/web/supabase/migrations). The migrations remain authoritative; function bodies, triggers and their permissions must be reviewed there.",
    "",
    "Migrations: " +
      migrations.map((file) => "`" + file + "`").join(", ") +
      ".",
    "",
  ];
  for (const table of schema) {
    lines.push(
      `## ${table.schema}.${table.name}`,
      "",
      `Row-level security: **${table.rls ? "enabled" : "disabled"}**.`,
      "",
      "| Column | PostgreSQL type | Nullable | Default |",
      "|---|---|---|---|",
    );
    for (const column of table.columns)
      lines.push(
        `| \`${escape(column.column_name)}\` | ${escape(column.data_type)} (${escape(column.udt_name)}) | ${escape(column.is_nullable)} | ${escape(column.column_default)} |`,
      );
    lines.push("", "Constraints:", "");
    for (const constraint of table.constraints)
      lines.push(
        `- \`${escape(constraint.name)}\`: \`${escape(constraint.definition)}\``,
      );
    lines.push("", "Indexes:", "");
    for (const index of table.indexes)
      lines.push(`- \`${escape(index.definition)}\``);
    lines.push(
      "",
      "Reader/worker grants: " +
        (table.grants
          .map(
            (grant) =>
              `\`${escape(grant.grantee)}: ${escape(grant.privilege_type)}\``,
          )
          .join(", ") || "none to the inspected roles") +
        ".",
      "",
      "RLS policies:",
      "",
    );
    if (!table.policies.length)
      lines.push(
        "No policies; enabling RLS alone does not grant browser access.",
      );
    for (const policy of table.policies)
      lines.push(
        `- \`${escape(policy.name)}\` (${escape(policy.cmd)}, roles: ${escape(policy.roles)}): USING \`${escape(policy.qual)}\`; WITH CHECK \`${escape(policy.with_check)}\`.`,
      );
    lines.push("");
  }
  await writeFile(
    "../../docs/technical/DATABASE-SCHEMA.md",
    lines.join("\n").trim() + "\n",
  );
  await writeFile(
    "../../docs/technical/schema.json",
    JSON.stringify(
      {
        source: "committed migrations applied to disposable PostgreSQL",
        migrations,
        tables: schema,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    `PASS: generated ${schema.length} table definitions with columns, constraints, indexes, policies and grants from ${migrations.length} migrations; no live connection or private rows used.`,
  );
} finally {
  await db.close();
}
