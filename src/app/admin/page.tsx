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
import Modal from "@/components/Modal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { ArrowRight, Copy, Trash2, UserPlus } from "lucide-react";

// TEAM_MEMBER -> "Team member"
const formatRole = (role: string) =>
  role.charAt(0) + role.slice(1).toLowerCase().replace(/_/g, " ");

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
      <LoadingSpinner className='min-h-[60vh]' />
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
    if (
      confirm(
        "Permanently delete this user? Their items and inventories will be deleted too. This cannot be undone."
      )
    ) {
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
    <PageContainer>
      <PageHeader
        title='Admin'
        description='Manage user accounts and share item lists between users.'
        actions={
          <Button onClick={() => setCreateModalOpen(true)}>
            <UserPlus />
            New user
          </Button>
        }
      />

      <Card className='mb-6 overflow-hidden'>
        <CardHeader>
          <div>
            <CardTitle>Users</CardTitle>
            {users && (
              <CardDescription>
                {users.length} {users.length === 1 ? "account" : "accounts"}
              </CardDescription>
            )}
          </div>
        </CardHeader>

        {isLoading && <LoadingSpinner />}
        {isError && (
          <p className='p-5 text-sm text-destructive'>Failed to load users.</p>
        )}

        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead className='border-b border-border bg-muted/50 text-left text-xs text-muted-foreground'>
              <tr>
                <th className='px-5 py-2.5 font-medium'>Name</th>
                <th className='px-5 py-2.5 font-medium'>Email</th>
                <th className='px-5 py-2.5 font-medium'>Role</th>
                <th className='px-5 py-2.5 font-medium'>
                  <span className='sr-only'>Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border'>
              {users?.map((user: AdminUser) => {
                const isSelf = user.id === session?.user.id;
                return (
                  <tr
                    key={user.id}
                    className='transition-colors hover:bg-muted/40'
                  >
                    <td className='whitespace-nowrap px-5 py-2.5 font-medium text-foreground'>
                      {user.name}
                      {isSelf && (
                        <Badge variant='primary' className='ml-2 normal-case'>
                          You
                        </Badge>
                      )}
                    </td>
                    <td className='px-5 py-2.5 text-muted-foreground'>
                      {user.email}
                    </td>
                    <td className='px-5 py-2.5'>
                      <Select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value as Role)
                        }
                        disabled={isSelf || updateUserRoleMutation.isPending}
                        className='h-8 w-40'
                        aria-label={`Role for ${user.name}`}
                      >
                        {Object.values(Role).map((role) => (
                          <option key={role} value={role}>
                            {formatRole(role)}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className='px-5 py-2.5 text-right'>
                      <Button
                        variant='ghost-destructive'
                        size='icon-sm'
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={isSelf || deleteUserMutation.isPending}
                        title='Delete user'
                        aria-label={`Delete ${user.name}`}
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Copy items between users</CardTitle>
            <CardDescription>
              Copies every master item from the source user to the target
              user. The source user&apos;s items are not changed.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className='grid grid-cols-1 items-end gap-4 md:grid-cols-[1fr_auto_1fr_auto]'>
          <div>
            <Label htmlFor='sourceUser'>From</Label>
            <Select
              id='sourceUser'
              value={sourceUserId}
              onChange={(e) => setSourceUserId(e.target.value)}
            >
              <option value=''>Select source user…</option>
              {users?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </Select>
          </div>
          <ArrowRight className='mb-2.5 hidden size-4 text-muted-foreground md:block' />
          <div>
            <Label htmlFor='targetUser'>To</Label>
            <Select
              id='targetUser'
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
            >
              <option value=''>Select target user…</option>
              {users?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </Select>
          </div>
          <Button
            variant='outline'
            onClick={handleCopy}
            disabled={
              !sourceUserId || !targetUserId || copyItemsMutation.isPending
            }
          >
            <Copy />
            {copyItemsMutation.isPending ? "Copying..." : "Copy items"}
          </Button>
        </CardContent>
      </Card>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title='New user'
        description='They can sign in with this email and password.'
      >
        <form onSubmit={handleCreateUser} className='space-y-4'>
          <div>
            <Label htmlFor='newUserName'>Full name</Label>
            <Input id='newUserName' name='name' type='text' required />
          </div>
          <div>
            <Label htmlFor='newUserEmail'>Email</Label>
            <Input id='newUserEmail' name='email' type='email' required />
          </div>
          <div>
            <Label htmlFor='newUserPassword'>Password</Label>
            <Input
              id='newUserPassword'
              name='password'
              type='password'
              autoComplete='new-password'
              required
            />
          </div>
          <div>
            <Label htmlFor='newUserRole'>Role</Label>
            <Select
              id='newUserRole'
              name='role'
              defaultValue={Role.TEAM_MEMBER}
            >
              {Object.values(Role).map((role) => (
                <option key={role} value={role}>
                  {formatRole(role)}
                </option>
              ))}
            </Select>
          </div>
          <div className='flex justify-end gap-2 pt-2'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type='submit' disabled={createUserMutation.isPending}>
              {createUserMutation.isPending ? "Creating..." : "Create user"}
            </Button>
          </div>
        </form>
      </Modal>
    </PageContainer>
  );
};

export default AdminPage;
