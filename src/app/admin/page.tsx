"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Role } from "@prisma/client";
import {
  useAdminUsers,
  useCreateUser,
  useUpdateUserRole,
  useDeleteUser,
  useCopyItems,
  AdminUser,
  NewUserPayload,
} from "@/hooks/useAdmin";

const LoadingSpinner = () => (
  <div className='flex justify-center items-center h-20'>
    <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-primary'></div>
  </div>
);

const AdminPage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);

  const [sourceUserId, setSourceUserId] = useState("");
  const [targetUserId, setTargetUserId] = useState("");

  const {
    data: users,
    isLoading,
    isError,
  } = useAdminUsers({
    enabled: status === "authenticated" && session?.user?.role === "ADMIN",
  });

  const createUserMutation = useCreateUser();
  const updateUserRoleMutation = useUpdateUserRole();
  const deleteUserMutation = useDeleteUser();
  const copyItemsMutation = useCopyItems();

  useEffect(() => {
    if (status === "loading") {
      return;
    }
    if (
      status === "unauthenticated" ||
      (status === "authenticated" && session?.user?.role !== "ADMIN")
    ) {
      router.push("/");
    }
  }, [status, session, router]);

  if (status !== "authenticated" || session?.user?.role !== "ADMIN") {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <LoadingSpinner />
      </div>
    );
  }

  const handleCreateUser = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newUserPayload: NewUserPayload = {
      name: formData.get("name") as string,
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      role: formData.get("role") as Role,
    };
    if (
      !newUserPayload.name ||
      !newUserPayload.email ||
      !newUserPayload.password ||
      !newUserPayload.role
    ) {
      alert("Please fill out all fields.");
      return;
    }
    createUserMutation.mutate(newUserPayload, {
      onSuccess: () => setCreateModalOpen(false),
      onError: (error) => alert(`Error: ${error.message}`),
    });
  };

  const handleRoleChange = (userId: string, newRole: Role) => {
    if (confirm(`Change this user's role to ${newRole}?`)) {
      updateUserRoleMutation.mutate({ userId, role: newRole });
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm("Are you sure you want to permanently delete this user?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleCopy = () => {
    if (!sourceUserId || !targetUserId) {
      alert("Please select both a source and a target user.");
      return;
    }
    if (sourceUserId === targetUserId) {
      alert("Source and target users cannot be the same.");
      return;
    }

    const sourceUserName =
      users?.find((u) => u.id === sourceUserId)?.name || "the source user";
    const targetUserName =
      users?.find((u) => u.id === targetUserId)?.name || "the target user";

    if (
      confirm(
        `Are you sure you want to COPY all master items from ${sourceUserName} to ${targetUserName}? The source user will keep their items.`
      )
    ) {
      copyItemsMutation.mutate(
        { sourceUserId, targetUserId },
        {
          onSuccess: (data) => {
            alert(`Success: ${data.message}`);
            setSourceUserId("");
            setTargetUserId("");
          },
          onError: (error) => {
            alert(`Error: ${error.message}`);
          },
        }
      );
    }
  };

  return (
    <div className='container mx-auto p-4 max-w-4xl'>
      <h1 className='text-3xl font-bold mb-6 text-foreground'>
        Admin Dashboard
      </h1>

      <div className='bg-background-surface p-6 rounded-lg shadow-md mb-8'>
        <h2 className='text-2xl font-semibold text-foreground mb-4'>
          Copy Master Items
        </h2>
        <p className='text-sm text-text-muted mb-4'>
          This action will create a copy of all master items from a source user
          and assign them to a target user. The source user&apos;s items will
          not be affected.
        </p>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-end'>
          <div>
            <label
              htmlFor='sourceUser'
              className='block text-text-base text-sm font-medium mb-1'
            >
              From User (Source)
            </label>
            <select
              id='sourceUser'
              value={sourceUserId}
              onChange={(e) => setSourceUserId(e.target.value)}
              className='w-full p-2 border border-border-base rounded bg-background text-foreground'
            >
              <option value=''>Select Source...</option>
              {users?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor='targetUser'
              className='block text-text-base text-sm font-medium mb-1'
            >
              To User (Target)
            </label>
            <select
              id='targetUser'
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className='w-full p-2 border border-border-base rounded bg-background text-foreground'
            >
              <option value=''>Select Target...</option>
              {users?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleCopy}
            disabled={
              !sourceUserId || !targetUserId || copyItemsMutation.isPending
            }
            className='bg-accent hover:bg-accent/80 text-text-inverse font-bold py-2 px-4 rounded disabled:opacity-50'
          >
            {copyItemsMutation.isPending ? "Copying..." : "Copy Items"}
          </button>
        </div>
      </div>

      <div className='bg-background-surface p-6 rounded-lg shadow-md'>
        <div className='flex justify-between items-center mb-4'>
          <h2 className='text-2xl font-semibold text-foreground'>
            Manage Users
          </h2>
          <button
            onClick={() => setCreateModalOpen(true)}
            className='bg-primary hover:bg-primary/80 text-text-inverse font-bold py-2 px-4 rounded'
          >
            Create New User
          </button>
        </div>

        {isLoading && <LoadingSpinner />}
        {isError && <p className='text-error'>Failed to load users.</p>}

        <div className='overflow-x-auto'>
          <table className='min-w-full bg-background'>
            <thead>
              <tr className='bg-background-base text-left text-xs font-semibold text-text-muted uppercase tracking-wider'>
                <th className='py-3 px-4'>Name</th>
                <th className='py-3 px-4'>Email</th>
                <th className='py-3 px-4'>Role</th>
                <th className='py-3 px-4 text-center'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user: AdminUser) => (
                <tr
                  key={user.id}
                  className='border-b border-border-base hover:bg-background-base'
                >
                  <td className='py-2 px-4 text-foreground'>{user.name}</td>
                  <td className='py-2 px-4 text-text-muted'>{user.email}</td>
                  <td className='py-2 px-4'>
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChange(user.id, e.target.value as Role)
                      }
                      disabled={
                        user.id === session?.user.id ||
                        updateUserRoleMutation.isPending
                      }
                      className='p-1 border border-border-base rounded bg-background text-foreground'
                    >
                      {Object.values(Role).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className='py-2 px-4 text-center'>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={
                        user.id === session?.user.id ||
                        deleteUserMutation.isPending
                      }
                      className='text-error hover:text-error/80 text-sm disabled:opacity-50'
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50'>
          <div className='bg-background-surface p-8 rounded-lg shadow-xl w-full max-w-md'>
            <h3 className='text-2xl font-bold mb-4'>Create New User</h3>
            <form onSubmit={handleCreateUser}>
              <div className='mb-4'>
                <label className='block text-text-base mb-1'>Full Name</label>
                <input
                  name='name'
                  type='text'
                  required
                  className='w-full p-2 border rounded bg-background text-foreground'
                />
              </div>
              <div className='mb-4'>
                <label className='block text-text-base mb-1'>Email</label>
                <input
                  name='email'
                  type='email'
                  required
                  className='w-full p-2 border rounded bg-background text-foreground'
                />
              </div>
              <div className='mb-4'>
                <label className='block text-text-base mb-1'>Password</label>
                <input
                  name='password'
                  type='password'
                  required
                  className='w-full p-2 border rounded bg-background text-foreground'
                />
              </div>
              <div className='mb-6'>
                <label className='block text-text-base mb-1'>Role</label>
                <select
                  name='role'
                  defaultValue={Role.TEAM_MEMBER}
                  className='w-full p-2 border rounded bg-background text-foreground'
                >
                  {Object.values(Role).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className='flex justify-end gap-4'>
                <button
                  type='button'
                  onClick={() => setCreateModalOpen(false)}
                  className='bg-secondary text-text-inverse px-4 py-2 rounded'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={createUserMutation.isPending}
                  className='bg-primary text-text-inverse px-4 py-2 rounded'
                >
                  {createUserMutation.isPending ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
