// src/app/layout.tsx
import "./globals.css";
import Header from "@/components/Header";
import { Inter } from "next/font/google";
import { auth } from "@/lib/auth";
import Providers from "@/components/Providers";
import { Metadata, Viewport } from "next";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const APP_NAME = "Inventory Helper";
const APP_DEFAULT_TITLE = "Inventory Helper";
const APP_TITLE_TEMPLATE = "%s - Inventory Helper";
const APP_DESCRIPTION =
  "An application created to assist in counting inventories.";

export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: {
    default: APP_DEFAULT_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  description: APP_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_DEFAULT_TITLE,
    // startUpImage: [],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#18181B" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang='en'>
      <body className={`${inter.variable} font-sans`}>
        <Providers session={session}>
          <div className='flex min-h-screen flex-col bg-background'>
            <Header />
            <div className='flex-grow'>{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
