// src/components/Header.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";
import { Session } from "@supabase/supabase-js";

const Header: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);

  // Fetch session on component mount and listen for auth state changes
  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error.message);
      alert("Error logging out: " + error.message);
    } else {
      router.push("/auth/sign-in"); // Redirect to sign-in page after logout
    }
  };

  // Only render header if user is logged in AND not on a public path (like sign-in/sign-up)
  // Re-define publicPaths here if not available globally, or make it global
  const publicPaths = ["/auth/sign-in", "/auth/sign-up"];
  const showHeader = session && !publicPaths.includes(pathname);

  if (!showHeader) {
    return null; // Don't render header on public pages or if not logged in
  }

  return (
    <header className='bg-gray-800 text-white p-4 shadow-md sticky top-0 z-40'>
      <div className='container mx-auto flex justify-between items-center max-w-5xl'>
        <Link
          href='/'
          className='text-xl font-bold hover:text-gray-300 transition-colors'
        >
          Inventory Helper
        </Link>
        <nav>
          <ul className='flex space-x-4 items-center'>
            <li>
              <Link href='/' className='hover:text-gray-300 transition-colors'>
                Inventories
              </Link>
            </li>
            <li>
              <Link
                href='/settings'
                className='hover:text-gray-300 transition-colors'
              >
                Master Items
              </Link>
            </li>
            {/* Add more navigation links here if needed */}
            {session && ( // Only show logout if there's a session
              <li>
                <button
                  onClick={handleLogout}
                  className='bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition-colors'
                >
                  Logout
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
