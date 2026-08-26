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
    };
  }

  interface User {
    username: string;
    schoolId: number;
    schoolName: string;
    role: UserRole;
    mustChangePassword: boolean;
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
  }
}
