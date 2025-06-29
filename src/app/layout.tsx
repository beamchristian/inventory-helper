// src/app/layout.tsx
import "./globals.css";
import Header from "@/components/Header";
import { Inter } from "next/font/google";
import { auth } from "@/lib/auth";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth(); // <--- Fetch the session on the server

  return (
    <html lang='en'>
      <body className={inter.className}>
        <Providers session={session}>
          <Header />
          <div className='min-h-screen bg-background-surface flex flex-col'>
            <div className='flex-grow'>{children}</div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
