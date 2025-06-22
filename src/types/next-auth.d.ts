// src/types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { Role } from "@prisma/client"; // Import your Role enum from Prisma client

// Extend the built-in NextAuth types
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string; // Add id to DefaultSession.user
      role: Role; // Add role to DefaultSession.user
    } & DefaultSession["user"];
  }

  /**
   * The shape of the user object that is returned from the `authorize` callback
   * or received in the `jwt` callback.
   */
  interface User extends DefaultUser {
    id: string; // Ensure id is present if your User model uses CUID/UUID
    role: Role; // Add role to DefaultUser
  }
}

declare module "next-auth/jwt" {
  /**
   * Returned by the `jwt` callback and `getToken`, when using JWT sessions
   */
  interface JWT {
    id: string; // Add id to JWT token
    role: Role; // Add role to JWT token
    credentials?: boolean; // Keep this if you use it in your jwt callback
  }
}
