import NextAuth from "next-auth";
import Github from "next-auth/providers/github";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/db";

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth,
} = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  callbacks: {
    // This callback is called whenever a JWT is created.
    // We add the user's ID to the token here.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    // This callback is called whenever a session is checked.
    // We copy the user ID from the token to the session object.
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
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
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "email@example.com",
        },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const email = credentials.email as string;

        const user = await db.user.findUnique({
          where: {
            email,
          },
        });

        // 1. Check if user exists and has a password.
        // Users who signed up with an OAuth provider won't have a password.
        if (!user || !user.passwordHash) {
          return null;
        }

        // 2. Check if password matches
        const isMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isMatch) return null;

        // Security: Don't return the password hash in the user object.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...userWithoutHash } = user;
        return userWithoutHash;
      },
    }),
  ],
});
