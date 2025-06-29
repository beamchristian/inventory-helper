"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";

// A simple SVG icon for the menu (hamburger)
const MenuIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <line x1='4' x2='20' y1='12' y2='12' />
    <line x1='4' x2='20' y1='6' y2='6' />
    <line x1='4' x2='20' y1='18' y2='18' />
  </svg>
);

// A simple SVG icon for the close (X)
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns='http://www.w3.org/2000/svg'
    width='24'
    height='24'
    viewBox='0 0 24 24'
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    strokeLinecap='round'
    strokeLinejoin='round'
  >
    <path d='M18 6 6 18' />
    <path d='m6 6 12 12' />
  </svg>
);

export default function Header() {
  const { data, status } = useSession();
  const userIdentifier = data?.user?.name || data?.user?.email;
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className='bg-primary text-primary-foreground shadow-md relative'>
      <div className='container mx-auto flex justify-between items-center p-4'>
        <Link href='/' className='text-2xl font-bold hover:text-white/90'>
          Inventory App
        </Link>

        {/* Desktop Navigation (Visible on medium screens and up) */}
        <nav className='hidden md:flex items-center gap-x-4'>
          {status === "authenticated" && (
            <>
              <Link href='/' className='hover:text-white/90 transition-colors'>
                My Inventories
              </Link>
              <Link
                href='/settings'
                className='hover:text-white/90 transition-colors'
              >
                Settings
              </Link>
              {userIdentifier && (
                <span
                  className='font-semibold truncate max-w-40'
                  title={userIdentifier}
                >
                  {userIdentifier}
                </span>
              )}
              <Button variant='secondary' onClick={() => signOut()}>
                Sign Out
              </Button>
            </>
          )}
          {status === "unauthenticated" && (
            <Link
              href='/sign-in'
              className='hover:text-white/90 transition-colors'
            >
              Sign In
            </Link>
          )}
        </nav>

        {/* Mobile Menu Button (Visible on small screens) */}
        <div className='md:hidden'>
          {status === "authenticated" && (
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label='Toggle mobile menu'
              className='p-1'
            >
              {isMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          )}
          {status === "unauthenticated" && (
            <Link
              href='/sign-in'
              className='hover:text-white/90 transition-colors'
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && status === "authenticated" && (
        <nav className='md:hidden bg-primary shadow-lg absolute top-full left-0 w-full'>
          <div className='container mx-auto flex flex-col items-start p-4 gap-4'>
            <Link
              href='/'
              className='hover:text-white/90 transition-colors w-full'
              onClick={() => setIsMenuOpen(false)}
            >
              My Inventories
            </Link>
            <Link
              href='/settings'
              className='hover:text-white/90 transition-colors w-full'
              onClick={() => setIsMenuOpen(false)}
            >
              Settings
            </Link>
            <div className='border-t border-primary-foreground/20 w-full my-2'></div>
            {userIdentifier && (
              <span
                className='font-semibold truncate w-full'
                title={userIdentifier}
              >
                {userIdentifier}
              </span>
            )}
            <Button
              variant='secondary'
              className='w-full'
              onClick={() => {
                signOut();
                setIsMenuOpen(false);
              }}
            >
              Sign Out
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
