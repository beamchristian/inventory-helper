// src/app/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth"; // Server-side authentication
import InventoryClientPage from "@/components/InventoryClientPage"; // Import the new client component

/**
 * HomePage Server Component
 * This component runs on the server. It handles authentication checks
 * and then renders the client-side InventoryClientPage component.
 */
export default async function HomePage() {
  // Check for authentication on the server
  const session = await auth();

  // If no session, redirect to the sign-in page
  if (!session) {
    redirect("/sign-in"); // Corrected path based on previous discussion
  }

  // If authenticated, render the client component which will handle
  // data fetching and interactions.
  return (
    // The main layout and any initial server-rendered elements can go here
    // before the client component takes over.
    <InventoryClientPage />
  );
}
