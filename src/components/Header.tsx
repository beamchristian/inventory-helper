"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Placeholder for server actions. Replace with your actual imports if they exist.
// const subscribeUser = async (sub: any) => console.log("Subscribing:", sub);
// const unsubscribeUser = async (endpoint: string) =>
//   console.log("Unsubscribing:", endpoint);

// --- HELPER FUNCTIONS & PWA COMPONENTS ---

// ** PushNotificationControl (Corrected to prevent loops) **
// function PushNotificationControl() {
//   // Initialize state once using an initializer function.
//   const [isSupported, setIsSupported] = useState(() => {
//     if (typeof window === "undefined") return false;
//     return "serviceWorker" in navigator && "PushManager" in window;
//   });

//   const [subscription, setSubscription] = useState<PushSubscription | null>(
//     null
//   );

//   // This effect now runs only when `isSupported` becomes true.
//   useEffect(() => {
//     if (!isSupported) return;

//     const getInitialSubscription = async () => {
//       const registration = await navigator.serviceWorker.ready;
//       const sub = await registration.pushManager.getSubscription();
//       if (sub) {
//         setSubscription(sub);
//       }
//     };
//     getInitialSubscription();
//   }, [isSupported]);

//   const handleSubscribe = async () => {
//     if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
//       alert("VAPID public key is not set in environment variables.");
//       return;
//     }
//     const registration = await navigator.serviceWorker.ready;
//     try {
//       const sub = await registration.pushManager.subscribe({
//         userVisibleOnly: true,
//         applicationServerKey: urlBase64ToUint8Array(
//           process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
//         ),
//       });
//       setSubscription(sub);
//       await subscribeUser(sub.toJSON());
//       alert("Successfully subscribed!");
//     } catch (error) {
//       console.error("Failed to subscribe:", error);
//       alert("Failed to subscribe. Check console for details.");
//     }
//   };

//   const handleUnsubscribe = async () => {
//     if (subscription) {
//       await subscription.unsubscribe();
//       await unsubscribeUser(subscription.endpoint);
//       setSubscription(null);
//       alert("Successfully unsubscribed.");
//     }
//   };

//   if (!isSupported) {
//     return null;
//   }

//   return (
//     <div className='flex flex-col items-center'>
//       {subscription ? (
//         <Button
//           variant='ghost'
//           size='sm'
//           onClick={handleUnsubscribe}
//           title='Unsubscribe from notifications'
//         >
//           🔕
//         </Button>
//       ) : (
//         <Button
//           variant='ghost'
//           size='sm'
//           onClick={handleSubscribe}
//           title='Subscribe to notifications'
//         >
//           🔔
//         </Button>
//       )}
//     </div>
//   );
// }

// ** InstallAppControl (With iOS Instructions) **
function InstallAppControl() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // 1. Detect if the user is on an iOS device
    setIsIOS(/iPhone|iPad|iPod/.test(navigator.userAgent));

    // 2. Set up the standard install prompt listener
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
    // If it's an iOS device, just show the instructions pop-up
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }

    // For other devices, trigger the default install prompt
    if (deferredPrompt) {
      // @ts-expect-error
      deferredPrompt.prompt();
      // @ts-expect-error
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
  };

  // Only hide the button if it's not an iOS device AND there's no install prompt
  if (!isIOS && !deferredPrompt) {
    return null;
  }

  return (
    // Add `relative` to allow the absolute positioning of the pop-up
    <div className='flex flex-col items-center relative'>
      <Button
        variant='ghost'
        size='sm'
        onClick={handleInstallClick}
        title='Install App'
      >
        📱
      </Button>

      {/* This is the pop-up for iOS users */}
      {showIOSInstructions && (
        <div className='absolute top-full mt-2 w-64 p-4 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl z-10 text-black dark:text-white'>
          <h3 className='text-md font-bold mb-2 text-center'>
            Install App on iPhone
          </h3>
          <ol className='list-decimal list-inside text-sm space-y-2'>
            <li>
              Tap the <span className='font-bold'>Share</span> button
              <img
                src='/icons/ios-share.png'
                alt='iOS Share Icon'
                className='inline h-5 w-5 mx-1'
              />
              in your browser's menu.
            </li>
            <li>
              Scroll down and tap on{" "}
              <span className='font-bold'>'Add to Home Screen'</span>
              <img
                src='/icons/ios-add.png'
                alt='iOS Add to Home Screen Icon'
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

        {/* Desktop Navigation */}
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

        {/* Mobile Menu Button */}
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
              <div className='text-center'>
                <p className='text-sm'>Notifications</p>
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
