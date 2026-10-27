import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

// Edge-safe config: this file is loaded by the middleware, which runs in the
// Edge Runtime. Keep Node-only code (Prisma, bcryptjs) out of it — the
// Credentials provider and the Prisma adapter are added in src/lib/auth.ts.
//
// Email + password is the only sign-in method. Accounts are created by an
// admin only, so don't add OAuth providers here: with the Prisma adapter they
// create a new user automatically on first sign-in.
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

    async jwt({ token, user }) {
      if (user) {
        // When the user signs in, attach their id AND role to the token.
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      // The token has the id and role. Pass them to the session object.
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
