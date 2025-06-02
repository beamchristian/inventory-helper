// src/app/layout.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import "./globals.css";
import Header from "@/components/Header";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

const queryClient = new QueryClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  const publicPaths = useMemo(
    () => ["/auth/sign-in", "/auth/sign-up", "/auth/callback"],
    []
  );

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

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
          router.push("/");
        }
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router, pathname, publicPaths]);

  if (isLoading) {
    return (
      <html lang='en'>
        <body className={inter.className}>
          <div className='flex justify-center items-center h-screen'>
            <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-primary dark:border-primary-dark'></div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang='en'>
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <Header />
          <div className='min-h-screen bg-background-surface flex flex-col'>
            <div className='flex-grow'>{children}</div>
          </div>
        </QueryClientProvider>
      </body>
    </html>
  );
}
