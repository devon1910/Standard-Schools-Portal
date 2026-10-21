CREATE TABLE "PasswordAuditEvent" (
  "id" BIGSERIAL PRIMARY KEY,
  "schoolId" INTEGER NOT NULL,
  "accountId" TEXT NOT NULL,
  "accountUsername" TEXT NOT NULL,
  "action" TEXT NOT NULL CHECK ("action" IN ('ACCOUNT_CREATED', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'LEGACY_ACCOUNT_IMPORTED')),
  "actorId" TEXT,
  "actorUsername" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "source" TEXT NOT NULL CHECK ("source" IN ('SELF_SERVICE', 'SCHOOL_OWNER', 'SEED', 'LEGACY_MIGRATION', 'DATABASE')),
  "databaseRole" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PasswordAuditEvent_schoolId_createdAt_id_idx" ON "PasswordAuditEvent" ("schoolId", "createdAt", "id");

-- Keep snapshots rather than foreign keys so account deletion cannot erase history.
-- The audit insert shares the password transaction. Audit failure cancels the change.
CREATE FUNCTION audit_portal_password() RETURNS trigger AS $$
DECLARE
  source TEXT := COALESCE(NULLIF(current_setting('app.password_audit_source', true), ''), 'DATABASE');
  actor_id TEXT := NULLIF(current_setting('app.password_audit_actor_id', true), '');
  actor_label TEXT := NULLIF(current_setting('app.password_audit_actor_label', true), '');
  actor_username TEXT;
  actor_name TEXT;
  actor_role TEXT;
  action TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."passwordHash" IS NOT DISTINCT FROM OLD."passwordHash" THEN
    RETURN NEW;
  END IF;

  IF actor_id IS NOT NULL THEN
    SELECT "username", "displayName", "role"::text INTO actor_username, actor_name, actor_role
    FROM "PortalUser" WHERE "id" = actor_id AND "schoolId" = NEW."schoolId";
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Password audit actor does not belong to this school.';
    END IF;
  ELSE
    actor_username := COALESCE(actor_label, current_user);
    actor_name := COALESCE(actor_label, 'Database role: ' || current_user);
  END IF;

  IF source = 'SELF_SERVICE' AND (actor_id IS NULL OR actor_id <> NEW."id") THEN
    RAISE EXCEPTION 'A self-service password change must identify the account owner.';
  END IF;
  IF source = 'SCHOOL_OWNER' AND (actor_id IS NULL OR actor_role <> 'OWNER') THEN
    RAISE EXCEPTION 'A school password reset must identify a school owner.';
  END IF;

  action := CASE
    WHEN TG_OP = 'INSERT' AND source = 'LEGACY_MIGRATION' THEN 'LEGACY_ACCOUNT_IMPORTED'
    WHEN TG_OP = 'INSERT' THEN 'ACCOUNT_CREATED'
    WHEN source = 'SELF_SERVICE' THEN 'PASSWORD_CHANGED'
    ELSE 'PASSWORD_RESET'
  END;

  INSERT INTO "PasswordAuditEvent" (
    "schoolId", "accountId", "accountUsername", "action", "actorId", "actorUsername", "actorName", "source", "databaseRole"
  ) VALUES (
    NEW."schoolId", NEW."id", NEW."username", action, actor_id, actor_username, actor_name, source, current_user
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "PortalUser_password_audit"
  AFTER INSERT OR UPDATE OF "passwordHash" ON "PortalUser"
  FOR EACH ROW EXECUTE FUNCTION audit_portal_password();

CREATE FUNCTION protect_password_audit() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Password audit events cannot be changed or deleted.';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "PasswordAuditEvent_immutable"
  BEFORE UPDATE OR DELETE ON "PasswordAuditEvent"
  FOR EACH ROW EXECUTE FUNCTION protect_password_audit();
CREATE TRIGGER "PasswordAuditEvent_no_truncate"
  BEFORE TRUNCATE ON "PasswordAuditEvent"
  FOR EACH STATEMENT EXECUTE FUNCTION protect_password_audit();
