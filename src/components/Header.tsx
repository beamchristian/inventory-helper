"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// ** InstallAppControl (With Installed Check) **
// In your Header.tsx file

function InstallAppControl() {
  // This state controls the pop-up's visibility. It starts as false.
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // This state and effect handle the install prompt for non-Apple devices
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    // Check if the user is on an Apple mobile device
    setIsIOS(/iPhone|iPad|iPod/.test(navigator.userAgent));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const handleInstallClick = async () => {
    // If it's an iOS device, set state to true to show the instructions
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    // For other devices, trigger the standard install prompt
    if (deferredPrompt) {
      // @ts-expect-error - prompt() is a non-standard property
      deferredPrompt.prompt();
      // @ts-expect-error - userChoice is a non-standard property
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
  };

  // Logic to determine if the install button should be shown at all
  const canInstall = deferredPrompt || isIOS;
  if (!canInstall) {
    return null;
  }

  return (
    // Add `relative` to position the pop-up correctly
    <div className='relative flex flex-col items-center'>
      <button onClick={handleInstallClick} title='Install App'>
        📱
      </button>

      {/* This JSX block is now correctly rendered ONLY when showIOSInstructions is true */}
      {showIOSInstructions && (
        <div className='absolute top-full right-0 mt-2 w-64 p-4 bg-white dark:bg-gray-900 border dark:border-gray-700 rounded-lg shadow-xl z-20'>
          <h3 className='text-md font-bold mb-2 text-center text-gray-900 dark:text-white'>
            Install App Phone
          </h3>
          <ol className='list-decimal list-inside text-sm space-y-2 text-gray-700 dark:text-gray-300'>
            <li>Tap the **Share** button in your browser&apos;s menu.</li>
            <li>
              Scroll down and tap on &apos;**Add to Home Screen**&apos; ➕.
            </li>
          </ol>
          {/* This button sets the state to false, hiding the pop-up */}
          <button
            onClick={() => setShowIOSInstructions(false)}
            className='w-full mt-4 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600'
          >
            Got It
          </button>
        </div>
      )}
    </div>
  );
}

// --- SVG ICONS ---
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

// --- MAIN HEADER COMPONENT ---
export default function Header() {
  const { data, status } = useSession();
  const userIdentifier = data?.user?.name || data?.user?.email;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isAdmin = data?.user?.role === "ADMIN";

  return (
    <header className='bg-primary text-primary-foreground shadow-md relative'>
      <div className='container mx-auto flex justify-between items-center p-4'>
        <Link href='/' className='text-2xl font-bold hover:text-white/90'>
          Inventory App
        </Link>
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
              {isAdmin && (
                <Link
                  href='/admin'
                  className='font-semibold text-accent-foreground hover:text-white/90 transition-colors'
                >
                  Admin
                </Link>
              )}
              <div className='flex items-center gap-x-2 ml-4'>
                <InstallAppControl />
              </div>
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
            {isAdmin && (
              <Link
                href='/admin'
                className='font-semibold text-accent-foreground hover:text-white/90 transition-colors w-full'
                onClick={() => setIsMenuOpen(false)}
              >
                Admin
              </Link>
            )}
            <div className='border-t border-primary-foreground/20 w-full my-2'></div>
            <div className='flex items-center justify-around w-full'>
              <div className='text-center'>
                <p className='text-sm'>Install App</p>
                <InstallAppControl />
              </div>
            </div>
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
