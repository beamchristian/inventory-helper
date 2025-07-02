import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Inventory } from "@/types";

export const useInventoryDetails = (inventoryId: string | undefined) => {
  const { status } = useSession();

  return useQuery<Inventory>({
    queryKey: ["inventory", inventoryId],
    queryFn: async () => {
      if (!inventoryId) throw new Error("Inventory ID is missing.");
      if (status !== "authenticated")
        throw new Error("Authentication required.");

      const response = await fetch(`/api/inventories/${inventoryId}`);
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ message: response.statusText }));
        throw new Error(
          errorData.message || `Failed to fetch inventory: ${response.status}`
        );
      }
      return response.json();
    },
    enabled: !!inventoryId && status === "authenticated",
  });
};
