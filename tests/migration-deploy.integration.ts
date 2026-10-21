import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Client } from "pg";

// Never fall back to DATABASE_URL: these checks create and remove test schemas.
const testConnectionString = process.env.MIGRATION_TEST_DATABASE_URL;
if (!testConnectionString || !new URL(testConnectionString).pathname.endsWith("_test")) {
  throw new Error("Set MIGRATION_TEST_DATABASE_URL to a disposable PostgreSQL database whose name ends in _test.");
}

const bootstrapName = "20260823_create_legacy_tables";
const migrationsRoot = path.resolve("prisma/migrations");
const migrationNames = (await readdir(migrationsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
const readMigration = (name: string) => readFile(path.join(migrationsRoot, name, "migration.sql"), "utf8");
const bootstrapSql = await readMigration(bootstrapName);
const legacyTables = ["Sessions", "Terms", "ClassTypes", "Classes", "Subjects", "Questions", "Students"];

function schemaUrl(schema: string) {
  const url = new URL(testConnectionString!);
  url.searchParams.set("options", `-c search_path=${schema}`);
  return url.href;
}

function runMigrations(connectionString: string) {
  return spawnSync(process.execPath, ["--import", import.meta.resolve("tsx"), path.resolve("prisma/deploy.ts")], {
    env: { ...process.env, DATABASE_URL: connectionString },
    encoding: "utf8", timeout: 60_000,
    windowsHide: true,
  });
}

function assertSuccess(result: ReturnType<typeof runMigrations>) {
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

const admin = new Client({ connectionString: testConnectionString });
await admin.connect();

async function withSchema(check: (client: Client, url: string) => Promise<void>) {
  const schema = `migration_test_${randomUUID().replaceAll("-", "")}`;
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const url = schemaUrl(schema);
  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await check(client, url);
  } finally {
    await client.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
  }
}

try {
  await withSchema(async (client, url) => {
    // Reproduce the reported failure with the original upgrade-only SQL.
    await client.query("BEGIN");
    await assert.rejects(client.query(await readMigration("20260824_fullstack_rewrite")), { code: "42P01" });
    await client.query("ROLLBACK");

    assertSuccess(runMigrations(url));
    const tables = await client.query<{ table_name: string }>("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema()");
    for (const name of [...legacyTables, "School", "PortalUser", "StudentProfile", "Enrollment", "TermReport"]) {
      assert(tables.rows.some((row) => row.table_name === name), `Missing table: ${name}`);
    }
    const history = await client.query('SELECT "migration_name" FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL ORDER BY "migration_name"');
    assert.deepEqual(history.rows.map((row) => row.migration_name), migrationNames);
    await client.query(`
      UPDATE "School" SET "studentIdPrefix" = 'SS' WHERE "id" = 1;
      INSERT INTO "StudentProfile" ("schoolId", "name", "studentId", "updatedAt") VALUES (1, 'Ada Okafor', 'SS001', now());
    `);
    await assert.rejects(client.query('UPDATE "School" SET "studentIdPrefix" = \'NEW\' WHERE "id" = 1'), /only be set once/);
    assertSuccess(runMigrations(url));
    assert.equal((await client.query('SELECT COUNT(*)::int AS count FROM "_prisma_migrations"')).rows[0].count, migrationNames.length);
    assert.equal((await client.query('SELECT "studentId" FROM "StudentProfile"')).rows[0].studentId, "SS001");
    console.log("PASS: empty database, complete migration sequence, ID format lock, and repeat deployment");
  });

  await withSchema(async (client, url) => {
    await client.query(bootstrapSql);
    await client.query(`
      INSERT INTO "Sessions" ("Id", "Name", "SchoolId", "DateCreated") VALUES (5, '2025/2026', 1, now());
      INSERT INTO "ClassTypes" ("Id", "Name", "SchoolId", "DateCreated") VALUES (7, 'Secondary', 1, now());
      INSERT INTO "Classes" ("Id", "Name", "ClassTypeId", "SessionId", "SchoolId", "DateCreated") VALUES (42, 'JSS 1', 7, 5, 1, now());
      INSERT INTO "Students" (
        "Id", "Name", "AdmissionNumber", "Gender", "Dob", "Tribe", "StateOfOrigin", "LGAOfOrigin",
        "ClassAtAdmission", "DateOfAdmission", "YearOfAdmission", "ParentName", "ParentAddress", "ParentPhone", "ParentReligion",
        "ClassId", "SessionId", "SchoolId", "IsFirstTermFeePaid", "FirstTermBalance", "IsSecondTermFeePaid",
        "SecondTermBalance", "IsThirdTermFeePaid", "ThirdTermBalance", "Balance", "DateCreated", "DateModified"
      ) VALUES (84, 'Legacy Ada', 'OLD/001', 'Female', '2014-05-12', '', '', '', 'JSS 1', '2025-09-01', '2025',
        'Guardian', '', '', '', 42, 5, 1, false, 125, false, 0, false, 0, 125, '-infinity', '-infinity');
      CREATE TABLE "AspNetUsers" ("Id" TEXT PRIMARY KEY, "UserName" TEXT, "PasswordHash" TEXT);
      INSERT INTO "AspNetUsers" VALUES ('legacy-owner', 'owner', 'existing-hash');
    `);
    assertSuccess(runMigrations(url));
    assert.equal((await client.query('SELECT "Name" FROM "Classes" WHERE "Id" = 42')).rows[0].Name, "JSS 1");
    const student = (await client.query('SELECT "Id", "Name", "AdmissionNumber", "FirstTermBalance", isfinite("DateCreated") AS created_is_finite, "DateModified" FROM "Students" WHERE "Id" = 84')).rows[0];
    assert.equal(student.Id, "84");
    assert.equal(student.Name, "Legacy Ada");
    assert.equal(student.AdmissionNumber, "OLD/001");
    assert.equal(student.FirstTermBalance, "125.00");
    assert.equal(student.created_is_finite, true);
    assert.equal(student.DateModified, null);
    assert.equal((await client.query('SELECT "PasswordHash" FROM "AspNetUsers"')).rows[0].PasswordHash, "existing-hash");

    // Model an existing deployment where only this newly added prerequisite is absent from history.
    await client.query('DELETE FROM "_prisma_migrations" WHERE "migration_name" = $1', [bootstrapName]);
    assertSuccess(runMigrations(url));
    assert.equal((await client.query('SELECT COUNT(*)::int AS count FROM "Students"')).rows[0].count, 1);
    assert.equal((await client.query('SELECT COUNT(*)::int AS count FROM "_prisma_migrations"')).rows[0].count, migrationNames.length);
    console.log("PASS: legacy data and identity preservation, date cleanup, and an already upgraded database");
  });

  await withSchema(async (client, url) => {
    await client.query('CREATE TABLE "Classes" ("Id" INTEGER PRIMARY KEY); INSERT INTO "Classes" VALUES (42)');
    const result = runMigrations(url);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /only 1 of the 7 required legacy tables/);
    assert.match(result.stderr, /DATABASE_URL and search_path/);
    assert.equal((await client.query('SELECT "Id" FROM "Classes"')).rows[0].Id, 42);
    assert.equal((await client.query("SELECT to_regclass('\"StudentProfile\"') AS name")).rows[0].name, null);
    console.log("PASS: incomplete schema fails without creating replacement school tables");
  });

  await withSchema(async (client, url) => {
    await client.query('CREATE TABLE "UnrelatedData" ("value" TEXT); INSERT INTO "UnrelatedData" VALUES (\'keep\')');
    const result = runMigrations(url);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /schema is not empty/);
    assert.equal((await client.query('SELECT "value" FROM "UnrelatedData"')).rows[0].value, "keep");
    assert.equal((await client.query("SELECT to_regclass('\"Classes\"') AS name")).rows[0].name, null);
    console.log("PASS: unrelated database fails with a configuration error");
  });

  await withSchema(async (_, url) => {
    const sourceSchema = `migration_source_${randomUUID().replaceAll("-", "")}`;
    await admin.query(`CREATE SCHEMA "${sourceSchema}"`);
    const source = new Client({ connectionString: schemaUrl(sourceSchema) });
    try {
      await source.connect();
      await source.query(bootstrapSql);
      const result = runMigrations(url);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /Legacy school tables exist in another schema/);
    } finally {
      await source.end();
      await admin.query(`DROP SCHEMA "${sourceSchema}" CASCADE`);
    }
    console.log("PASS: tables in another schema require a corrected search_path");
  });
} finally {
  await admin.end();
}
