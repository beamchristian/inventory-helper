import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { User, Role } from "@prisma/client";

export type AdminUser = Pick<
  User,
  "id" | "name" | "email" | "role" | "createdAt"
>;
export interface NewUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}
type UseAdminUsersOptions = Omit<
  UseQueryOptions<AdminUser[]>,
  "queryKey" | "queryFn"
>;

export const useAdminUsers = (options?: UseAdminUsersOptions) => {
  return useQuery<AdminUser[]>({
    queryKey: ["adminUsers"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch users");
      }
      return response.json();
    },
    ...options,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userData: NewUserPayload) => {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: Role }) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update role");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    },
  });
};

/**
 * Hook to COPY master items from one user to another.
 */
export const useCopyItems = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      sourceUserId,
      targetUserId,
    }: {
      sourceUserId: string;
      targetUserId: string;
    }) => {
      const response = await fetch("/api/admin/transfer-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUserId, targetUserId }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to copy items");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
    },
  });
};
