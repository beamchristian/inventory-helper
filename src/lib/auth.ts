// src/auth.ts

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db/db";
import authConfig from "../auth.config"; // <-- Import the config

export const {
  handlers: { GET, POST },
  signIn,
  signOut,
  auth,
} = NextAuth({
  adapter: PrismaAdapter(db), // The adapter is used here for the API handlers
  ...authConfig, // Spread the rest of the configuration
});
