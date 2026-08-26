import { hash, verify } from "@node-rs/argon2";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyAspNetIdentityPassword } from "@/lib/legacy-password";

type LegacyUser = {
  Id: string;
  UserName: string | null;
  PasswordHash: string | null;
};

async function migrateLegacyUser(username: string, password: string) {
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
    include: { school: true },
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
          include: { school: true },
        });
        if (!user) user = await migrateLegacyUser(username, parsed.data.password);
        if (!user || !user.isActive) return null;

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
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.schoolId = user.schoolId;
        token.schoolName = user.schoolName;
        token.role = user.role;
        token.mustChangePassword = user.mustChangePassword;
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
      };
      return session;
    },
  },
};

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== "OWNER") redirect("/dashboard?error=owner-required");
  return user;
}
