// src/auth.config.ts

import type { NextAuthConfig } from "next-auth";
import Github from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/db";

export default {
  // Add the sign-in page route. This is where users will be redirected if they
  // try to access a protected page without being logged in.
  pages: {
    signIn: "/sign-in",
  },
  session: { strategy: "jwt" },
  callbacks: {
    // THIS IS THE NEW PART
    // The 'authorized' callback is where you protect your routes.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      // The homepage ('/') is a protected route in your app.
      const isProtectedRoute = nextUrl.pathname.startsWith("/");

      if (isProtectedRoute) {
        if (isLoggedIn) return true; // User is logged in, allow access.
        return false; // User is not logged in, redirect to /sign-in.
      } else if (isLoggedIn) {
        // If a logged-in user tries to visit the sign-in page, redirect them to the homepage.
        // This prevents them from seeing the login form again.
        return Response.redirect(new URL("/", nextUrl));
      }

      // Allow access to all other routes (like /sign-in for non-logged-in users)
      return true;
    },
    // Keep your existing jwt and session callbacks
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [
    // ... all your providers (Github, Credentials) remain here ...
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
        if (!isMatch) return null;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...userWithoutHash } = user;

        return userWithoutHash;
      },
    }),
  ],
} satisfies NextAuthConfig;
