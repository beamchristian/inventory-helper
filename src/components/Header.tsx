// src/components/Header.tsx
"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import React from "react";

export default function Header() {
  const { data, status } = useSession(); // Fixed: Destructure `data` directly

  return (
    <header className='bg-primary text-primary-foreground p-4 shadow-md'>
      <div className='container mx-auto flex justify-between items-center'>
        <Link href='/' className='text-2xl font-bold hover:text-white/90'>
          Inventory App
        </Link>
        <nav>
          {status === "loading" ? (
            <div className='animate-pulse'>Loading...</div>
          ) : status === "authenticated" ? (
            <div className='flex items-center space-x-4'>
              <Link
                href='/inventories'
                className='hover:text-white/90 transition-colors'
              >
                My Inventories
              </Link>
              <Link
                href='/settings'
                className='hover:text-white/90 transition-colors'
              >
                Settings
              </Link>
              {/* You might want to display the user's name or a logout button here */}
              <span className='font-semibold'>
                {data?.user?.name || data?.user?.email}
              </span>{" "}
              {/* Access user data via `data` */}
              {/* <button onClick={() => signOut()}>Sign Out</button> */}
            </div>
          ) : (
            <Link
              href='/auth/sign-in'
              className='hover:text-white/90 transition-colors'
            >
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
