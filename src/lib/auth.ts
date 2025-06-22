// src/lib/auth.ts
import { encode as defaultEncode } from "next-auth/jwt";
import { compare } from "bcryptjs"; // Make sure to import 'compare' from bcryptjs

import db from "@/lib/db/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { schema } from "@/lib/schema"; // Your Zod schema for validation
import { Role } from "@prisma/client";

const adapter = PrismaAdapter(db);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter,
  providers: [
    GitHub,
    Credentials({
      // The name of the provider shown to the user (optional)
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // 1. Validate incoming credentials
        const validatedCredentials = schema.safeParse(credentials); // Use safeParse for better error handling

        if (!validatedCredentials.success) {
          console.error(
            "Invalid credentials received:",
            validatedCredentials.error
          );
          throw new Error("Invalid email or password."); // Generic error for security
        }

        const { email, password } = validatedCredentials.data;

        // 2. Find the user by email
        const user = await db.user.findUnique({
          where: {
            email: email.toLocaleLowerCase(), // Ensure email is lowercase for lookup
          },
        });

        // 3. Check if user exists and has a passwordHash
        // If user doesn't exist OR user has no passwordHash (e.g., they signed up with OAuth)
        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password."); // Generic error message
        }

        // 4. Compare the provided plain password with the stored hashed password
        const isPasswordValid = await compare(password, user.passwordHash);

        if (!isPasswordValid) {
          throw new Error("Invalid email or password."); // Generic error message
        }

        // 5. If authentication is successful, return the user object.
        // DO NOT return the passwordHash for security.
        // NextAuth.js will use this user object to create a session.
        const { ...userWithoutPasswordHash } = user;
        return userWithoutPasswordHash;
      },
    }),
  ],
  callbacks: {
    // This JWT callback is used to persist information into the JWT token.
    // The `user` object here comes from the `authorize` function's return value.
    async jwt({ token, user, account }) {
      if (user) {
        // Add user ID and role to the token
        token.id = user.id;
        token.role = user.role; // Assuming 'role' is part of your User model

        // If it's a credentials login, mark it as such
        if (account?.provider === "credentials") {
          token.credentials = true;
        }
      }
      return token;
    },
    // This session callback is used to expose information from the JWT token to the session object
    // accessible via `useSession` or `auth()`.
    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string; // Ensure id is propagated to session.user
      }
      if (token?.role) {
        session.user.role = token.role as Role; // Ensure role is propagated to session.user
      }
      return session;
    },
  },
  // When using an adapter, you typically want a JWT strategy for credentials to maintain statelessness
  session: {
    strategy: "jwt",
  },
  // Configure JWT options
  jwt: {
    encode: async function (params) {
      return defaultEncode(params); // Revert to default encode for simpler JWT handling
    },
    // No custom decode needed typically
  },
  // Ensure you add a secret for JWT signing in production
  secret: process.env.NEXTAUTH_SECRET,
});
