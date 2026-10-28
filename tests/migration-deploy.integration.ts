import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Client } from "pg";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { setPasswordAuditContext } from "../lib/password-audit";

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
    const auditName = "20261023_password_audit";
    for (const name of migrationNames.filter((name) => name !== auditName)) {
      await client.query(await readMigration(name));
    }
    await client.query(`
      INSERT INTO "PortalUser" ("id", "username", "displayName", "passwordHash", "role", "schoolId", "updatedAt") VALUES
        ('owner', 'owner', 'School Owner', 'owner-hash', 'OWNER', 1, now()),
        ('staff', 'staff', 'Staff Member', 'existing-staff-hash', 'STAFF', 1, now()),
        ('other-owner', 'other-owner', 'Other Owner', 'other-hash', 'OWNER', 2, now());
    `);
    await client.query(await readMigration(auditName));
    const count = async () => (await client.query('SELECT COUNT(*)::int AS count FROM "PasswordAuditEvent"')).rows[0].count;
    const password = async () => (await client.query('SELECT "passwordHash" FROM "PortalUser" WHERE "id" = \'staff\'')).rows[0].passwordHash;
    const latest = async () => (await client.query('SELECT * FROM "PasswordAuditEvent" ORDER BY "id" DESC LIMIT 1')).rows[0];
    const setContext = async (source: string, actor = "", label = "") => {
      await client.query(`SELECT set_config('app.password_audit_source', $1, true),
        set_config('app.password_audit_actor_id', $2, true), set_config('app.password_audit_actor_label', $3, true)`, [source, actor, label]);
    };
    const updatePassword = (hash: string) => client.query('UPDATE "PortalUser" SET "passwordHash" = $1 WHERE "id" = \'staff\'', [hash]);
    assert.equal(await password(), "existing-staff-hash");
    assert.equal(await count(), 0, "Installing auditing must not invent past events");

    // Exercise the same adapter and actor helper that the application uses.
    const schema = (await client.query("SELECT current_schema()")).rows[0].current_schema;
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }, { schema }) });
    try {
      await prisma.$transaction(async (tx) => {
        await setPasswordAuditContext(tx, { source: "SELF_SERVICE", actorId: "staff" });
        await tx.portalUser.update({ where: { id: "staff" }, data: { passwordHash: "self-service-hash" } });
      });
    } finally {
      await prisma.$disconnect();
    }
    assert.equal(await count(), 1);
    assert.equal((await latest()).action, "PASSWORD_CHANGED");
    assert.equal((await latest()).actorId, "staff");

    await client.query("BEGIN");
    await setContext("SCHOOL_OWNER", "owner");
    await updatePassword("owner-reset-hash");
    await client.query("COMMIT");
    const reset = await latest();
    assert.equal(reset.action, "PASSWORD_RESET");
    assert.equal(reset.schoolId, 1);
    assert.equal(reset.accountUsername, "staff");
    assert.equal(reset.actorUsername, "owner");
    assert.equal(reset.actorName, "School Owner");
    assert.equal(reset.source, "SCHOOL_OWNER");
    assert(reset.createdAt instanceof Date);

    // Unchanged hashes and ordinary sign-in updates must not look like password changes.
    await updatePassword("owner-reset-hash");
    await client.query('UPDATE "PortalUser" SET "lastLoginAt" = now(), "failedLoginAttempts" = 1 WHERE "id" = \'staff\'');
    assert.equal(await count(), 2);
    await client.query("BEGIN");
    await setContext("SCHOOL_OWNER", "owner");
    await updatePassword("rolled-back-hash");
    await client.query("ROLLBACK");
    assert.equal(await password(), "owner-reset-hash");
    assert.equal(await count(), 2);

    for (const [source, actor] of [["SCHOOL_OWNER", "other-owner"], ["SCHOOL_OWNER", "staff"], ["SELF_SERVICE", "owner"]]) {
      await client.query("BEGIN");
      await setContext(source, actor);
      await assert.rejects(updatePassword("rejected-hash"), /Password audit actor|school owner|account owner/);
      await client.query("ROLLBACK");
      assert.equal(await password(), "owner-reset-hash");
      assert.equal(await count(), 2);
    }

    // Missing application context is recorded as the database role, never the previous request's actor.
    await updatePassword("direct-sql-hash");
    assert.equal((await latest()).source, "DATABASE");
    assert.equal((await latest()).actorId, null);
    assert.equal((await latest()).actorUsername, (await client.query("SELECT current_user")).rows[0].current_user);
    await client.query("BEGIN");
    await setContext("SEED", "", "test-operator");
    await updatePassword("seed-hash");
    await client.query("COMMIT");
    assert.equal((await latest()).source, "SEED");
    assert.equal((await latest()).actorUsername, "test-operator");

    for (const [source, expected] of [["SCHOOL_OWNER", "ACCOUNT_CREATED"], ["LEGACY_MIGRATION", "LEGACY_ACCOUNT_IMPORTED"]]) {
      await client.query("BEGIN");
      await setContext(source, source === "SCHOOL_OWNER" ? "owner" : "", "legacy-login");
      await client.query(`INSERT INTO "PortalUser" ("id", "username", "displayName", "passwordHash", "role", "schoolId", "updatedAt")
        VALUES ($1, $1, 'New Account', 'new-account-hash', 'STAFF', 1, now())`, [source]);
      await client.query("COMMIT");
      assert.equal((await latest()).action, expected);
    }

    await assert.rejects(client.query('UPDATE "PasswordAuditEvent" SET "actorName" = \'tampered\''), /cannot be changed or deleted/);
    await assert.rejects(client.query('DELETE FROM "PasswordAuditEvent"'), /cannot be changed or deleted/);
    await assert.rejects(client.query('TRUNCATE "PasswordAuditEvent"'), /cannot be changed or deleted/);
    await client.query('DELETE FROM "PortalUser" WHERE "id" IN (\'owner\', \'staff\')');
    assert.equal(await count(), 6, "Deleting an account must preserve its audit history");
    assert.equal((await client.query('SELECT "actorName" FROM "PasswordAuditEvent" WHERE "id" = $1', [reset.id])).rows[0].actorName, "School Owner");
    const columns = await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'PasswordAuditEvent'");
    assert(!columns.rows.some((row) => /password|hash/i.test(row.column_name)), "Audit rows must not store passwords or hashes");
    assert(!JSON.stringify((await client.query('SELECT * FROM "PasswordAuditEvent"')).rows).includes("-hash"));
    console.log("PASS: password audit attribution, history retention, immutable events, and atomic rollback");
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

  await withSchema(async (client, url) => {
    assertSuccess(runMigrations(url));
    const repair = await readFile(path.resolve("prisma/repairs/20261027_school1_session3_class_links.sql"), "utf8");
    const mappings: [number, number, string, number][] = [
      [1, 87, "Nursery 1A", 15], [2, 90, "Nursery 1B", 14], [4, 91, "Nursery 2A", 15],
      [5, 92, "Nursery 2B", 15], [7, 93, "Nursery 3A", 5], [8, 94, "Nursery 3B", 6],
      [10, 95, "Basic 1A", 12], [11, 96, "Basic 1B", 10], [13, 97, "Basic 2A", 9],
      [14, 98, "Basic 2B", 11], [16, 99, "Basic 3A", 16], [19, 101, "Basic 4A", 16],
      [20, 102, "Basic 4B", 11], [23, 103, "Basic 5B", 14], [86, 88, "Pre-Nursery", 11],
    ];
    await client.query(`
      INSERT INTO "Sessions" ("Id", "SchoolId", "Name", "DateCreated") VALUES
        (1,1,'2023/2024',now()), (3,1,'2025/2026',now()), (4,2,'2025/2026',now());
      INSERT INTO "StudentProfile" (id,"schoolId",name,"updatedAt")
        SELECT n,1,'Fixture ' || n,now() FROM generate_series(1,180) n;
      INSERT INTO "StudentProfile" (id,"schoolId",name,"updatedAt") VALUES
        (181,2,'Other school',now()), (182,1,'Already correct',now()), (183,1,'Rollback boundary',now());
    `);
    let firstStudent = 1;
    for (const [source, target, name, count] of mappings) {
      await client.query(`INSERT INTO "Classes" ("Id","SchoolId","SessionId","Name","ClassTypeId","DateCreated")
        VALUES ($1,1,1,$3,1,now()),($2,1,3,$3,1,now())`, [source, target, name]);
      await client.query(`INSERT INTO "Enrollment" ("schoolId","studentId","sessionId","classId","firstTermBalance","updatedAt")
        SELECT 1,n,3,$1,123.45,now() FROM generate_series($2::int,$3::int) n`, [source, firstStudent, firstStudent + count - 1]);
      firstStudent += count;
    }
    await client.query(`
      INSERT INTO "Classes" ("Id","SchoolId","SessionId","Name","ClassTypeId","DateCreated") VALUES
        (1001,2,4,'Other school class',1,now()), (999,1,1,'Unmapped class',1,now());
      INSERT INTO "Enrollment" ("schoolId","studentId","sessionId","classId","updatedAt") VALUES
        (2,181,4,1001,now()),(1,182,3,87,now()),(1,183,3,87,now()),(1,1,1,1,now());
      INSERT INTO "Students" ("Id","Name","AdmissionNumber","Gender","Dob","Tribe","StateOfOrigin","LGAOfOrigin",
        "ClassAtAdmission","DateOfAdmission","YearOfAdmission","ParentName","ParentAddress","ParentPhone","ParentReligion",
        "ClassId","SessionId","SchoolId","IsFirstTermFeePaid","FirstTermBalance","IsSecondTermFeePaid","SecondTermBalance",
        "IsThirdTermFeePaid","ThirdTermBalance","Balance","DateCreated")
      VALUES (84,'Preserve legacy','OLD/001','Female','2014-05-12','','','','Basic 4A',now(),'2025','','','','',19,3,1,false,125,false,0,false,0,125,now());
    `);
    const enrollments = async () => (await client.query('SELECT * FROM "Enrollment" ORDER BY id')).rows;
    const before = await enrollments();
    const profilesBefore = (await client.query('SELECT * FROM "StudentProfile" ORDER BY id')).rows;
    const legacyBefore = (await client.query('SELECT * FROM "Students" ORDER BY "Id"')).rows;

    await client.query('UPDATE "Classes" SET "Name"=\'Unreviewed class\' WHERE "Id"=101');
    await assert.rejects(client.query(repair), /mappings have changed/);
    await client.query("ROLLBACK");
    assert.deepEqual(await enrollments(), before, "A failed mapping check must change no enrollment");
    await client.query('UPDATE "Classes" SET "Name"=\'Basic 4A\' WHERE "Id"=101');

    await client.query('UPDATE "Classes" SET "ClassTypeId"=999 WHERE "Id"=101');
    await assert.rejects(client.query(repair), /mappings have changed/);
    await client.query("ROLLBACK");
    assert.deepEqual(await enrollments(), before, "Matching names cannot override a different class category");
    await client.query('UPDATE "Classes" SET "ClassTypeId"=1 WHERE "Id"=101');

    await client.query('UPDATE "Classes" SET "SessionId"=3,"Name"=\'BASIC4A\' WHERE "Id"=999');
    await assert.rejects(client.query(repair), /mappings have changed/);
    await client.query("ROLLBACK");
    assert.deepEqual(await enrollments(), before, "Ambiguous target classes must stop the repair");
    await client.query('UPDATE "Classes" SET "SessionId"=1,"Name"=\'Unmapped class\' WHERE "Id"=999');

    await client.query('UPDATE "Enrollment" SET "classId"=20 WHERE "studentId"=71');
    const staleCounts = await enrollments();
    await assert.rejects(client.query(repair), /Enrollment counts differ/);
    await client.query("ROLLBACK");
    assert.deepEqual(await enrollments(), staleCounts, "A changed class count must stop the repair before writes");
    await client.query('UPDATE "Enrollment" SET "classId"=10 WHERE "studentId"=71');

    const reportId = (await client.query(`INSERT INTO "TermReport" ("schoolId","enrollmentId","termId","updatedAt")
      SELECT 1,id,1,now() FROM "Enrollment" WHERE "studentId"=1 RETURNING id`)).rows[0].id;
    await assert.rejects(client.query(repair), /now have scores or reports/);
    await client.query("ROLLBACK");
    assert.deepEqual(await enrollments(), before, "New report data must stop the repair before it writes");
    await client.query('UPDATE "TermReport" SET "enrollmentId"=(SELECT id FROM "Enrollment" WHERE "studentId"=182) WHERE id=$1', [reportId]);

    await client.query('UPDATE "Enrollment" SET "classId"=999 WHERE "studentId"=183');
    const beforePostcheckFailure = await enrollments();
    await assert.rejects(client.query(repair), /Class\/session mismatches remain/);
    await client.query("ROLLBACK");
    assert.deepEqual(await enrollments(), beforePostcheckFailure, "A post-update failure must roll back all 180 changes, including timestamps");
    await client.query('UPDATE "Enrollment" SET "classId"=87 WHERE "studentId"=183');

    await client.query(repair);
    const after = await enrollments();
    const classMap = new Map(mappings.map(([source, target]) => [source, target]));
    assert.equal(after.length, before.length, "No enrollment may be added or removed");
    let changed = 0;
    for (const [index, row] of after.entries()) {
      const original = before[index];
      const target = original.schoolId === 1 && original.sessionId === 3 ? classMap.get(original.classId) : undefined;
      assert.equal(row.classId, target ?? original.classId);
      if (target) changed++;
      assert.deepEqual({ ...row, classId: original.classId, updatedAt: original.updatedAt }, original, "IDs, identities, fees, and status must be preserved");
    }
    assert.equal(changed, 180);
    assert.equal(after.filter((row) => row.schoolId === 1 && row.sessionId === 3 && row.classId === 101).length, 16);
    assert.equal(after.filter((row) => row.schoolId === 1 && row.sessionId === 3 && row.classId === 102).length, 11);
    assert.deepEqual((await client.query('SELECT * FROM "StudentProfile" ORDER BY id')).rows, profilesBefore);
    assert.deepEqual((await client.query('SELECT * FROM "Students" ORDER BY "Id"')).rows, legacyBefore);
    await assert.rejects(client.query(repair), /Enrollment counts differ/);
    await client.query("ROLLBACK");
    assert.deepEqual(await enrollments(), after, "Repeating an already completed repair must make no further changes");
    console.log("PASS: 180 class links corrected; identities, legacy rows, fees, and other schools preserved; unsafe or repeated repairs rejected");
  });
} finally {
  await admin.end();
}
