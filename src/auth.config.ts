import type { NextAuthConfig } from "next-auth";
import Github from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/db";
import { Role } from "@prisma/client"; // Import the Role enum

export default {
  pages: {
    signIn: "/sign-in",
  },
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isProtectedRoute = nextUrl.pathname.startsWith("/");

      if (isProtectedRoute) {
        if (isLoggedIn) return true;
        return false;
      } else if (isLoggedIn) {
        return Response.redirect(new URL("/", nextUrl));
      }
      return true;
    },

    // --- MODIFIED JWT CALLBACK ---
    async jwt({ token, user }) {
      if (user) {
        // When the user signs in, attach their id AND role to the token.
        token.id = user.id;
        token.role = user.role; // <-- ADD THIS LINE
      }
      return token;
    },

    // --- MODIFIED SESSION CALLBACK ---
    async session({ session, token }) {
      // The token now has the id and role. Pass them to the session object.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role; // <-- ADD THIS LINE
      }
      return session;
    },
  },
  providers: [
    Github({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Credentials({
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials.password) return null;
        const email = credentials.email as string;
        const user = await db.user.findUnique({ where: { email } });

        if (!user || !user.passwordHash) return null;

        const isMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        // On successful password match, return the full user object.
        // The 'user' object passed to the jwt callback will now contain the role.
        if (isMatch) return user;

        return null;
      },
    }),
  ],
} satisfies NextAuthConfig;
