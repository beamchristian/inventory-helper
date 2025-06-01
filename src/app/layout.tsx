// src/app/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation"; // Import usePathname
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import "./globals.css";
import Header from "@/components/Header";

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname(); // Get current path
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Define paths that do NOT require authentication
    const publicPaths = ["/auth/sign-in", "/auth/sign-up", "/auth/callback"]; // Add any other public pages
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // If there's no session AND the current path is NOT a public path, redirect to sign-in
      if (!session && !publicPaths.includes(pathname)) {
        router.push("/auth/sign-in");
      }
      setIsLoading(false);
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          router.push("/auth/sign-in");
        } else if (session && publicPaths.includes(pathname)) {
          // If a session is established while on a public path (e.g., after email confirmation),
          // redirect to the main app page.
          router.push("/");
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router, pathname]); // Add pathname to dependency array

  if (isLoading) {
    return (
      <html lang='en'>
        <body>
          <div className='flex justify-center items-center h-screen'>
            Loading...
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang='en'>
      <body>
        <QueryClientProvider client={queryClient}>
          {/* Header will be rendered here */}
          <Header />
          <div className='min-h-screen bg-gray-100 flex flex-col'>
            <div className='flex-grow'>
              {" "}
              {/* Allows children to take up remaining space */}
              {children}
            </div>
          </div>
        </QueryClientProvider>
      </body>
    </html>
  );
}
