import { hash } from "@node-rs/argon2";
import { UserRole } from "@prisma/client";
import { db } from "../lib/db";

const accounts = [
  { username: "adminusershs2", displayName: "SHS Owner", schoolId: 1, role: UserRole.OWNER, passwordEnv: "SEED_SHS_OWNER_PASSWORD" },
  { username: "adminusershs1", displayName: "SHS Staff", schoolId: 1, role: UserRole.STAFF, passwordEnv: "SEED_SHS_STAFF_PASSWORD" },
  { username: "adminusersic2", displayName: "SIC Owner", schoolId: 2, role: UserRole.OWNER, passwordEnv: "SEED_SIC_OWNER_PASSWORD" },
  { username: "adminusersic1", displayName: "SIC Staff", schoolId: 2, role: UserRole.STAFF, passwordEnv: "SEED_SIC_STAFF_PASSWORD" },
] as const;

async function main() {
  await db.school.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: "Standard High School", shortName: "SHS" },
  });
  await db.school.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: "Standard International School", shortName: "SIS" },
  });

  for (const account of accounts) {
    const password = process.env[account.passwordEnv];
    if (!password || password.length < 10) {
      console.warn(`Skipping ${account.username}; ${account.passwordEnv} must be at least 10 characters.`);
      continue;
    }
    const passwordHash = await hash(password);
    await db.portalUser.upsert({
      where: { username: account.username },
      update: {
        displayName: account.displayName,
        schoolId: account.schoolId,
        role: account.role,
        passwordHash,
        isActive: true,
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
      create: {
        username: account.username,
        displayName: account.displayName,
        schoolId: account.schoolId,
        role: account.role,
        passwordHash,
        mustChangePassword: true,
      },
    });
    console.log(`Password set for ${account.username}.`);
  }
}

main().finally(() => db.$disconnect());
