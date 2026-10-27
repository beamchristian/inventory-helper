// src/middleware.ts

import NextAuth from "next-auth";
import authConfig from "./auth.config";

// The middleware runs in the Edge Runtime, so it builds its own auth instance
// from the edge-safe config only (no Prisma adapter, no bcryptjs). It just
// reads the session JWT and runs the `authorized` callback.
export const { auth: middleware } = NextAuth(authConfig);

// Run on all paths except API routes, static assets and PWA files.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js|swe-worker-development.js).*)",
  ],
};
