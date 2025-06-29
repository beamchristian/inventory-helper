import { useQuery } from "@tanstack/react-query";
import { User as PrismaUser } from "@prisma/client";

// Define a new "client-side" user type where dates are strings.
// This accurately represents the data after it has been serialized to JSON.
export type ClientUser = Omit<
  PrismaUser,
  "createdAt" | "updatedAt" | "emailVerified"
> & {
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;
};

const fetchUsers = async (): Promise<ClientUser[]> => {
  const response = await fetch("/api/users");

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "An unknown error occurred" }));
    throw new Error(errorData.message || "Failed to fetch users");
  }

  return response.json();
};

export const useUsers = (enabled: boolean = true) => {
  // Use the ClientUser type here to correctly type the hook's return data.
  return useQuery<ClientUser[], Error>({
    queryKey: ["users"],
    queryFn: fetchUsers,
    enabled: enabled,
  });
};
