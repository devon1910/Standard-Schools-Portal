import { hash, verify } from "@node-rs/argon2";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyAspNetIdentityPassword } from "@/lib/legacy-password";
import { safeAuthRedirect } from "@/lib/family-portal";

type LegacyUser = {
  Id: string;
  UserName: string | null;
  PasswordHash: string | null;
};

async function migrateLegacyUser(username: string, password: string) {
  const [identityTable] = await db.$queryRaw<{ exists: boolean }[]>`
    SELECT to_regclass('"AspNetUsers"') IS NOT NULL AS "exists"
  `;
  if (!identityTable?.exists) return null;

  const legacyUsers = await db.$queryRaw<LegacyUser[]>`
    SELECT "Id", "UserName", "PasswordHash"
    FROM "AspNetUsers"
    WHERE LOWER("UserName") = ${username}
    LIMIT 1
  `;
  const legacy = legacyUsers[0];
  if (!legacy?.UserName || !legacy.PasswordHash) return null;
  if (!verifyAspNetIdentityPassword(legacy.PasswordHash, password)) return null;

  const normalized = legacy.UserName.toLowerCase();
  const schoolId = normalized.includes("shs") ? 1 : normalized.includes("sic") ? 2 : null;
  if (!schoolId) return null;

  return db.portalUser.create({
    data: {
      username: normalized,
      displayName: legacy.UserName,
      passwordHash: await hash(password),
      role: normalized.endsWith("2") ? "OWNER" : "STAFF",
      schoolId,
      mustChangePassword: false,
      lastLoginAt: new Date(),
    },
    include: { school: true, studentProfile: { select: { schoolId: true, status: true } } },
  });
}

const credentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "School account",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const username = parsed.data.username.toLowerCase();
        let user = await db.portalUser.findUnique({
          where: { username },
          include: { school: true, studentProfile: { select: { schoolId: true, status: true } } },
        });
        if (!user) user = await migrateLegacyUser(username, parsed.data.password);
        if (!user || !user.isActive) return null;
        if (user.role === "STUDENT" && (!user.studentProfileId || user.studentProfile?.schoolId !== user.schoolId || user.studentProfile.status === "ARCHIVED")) return null;

        if (user.lockedUntil && user.lockedUntil > new Date()) return null;
        const passwordMatches = await verify(user.passwordHash, parsed.data.password);
        if (!passwordMatches) {
          const attempts = user.failedLoginAttempts + 1;
          await db.portalUser.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts >= 5 ? 0 : attempts,
              lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
            },
          });
          return null;
        }

        await db.portalUser.update({
          where: { id: user.id },
          data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.displayName,
          username: user.username,
          schoolId: user.schoolId,
          schoolName: user.school.name,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
          sessionVersion: user.sessionVersion,
          studentProfileId: user.studentProfileId?.toString() ?? null,
        };
      },
    }),
  ],
  callbacks: {
    redirect({ url, baseUrl }) { return safeAuthRedirect(url, baseUrl); },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.schoolId = user.schoolId;
        token.schoolName = user.schoolName;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
        token.sessionVersion = user.sessionVersion;
        token.studentProfileId = user.studentProfileId;
      }
      return token;
    },
    session({ session, token }) {
      session.user = {
        id: token.id,
        name: token.name ?? "Administrator",
        username: token.username,
        schoolId: token.schoolId,
        schoolName: token.schoolName,
        role: token.role,
        mustChangePassword: token.mustChangePassword,
        sessionVersion: token.sessionVersion ?? 0,
        studentProfileId: token.studentProfileId ?? null,
      };
      return session;
    },
  },
};

export async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const account = await db.portalUser.findFirst({
    where: { id: session.user.id, schoolId: session.user.schoolId, isActive: true },
    include: { school: true, studentProfile: { select: { schoolId: true, status: true } } },
  });
  if (!account || account.sessionVersion !== (session.user.sessionVersion ?? 0)) return null;
  if (account.role === "STUDENT" && (!account.studentProfileId || account.studentProfile?.schoolId !== account.schoolId || account.studentProfile.status === "ARCHIVED")) return null;
  return { ...session, user: {
    id: account.id, name: account.displayName, username: account.username,
    schoolId: account.schoolId, schoolName: account.school.name, role: account.role,
    mustChangePassword: account.mustChangePassword, sessionVersion: account.sessionVersion,
    studentProfileId: account.studentProfileId?.toString() ?? null,
  } };
}

export async function requireAccount(loginPath = "/login") {
  const session = await getSession();
  if (!session?.user) redirect(loginPath);
  return session.user;
}

export async function requireUser() {
  const user = await requireAccount();
  if (user.role === "STUDENT") redirect("/family");
  if (user.mustChangePassword) redirect("/change-password");
  return user;
}

export async function requireFamilyUser() {
  const user = await requireAccount("/family/login");
  if (user.role !== "STUDENT" || !user.studentProfileId) redirect("/dashboard");
  if (user.mustChangePassword) redirect("/family/change-password");
  return { ...user, studentProfileId: user.studentProfileId };
}

export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/dashboard?error=owner-required");
  return user;
}
