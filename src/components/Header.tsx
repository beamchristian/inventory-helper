"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image"; // Import the Next.js Image component
import { Button } from "@/components/ui/button";

// ** InstallAppControl (With Installed Check) **
function InstallAppControl() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  // 1. Add new state to track if the app is already installed
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 2. Check the display mode when the component mounts
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

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
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    if (deferredPrompt) {
      // @ts-expect-error - prompt() is a non-standard property on the Event type
      deferredPrompt.prompt();
      // @ts-expect-error - userChoice is a non-standard property on the Event type
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
  };

  // 3. If the app is installed, show a success message and stop.
  if (isStandalone) {
    return (
      <div className='flex flex-col items-center text-emerald-500'>
        <span className='text-2xl' title='App is installed'>
          ✅
        </span>
      </div>
    );
  }

  // The rest of the logic remains the same
  if (!isIOS && !deferredPrompt) {
    return null;
  }

  return (
    <div className='flex flex-col items-center relative'>
      <Button
        variant='ghost'
        size='sm'
        onClick={handleInstallClick}
        title='Install App'
      >
        📱
      </Button>
      {showIOSInstructions && (
        <div className='absolute top-full mt-2 w-64 p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl z-10 text-black dark:text-white'>
          <h3 className='text-md font-bold mb-2 text-center'>
            Install App on iPhone
          </h3>
          <ol className='list-decimal list-inside text-sm space-y-2'>
            <li>
              Tap the <span className='font-bold'>Share</span> button
              <Image
                src='/icons/ios-share.png'
                alt='iOS Share Icon'
                width={20}
                height={20}
                className='inline h-5 w-5 mx-1'
              />
              in your browser&apos;s menu.
            </li>
            <li>
              Scroll down and tap on{" "}
              <span className='font-bold'>&apos;Add to Home Screen&apos;</span>
              <Image
                src='/icons/ios-add.png'
                alt='iOS Add to Home Screen Icon'
                width={20}
                height={20}
                className='inline h-5 w-5 ml-1'
              />
              .
            </li>
          </ol>
          <Button
            variant='secondary'
            className='w-full mt-4'
            onClick={() => setShowIOSInstructions(false)}
          >
            Got It
          </Button>
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
