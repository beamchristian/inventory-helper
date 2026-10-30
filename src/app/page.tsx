"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import {
  useInventories,
  useCreateInventory,
  useDeleteInventory,
} from "../hooks/useInventories";

import { Inventory } from "../types";
import { PaginationControls } from "@/components/PaginationControls";
import { useDialog } from "@/components/DialogProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { ArrowRight, ClipboardList, Plus, Trash2 } from "lucide-react";

const HomePage: React.FC = () => {
  const router = useRouter();
  const { status } = useSession();

  // 1. Add state for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6); // e.g., 6 cards per page

  // 2. Pass pagination state to the useInventories hook
  const {
    data: paginatedData, // Rename to avoid confusion
    isLoading: isInventoriesLoading,
    isError,
    error,
  } = useInventories({
    page: currentPage,
    limit: itemsPerPage,
    enabled: status === "authenticated",
  });

  // 3. Extract the inventories array and pagination details from the response
  const inventories = paginatedData?.data;
  const pagination = paginatedData?.pagination;

  const createInventoryMutation = useCreateInventory();
  const deleteInventoryMutation = useDeleteInventory();
  const dialog = useDialog();

  const [newInventoryName, setNewInventoryName] = useState<string>("");

  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInventoryName.trim()) {
      dialog.alert({
        title: "Name required",
        message: "Give the inventory a name before creating it.",
      });
      return;
    }
    try {
      const newInventory = await createInventoryMutation.mutateAsync({
        name: newInventoryName.trim(),
        status: "draft",
        settings: {},
      });
      setNewInventoryName("");
      router.push(`/inventories/${newInventory.id}`);
    } catch (err) {
      console.error("Error creating inventory:", err);
      dialog.alert({
        title: "Couldn't create the inventory",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const handleDeleteInventory = async (
    inventoryId: string,
    inventoryName: string,
  ) => {
    const confirmed = await dialog.confirm({
      title: "Delete inventory?",
      message: `"${inventoryName}" and all of its counts will be permanently deleted.`,
      confirmLabel: "Delete",
      destructive: true,
    });
    if (confirmed) {
      try {
        await deleteInventoryMutation.mutateAsync(inventoryId);
      } catch (err) {
        console.error("Error deleting inventory:", err);
        dialog.alert({
          title: "Couldn't delete the inventory",
          message: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page
  };

  const isLoading = status === "loading" || isInventoriesLoading;

  return (
    <PageContainer>
      <PageHeader
        title="Inventories"
        description="Start a new count or pick up where you left off."
      />

      {status === "authenticated" && (
        <Card className="mb-6">
          <CardContent>
            <form
              onSubmit={handleCreateInventory}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Input
                type="text"
                placeholder='New inventory name, e.g. "Weekly count – Oct 27"'
                value={newInventoryName}
                onChange={(e) => setNewInventoryName(e.target.value)}
                required
                aria-label="New inventory name"
                className="sm:flex-1"
              />
              <Button
                type="submit"
                disabled={createInventoryMutation.isPending}
              >
                <Plus />
                {createInventoryMutation.isPending
                  ? "Creating..."
                  : "New inventory"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>All inventories</CardTitle>
            {pagination?.totalItems != null && (
              <CardDescription>
                {pagination.totalItems}{" "}
                {pagination.totalItems === 1 ? "inventory" : "inventories"}
              </CardDescription>
            )}
          </div>
        </CardHeader>

        {isLoading && <LoadingSpinner className="h-40" />}

        {status === "unauthenticated" && (
          <p className="p-5 text-sm text-muted-foreground">
            Please sign in to view your inventories.
          </p>
        )}

        {isError && (
          <p className="p-5 text-sm text-destructive">
            Error loading inventories: {error?.message}
          </p>
        )}

        {status === "authenticated" &&
          !isLoading &&
          !isError &&
          (!inventories || inventories.length === 0) && (
            <div className="flex flex-col items-center px-5 py-14 text-center">
              <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ClipboardList className="size-5" />
              </span>
              <p className="text-sm font-medium text-foreground">
                No inventories yet
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create your first one above to start counting.
              </p>
            </div>
          )}

        {status === "authenticated" &&
          !isLoading &&
          !isError &&
          inventories &&
          inventories.length > 0 && (
            <>
              <ul className="divide-y divide-border">
                {inventories.map((inventory: Inventory) => (
                  <li
                    key={inventory.id}
                    className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/50"
                  >
                    <button
                      onClick={() =>
                        router.push(`/inventories/${inventory.id}`)
                      }
                      className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left sm:flex-row sm:items-center sm:gap-4"
                    >
                      <span className="truncate font-medium text-foreground group-hover:text-primary">
                        {inventory.name}
                      </span>
                      <span className="flex items-center gap-3">
                        <StatusBadge status={inventory.status} />
                        <span className="text-xs text-muted-foreground">
                          Created{" "}
                          {new Date(inventory.created_at).toLocaleDateString()}
                        </span>
                      </span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/inventories/${inventory.id}`)
                        }
                      >
                        {inventory.status === "completed" ? "View" : "Resume"}
                        <ArrowRight />
                      </Button>
                      <Button
                        variant="ghost-destructive"
                        size="icon-sm"
                        onClick={() =>
                          handleDeleteInventory(inventory.id, inventory.name)
                        }
                        disabled={deleteInventoryMutation.isPending}
                        title="Delete inventory"
                        aria-label={`Delete ${inventory.name}`}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>

              <PaginationControls
                currentPage={currentPage}
                totalPages={pagination?.totalPages || 1}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={handleItemsPerPageChange}
                noun="Page"
              />
            </>
          )}
      </Card>
    </PageContainer>
  );
};

export default HomePage;
