// src/middleware.ts

// The middleware itself is now imported from your main auth file
export { auth as middleware } from "./lib/auth";

// Optional: You can still use a matcher to specify which routes the middleware should run on.
// This is often more performant than running it on every single request.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
