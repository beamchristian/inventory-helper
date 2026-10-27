"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Download, LogOut, Menu, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ** InstallAppControl (With Installed Check) **
function InstallAppControl({ showLabel = false }: { showLabel?: boolean }) {
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
        handleBeforeInstallPrompt,
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
    // `relative` positions the pop-up correctly
    <div className='relative'>
      <Button
        variant='ghost'
        size={showLabel ? "default" : "icon"}
        onClick={handleInstallClick}
        title='Install app'
        aria-label='Install app'
        className={cn(showLabel && "w-full justify-start")}
      >
        <Download />
        {showLabel && "Install app"}
      </Button>

      {showIOSInstructions && (
        <div className='absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-lg'>
          <h3 className='mb-2 text-sm font-semibold'>Install on your phone</h3>
          <ol className='list-inside list-decimal space-y-1.5 text-sm text-muted-foreground'>
            <li>
              Tap the <Share className='inline size-3.5 align-[-2px]' />{" "}
              <span className='font-medium text-foreground'>Share</span> button.
            </li>
            <li>
              Choose{" "}
              <span className='font-medium text-foreground'>
                Add to Home Screen
              </span>
              .
            </li>
          </ol>
          <Button
            variant='secondary'
            size='sm'
            className='mt-4 w-full'
            onClick={() => setShowIOSInstructions(false)}
          >
            Got it
          </Button>
        </div>
      )}
    </div>
  );
}

const NAV_LINKS = [
  { href: "/", label: "Inventories" },
  { href: "/settings", label: "Items" },
];

function getInitials(value: string) {
  const parts = value.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase();
}

// --- MAIN HEADER COMPONENT ---
export default function Header() {
  const { data, status } = useSession();
  const pathname = usePathname();
  const userIdentifier = data?.user?.name || data?.user?.email;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isAdmin = data?.user?.role === "ADMIN";

  const links = isAdmin
    ? [...NAV_LINKS, { href: "/admin", label: "Admin" }]
    : NAV_LINKS;

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/" || pathname.startsWith("/inventories")
      : pathname.startsWith(href);

  return (
    <header className='sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75'>
      <div className='mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6'>
        <div className='flex items-center gap-8'>
          <Link
            href='/'
            className='flex items-center gap-2 font-semibold text-foreground'
          >
            <span className='flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground'>
              <Boxes className='size-4' />
            </span>
            <span>Inventory Helper</span>
          </Link>

          {status === "authenticated" && (
            <nav className='hidden items-center gap-1 md:flex'>
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive(link.href)
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {status === "authenticated" && (
          <div className='hidden items-center gap-2 md:flex'>
            <InstallAppControl />
            {userIdentifier && (
              <div
                className='flex items-center gap-2 pl-2 text-sm'
                title={userIdentifier}
              >
                <span className='flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground'>
                  {getInitials(userIdentifier)}
                </span>
                <span className='max-w-40 truncate font-medium text-foreground'>
                  {userIdentifier}
                </span>
              </div>
            )}
            <Button variant='ghost' size='sm' onClick={() => signOut()}>
              <LogOut />
              Sign out
            </Button>
          </div>
        )}

        {status === "unauthenticated" && pathname !== "/sign-in" && (
          <Button asChild variant='outline' size='sm'>
            <Link href='/sign-in'>Sign in</Link>
          </Button>
        )}

        {status === "authenticated" && (
          <Button
            variant='ghost'
            size='icon'
            className='md:hidden'
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label='Toggle mobile menu'
          >
            {isMenuOpen ? <X /> : <Menu />}
          </Button>
        )}
      </div>

      {isMenuOpen && status === "authenticated" && (
        <nav className='absolute left-0 top-full w-full border-b border-border bg-card shadow-md md:hidden'>
          <div className='mx-auto flex max-w-6xl flex-col gap-1 p-3'>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium",
                  isActive(link.href)
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className='my-2 border-t border-border' />
            <InstallAppControl showLabel />
            {userIdentifier && (
              <p
                className='truncate px-3 py-2 text-sm text-muted-foreground'
                title={userIdentifier}
              >
                Signed in as{" "}
                <span className='font-medium text-foreground'>
                  {userIdentifier}
                </span>
              </p>
            )}
            <Button
              variant='outline'
              className='w-full'
              onClick={() => {
                signOut();
                setIsMenuOpen(false);
              }}
            >
              <LogOut />
              Sign out
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
