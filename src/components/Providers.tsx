// src/components/Providers.tsx
"use client"; // This directive marks this file as a Client Component

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react"; // Import SessionProvider

// Create a new QueryClient instance outside the component
// so it's not recreated on every render.
// This instance will live on the client side.
const queryClient = new QueryClient();

/**
 * Providers Component
 * This client component wraps children with necessary providers like
 * QueryClientProvider and SessionProvider, ensuring they are initialized
 * on the client side.
 *
 * @param {object} props - Component props.
 * @param {React.ReactNode} props.children - The child components to be wrapped.
 * @param {any} props.session - The initial session object from NextAuth.js.
 */
interface ProvidersProps {
  children: React.ReactNode;
  session: any; // Type for session from NextAuth.js
}

const Providers: React.FC<ProvidersProps> = ({ children, session }) => {
  return (
    // SessionProvider makes the session available via useSession()
    // It accepts an initial session object fetched from the server.
    <SessionProvider session={session}>
      {/* QueryClientProvider makes react-query hooks available */}
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
};

export default Providers;
