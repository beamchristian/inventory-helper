import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const pwaConfig = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  // workboxOptions: {
  //   disableDevLogs: true,
  // },

  // register: true,
  // scope: '/',
  // sw: 'service-worker.js',
});

// This is the Content Security Policy string.
// It allows your own domain ('self'), and the required hCaptcha domains.
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.hcaptcha.com https://*.hcaptcha.com;
  style-src 'self' 'unsafe-inline' https://*.hcaptcha.com;
  connect-src 'self' https://*.hcaptcha.com;
  frame-src 'self' https://*.hcaptcha.com;
  font-src 'self' data:;
  img-src 'self' data:;
`;

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
      {
        source: "/:path*", // Apply these headers to all routes
        headers: [
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy.replace(/\s{2,}/g, " ").trim(),
          },
        ],
      },
    ];
  },
};

export default pwaConfig(nextConfig);
