// src/lib/auth.ts
// Full Node.js auth setup: used by pages, server actions and API routes.
// The middleware uses only the edge-safe config (see src/middleware.ts).

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/db";
import authConfig from "../auth.config";

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth,
} = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers: [
    ...authConfig.providers,
    Credentials({
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials.password) return null;
        const email = credentials.email as string;
        const user = await db.user.findUnique({ where: { email } });

        if (!user || !user.passwordHash) return null;

        const isMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash,
        );

        // On successful password match, return the full user object.
        // The 'user' object passed to the jwt callback will then contain the role.
        if (isMatch) return user;

        return null;
      },
    }),
  ],
});
