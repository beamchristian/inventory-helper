// src/components/Providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { Session } from "next-auth"; // Import Session type

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

interface ProvidersProps {
  children: React.ReactNode;
  session: Session | null | undefined; // NEW: Define session prop here
}

export default function Providers({ children, session }: ProvidersProps) {
  // NEW: Accept session prop
  return (
    <SessionProvider session={session}>
      {" "}
      {/* Pass the session prop to NextAuth's SessionProvider */}
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
