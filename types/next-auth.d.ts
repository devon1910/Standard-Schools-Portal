import "next-auth";
import "next-auth/jwt";
import type { UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      username: string;
      schoolId: number;
      schoolName: string;
      role: UserRole;
      mustChangePassword: boolean;
      sessionVersion: number;
      studentProfileId: string | null;
    };
  }

  interface User {
    username: string;
    schoolId: number;
    schoolName: string;
    role: UserRole;
    mustChangePassword: boolean;
    sessionVersion: number;
    studentProfileId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    schoolId: number;
    schoolName: string;
    role: UserRole;
    mustChangePassword: boolean;
    sessionVersion: number;
    studentProfileId: string | null;
  }
}
