// src/components/Header.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

// Import NextAuth.js specific modules
import { useSession, signOut } from "next-auth/react";
import type { Session } from "next-auth"; // Import Session type from next-auth

const Header: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  // useSession hook provides session data and its loading status
  const { data: session, status } = useSession(); // status can be "loading", "authenticated", "unauthenticated"

  // Function to handle user logout
  const handleLogout = async () => {
    // Call signOut from next-auth and redirect to the sign-in page after logout
    await signOut({ callbackUrl: "/auth/sign-in" });
  };

  // Define paths where the header should NOT be displayed at all.
  // These are typically public authentication pages.
  const publicPaths = ["/auth/sign-in", "/auth/sign-up"];

  // If the current path is a public authentication page, return null.
  // The header will not render on these specific routes.
  if (publicPaths.includes(pathname)) {
    return null;
  }

  // For all other routes (i.e., non-public, typically private app pages),
  // always render the main <header> container. This prevents layout shifts.
  // The *content* inside will be conditional based on session status.
  return (
    <header className='bg-gray-800 text-white p-4 shadow-md sticky top-0 z-40'>
      <div className='container mx-auto flex justify-between items-center max-w-5xl'>
        {/*
          Conditional rendering for the header's internal content.
          This ensures the header element itself is always present on private pages,
          but its content adapts to the session loading state.
        */}
        {status === "authenticated" ? (
          // If the user is authenticated, display the full navigation.
          <>
            {/* Logo/Home link */}
            <Link
              href='/'
              className='text-xl font-bold hover:text-gray-300 transition-colors'
            >
              Inventory Helper
            </Link>
            {/* Navigation links */}
            <nav>
              <ul className='flex space-x-4 items-center'>
                <li>
                  <Link
                    href='/'
                    className='hover:text-gray-300 transition-colors'
                  >
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
                {/* Logout button */}
                <li>
                  <button
                    onClick={handleLogout}
                    className='bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm transition-colors'
                  >
                    Logout
                  </button>
                </li>
              </ul>
            </nav>
          </>
        ) : (
          // If status is "loading" or "unauthenticated" on a non-public path:
          // Instead of "Loading...", we'll just render empty space.
          // The background of the header (`bg-gray-800`) will still be visible,
          // maintaining the layout without showing potentially incomplete navigation.
          // Redirection for truly unauthenticated users on private pages should
          // primarily be handled by layout.tsx's useEffect or Next.js middleware.
          <div className='flex justify-between items-center w-full'>
            <div className='text-xl font-bold'></div>{" "}
            {/* Empty left side to push content right */}
            <div className='flex space-x-4 items-center'></div>{" "}
            {/* Empty right side */}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
