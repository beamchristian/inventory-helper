// src/components/Header.tsx
"use client";

import { useSession, signOut } from "next-auth/react"; // Import signOut
import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button"; // Assuming you use shadcn/ui

export default function Header() {
  const { data, status } = useSession();

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
              <Link href='/' className='hover:text-white/90 transition-colors'>
                My Inventories
              </Link>
              <Link
                href='/settings'
                className='hover:text-white/90 transition-colors'
              >
                Settings
              </Link>
              <span className='font-semibold'>
                {data?.user?.name || data?.user?.email}
              </span>
              {/* Uncommented and styled the sign-out button */}
              <Button variant='secondary' onClick={() => signOut()}>
                Sign Out
              </Button>
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
