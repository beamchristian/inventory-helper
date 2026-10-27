"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { CombinedInventoryItem, InventoryItemSortColumn, Item } from "@/types";
import { useAllItems } from "@/hooks/useItems";
import {
  useInventoryItems,
  useAddInventoryItem,
  useDeleteInventoryItem,
  useUpdateInventoryItem,
  useAddAllInventoryItems,
} from "@/hooks/useInventoryItems";
import { useUpdateInventory } from "@/hooks/useInventories";
import { PaginationControls } from "@/components/PaginationControls";
import { useInventoryDetails } from "@/hooks/useInventoryDetails";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { cn, handleCopyValue, showMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Copy,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";

// Sortable column header for the items table
function SortableTh({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  className,
}: {
  label: string;
  column: InventoryItemSortColumn;
  sortColumn: InventoryItemSortColumn;
  sortDirection: "asc" | "desc";
  onSort: (column: InventoryItemSortColumn) => void;
  className?: string;
}) {
  const isActive = sortColumn === column;
  return (
    <th className={cn("px-4 py-2.5 font-medium", className)}>
      <button
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          isActive && "text-foreground"
        )}
      >
        {label}
        {isActive &&
          (sortDirection === "asc" ? (
            <ArrowUp className='size-3' />
          ) : (
            <ArrowDown className='size-3' />
          ))}
      </button>
    </th>
  );
}

export default function InventoryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const inventoryId = params.inventoryId as string;
  const { status } = useSession();

  const [sortColumn, setSortColumn] =
    useState<InventoryItemSortColumn>("item_type");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedItemIdToAdd, setSelectedItemIdToAdd] = useState<string>("");
  const [showEntered, setShowEntered] = useState(false);

  const {
    data: inventory,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
    error: inventoryError,
  } = useInventoryDetails(inventoryId);
  const {
    data: allUserItems,
    isLoading: isAllItemsLoading,
    isError: isAllItemsError,
    error: allItemsError,
  } = useAllItems();
  const {
    data: currentInventoryItems,
    isLoading: isCurrentItemsLoading,
    isError: isCurrentItemsError,
    error: currentItemsError,
  } = useInventoryItems(inventoryId);

  const addInventoryItemMutation = useAddInventoryItem();
  const deleteInventoryItemMutation = useDeleteInventoryItem();
  const updateInventoryMutation = useUpdateInventory();
  const updateInventoryItemMutation = useUpdateInventoryItem();
  const addAllInventoryItemsMutation = useAddAllInventoryItems();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/sign-in");
    }
  }, [status, router]);

  const { unenteredItems, enteredItems } = useMemo(() => {
    if (!currentInventoryItems) {
      return { unenteredItems: [], enteredItems: [] };
    }
    const sortableItems = [...currentInventoryItems];
    sortableItems.sort((a, b) => {
      let aValue: string | number | null | undefined;
      let bValue: string | number | null | undefined;
      switch (sortColumn) {
        case "name":
          aValue = a.item.name;
          bValue = b.item.name;
          break;
        case "unit_type":
          aValue = a.item.unit_type;
          bValue = b.item.unit_type;
          break;
        case "upc_number":
          aValue = a.item.upc_number;
          bValue = b.item.upc_number;
          break;
        case "counted_units":
          aValue = a.counted_units;
          bValue = b.counted_units;
          break;
        case "calculated_weight":
          aValue =
            (a.counted_units || 0) * (a.item.average_weight_per_unit || 0);
          bValue =
            (b.counted_units || 0) * (b.item.average_weight_per_unit || 0);
          break;
        case "brand":
          aValue = a.item.brand;
          bValue = b.item.brand;
          break;
        case "item_type":
          aValue = a.item.item_type;
          bValue = b.item.item_type;
          break;
        default:
          aValue = a.item.name;
          bValue = b.item.name;
      }
      let comparison = 0;
      if (aValue === null || aValue === undefined) comparison = 1;
      else if (bValue === null || bValue === undefined) comparison = -1;
      else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }
      if (comparison === 0) {
        comparison = a.item.name.localeCompare(b.item.name);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    const unentered = sortableItems.filter((item) => !item.is_entered);
    const entered = sortableItems.filter((item) => item.is_entered);
    return { unenteredItems: unentered, enteredItems: entered };
  }, [currentInventoryItems, sortColumn, sortDirection]);

  const totalItems = unenteredItems.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return unenteredItems.slice(startIndex, endIndex);
  }, [unenteredItems, currentPage, itemsPerPage]);

  const availableItemsToAdd = useMemo(() => {
    if (!allUserItems || !currentInventoryItems) return [];
    const currentItemIds = new Set(
      currentInventoryItems.map((invItem) => invItem.item_id)
    );
    return allUserItems.filter((userItem) => !currentItemIds.has(userItem.id));
  }, [allUserItems, currentInventoryItems]);

  useEffect(() => {
    if (availableItemsToAdd.length > 0) {
      if (
        !selectedItemIdToAdd ||
        !availableItemsToAdd.some((item) => item.id === selectedItemIdToAdd)
      ) {
        setSelectedItemIdToAdd(availableItemsToAdd[0].id);
      }
    } else {
      setSelectedItemIdToAdd("");
    }
  }, [availableItemsToAdd, selectedItemIdToAdd]);

  const handleSort = (column: InventoryItemSortColumn) => {
    setCurrentPage(1);
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handleAddItemToInventory = async () => {
    if (!selectedItemIdToAdd) {
      showMessage("Please select an item to add.", "info");
      return;
    }
    if (!inventoryId) {
      showMessage("Inventory ID is missing.", "error");
      return;
    }
    try {
      await addInventoryItemMutation.mutateAsync({
        inventory_id: inventoryId,
        item_id: selectedItemIdToAdd,
        counted_units: 0,
      });
      showMessage("Item added to inventory!", "success");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error adding item.";
      showMessage(`Error adding item: ${errorMessage}`, "error");
    }
  };

  const handleAddAllRemainingItemsToInventory = async () => {
    if (!inventoryId) {
      showMessage("Inventory ID is missing.", "error");
      return;
    }
    if (availableItemsToAdd.length === 0) {
      showMessage("All available items are already in this inventory.", "info");
      return;
    }
    const userConfirmed = window.confirm(
      `Are you sure you want to add all ${availableItemsToAdd.length} remaining items to this inventory?`
    );
    if (!userConfirmed) return;
    try {
      await addAllInventoryItemsMutation.mutateAsync(inventoryId);
      showMessage("All remaining items added to inventory!", "success");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error adding all items.";
      showMessage(`Error adding all items: ${errorMessage}`, "error");
    }
  };

  const handleDeleteInventoryItem = async (
    invItemId: string,
    itemName: string
  ) => {
    if (!inventoryId) {
      showMessage("Inventory ID is missing.", "error");
      return;
    }
    const userConfirmed = window.confirm(
      `Are you sure you want to remove "${itemName}" from this inventory?`
    );
    if (userConfirmed) {
      try {
        await deleteInventoryItemMutation.mutateAsync({
          inventoryItemId: invItemId,
          inventoryId: inventoryId,
        });
        showMessage(`"${itemName}" removed from inventory.`, "success");
        if (paginatedItems.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1);
        }
      } catch (err) {
        showMessage(
          `Error removing item: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
          "error"
        );
      }
    }
  };

  const handleUpdateCountedUnits = async (
    invItemId: string,
    currentCount: number,
    itemUnitType: string
  ) => {
    const newCount = prompt(
      `Enter new count for item (current: ${currentCount} ${itemUnitType}):`
    );
    if (newCount === null) return;
    const parsedCount = parseFloat(newCount);
    if (isNaN(parsedCount) || parsedCount < 0) {
      showMessage(
        "Invalid count. Please enter a non-negative number.",
        "error"
      );
      return;
    }
    if (!inventoryId) {
      showMessage("Inventory ID is missing.", "error");
      return;
    }
    try {
      await updateInventoryItemMutation.mutateAsync({
        id: invItemId,
        counted_units: parsedCount,
        inventory_id: inventoryId,
      });
      showMessage("Item count updated successfully!", "success");
    } catch (err) {
      showMessage(
        `Error updating item count: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  const handleToggleEntered = async (
    invItemId: string,
    isEntering: boolean
  ) => {
    if (!inventoryId) {
      showMessage("Inventory ID is missing.", "error");
      return;
    }
    try {
      await updateInventoryItemMutation.mutateAsync({
        id: invItemId,
        is_entered: isEntering,
        inventory_id: inventoryId,
      });
      showMessage(
        isEntering ? "Item marked as entered." : "Item moved back to list.",
        "success"
      );
    } catch (err) {
      showMessage(
        `Error updating item status: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        "error"
      );
    }
  };

  const handleCompleteInventory = async () => {
    if (!inventory?.id) {
      showMessage("Inventory ID is not available to complete.", "error");
      return;
    }
    if (inventory.status === "completed") {
      showMessage("This inventory is already completed.", "info");
      return;
    }
    const userConfirmed = window.confirm(
      "Are you sure you want to complete this inventory? This action cannot be undone."
    );
    if (userConfirmed) {
      try {
        await updateInventoryMutation.mutateAsync({
          id: inventory.id,
          status: "completed",
        });
        showMessage(
          `Inventory "${inventory.name}" has been marked as completed.`,
          "success"
        );
      } catch (err) {
        showMessage(
          `Error completing inventory: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
          "error"
        );
      }
    }
  };

  if (isInventoryLoading || isAllItemsLoading || isCurrentItemsLoading) {
    return <LoadingSpinner className='min-h-[60vh]' />;
  }

  if (isInventoryError || isAllItemsError || isCurrentItemsError || !inventory) {
    const errorMessage = !inventory
      ? "Inventory not found."
      : inventoryError?.message ||
        allItemsError?.message ||
        currentItemsError?.message;
    return (
      <PageContainer className='max-w-md'>
        <Card>
          <CardContent className='text-center'>
            <p className='mb-4 text-sm text-destructive'>{errorMessage}</p>
            <Button variant='outline' onClick={() => router.push("/")}>
              <ArrowLeft />
              Back to inventories
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const itemHref = (id: string) =>
    `/inventories/${inventoryId}/items/${id}?sortColumn=${sortColumn}&sortDirection=${sortDirection}`;
  const weightLabel = (invItem: CombinedInventoryItem) =>
    `${(
      (invItem.counted_units || 0) *
      (invItem.item?.average_weight_per_unit || 0)
    ).toFixed(2)} lbs`;
  const totalItemCount = unenteredItems.length + enteredItems.length;
  const isAddBusy =
    addInventoryItemMutation.isPending || addAllInventoryItemsMutation.isPending;
  const sortProps = { sortColumn, sortDirection, onSort: handleSort };

  return (
    <PageContainer>
      <div
        id='messageBox'
        className='fixed bottom-4 right-4 z-50 hidden rounded-md border bg-card px-4 py-3 text-sm shadow-lg'
      ></div>

      <Button
        variant='ghost'
        size='sm'
        className='-ml-3 mb-3 text-muted-foreground'
        onClick={() => router.push("/")}
      >
        <ArrowLeft />
        Inventories
      </Button>

      <PageHeader
        title={inventory.name}
        description={
          <span className='flex flex-wrap items-center gap-x-3 gap-y-1'>
            <StatusBadge status={inventory.status} />
            <span>
              Created {new Date(inventory.created_at).toLocaleDateString()} at{" "}
              {new Date(inventory.created_at).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </span>
        }
        actions={
          inventory.status !== "completed" ? (
            <Button
              variant='success'
              onClick={handleCompleteInventory}
              disabled={updateInventoryMutation.isPending}
            >
              <CheckCircle2 />
              {updateInventoryMutation.isPending
                ? "Completing..."
                : "Complete inventory"}
            </Button>
          ) : (
            <span className='inline-flex items-center gap-1.5 text-sm font-medium text-success'>
              <CheckCircle2 className='size-4' />
              Inventory completed
            </span>
          )
        }
      />

      {/* Summary stats */}
      <div className='mb-6 grid grid-cols-3 gap-3'>
        {[
          { label: "Total items", value: totalItemCount },
          { label: "To enter", value: unenteredItems.length },
          { label: "Entered", value: enteredItems.length },
        ].map((stat) => (
          <Card key={stat.label} className='px-4 py-3'>
            <p className='text-xs font-medium text-muted-foreground'>
              {stat.label}
            </p>
            <p className='mt-1 text-2xl font-semibold tabular-nums text-foreground'>
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Add items */}
      <Card className='mb-6'>
        <CardContent className='flex flex-col gap-3 sm:flex-row sm:items-center'>
          <label
            htmlFor='selectItem'
            className='shrink-0 text-sm font-medium text-foreground'
          >
            Add item
          </label>
          <Select
            id='selectItem'
            value={selectedItemIdToAdd}
            onChange={(e) => setSelectedItemIdToAdd(e.target.value)}
            className='sm:flex-1'
            disabled={isAddBusy || availableItemsToAdd.length === 0}
          >
            {availableItemsToAdd.length === 0 ? (
              <option value=''>All items have been added</option>
            ) : (
              availableItemsToAdd.map((item: Item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.unit_type})
                </option>
              ))
            )}
          </Select>
          <div className='flex gap-2'>
            <Button
              onClick={handleAddItemToInventory}
              disabled={
                isAddBusy ||
                availableItemsToAdd.length === 0 ||
                !selectedItemIdToAdd
              }
              className='flex-1 sm:flex-none'
            >
              <Plus />
              {addInventoryItemMutation.isPending ? "Adding..." : "Add"}
            </Button>
            <Button
              variant='outline'
              onClick={handleAddAllRemainingItemsToInventory}
              disabled={isAddBusy || availableItemsToAdd.length === 0}
              className='flex-1 sm:flex-none'
            >
              {addAllInventoryItemsMutation.isPending
                ? "Adding all..."
                : `Add all remaining (${availableItemsToAdd.length})`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Items to enter */}
      <Card className='mb-6 overflow-hidden'>
        <CardHeader>
          <div>
            <CardTitle>Items to enter</CardTitle>
            <CardDescription>
              Tick an item once its count has been entered.
            </CardDescription>
          </div>
        </CardHeader>

        {unenteredItems.length === 0 ? (
          <p className='px-5 py-12 text-center text-sm text-muted-foreground'>
            Nothing left to enter. Entered items are listed below.
          </p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className='hidden overflow-x-auto md:block'>
              <table className='w-full text-sm'>
                <thead className='border-b border-border bg-muted/50 text-left text-xs text-muted-foreground'>
                  <tr>
                    <th className='w-12 px-4 py-2.5 text-center font-medium'>
                      <span className='sr-only'>Entered</span>
                    </th>
                    <SortableTh label='Name' column='name' {...sortProps} />
                    <SortableTh label='UPC' column='upc_number' {...sortProps} />
                    <SortableTh label='Brand' column='brand' {...sortProps} />
                    <SortableTh label='Type' column='item_type' {...sortProps} />
                    <SortableTh
                      label='Count'
                      column='counted_units'
                      className='text-right'
                      {...sortProps}
                    />
                    <SortableTh
                      label='Weight'
                      column='calculated_weight'
                      className='text-right'
                      {...sortProps}
                    />
                    <th className='px-4 py-2.5 text-right font-medium'>
                      <span className='sr-only'>Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {paginatedItems.map((invItem: CombinedInventoryItem) => (
                    <tr
                      key={invItem.id}
                      className='transition-colors hover:bg-muted/40'
                    >
                      <td className='px-4 py-2.5 text-center'>
                        <input
                          type='checkbox'
                          className='size-4 cursor-pointer rounded accent-primary'
                          onChange={() => handleToggleEntered(invItem.id, true)}
                          aria-label={`Mark ${invItem.item?.name} as entered`}
                        />
                      </td>
                      <td className='px-4 py-2.5'>
                        <button
                          onClick={() => router.push(itemHref(invItem.id))}
                          className='text-left font-medium text-foreground hover:text-primary hover:underline'
                        >
                          {invItem.item?.name || "N/A"}
                        </button>
                      </td>
                      <td className='px-4 py-2.5 font-mono text-xs text-muted-foreground'>
                        {invItem.item?.upc_number || "—"}
                      </td>
                      <td className='px-4 py-2.5 text-muted-foreground'>
                        {invItem.item?.brand || "—"}
                      </td>
                      <td className='px-4 py-2.5 capitalize text-muted-foreground'>
                        {invItem.item?.item_type || "—"}
                      </td>
                      <td className='px-4 py-2.5 text-right font-medium tabular-nums text-foreground'>
                        {invItem.counted_units}
                      </td>
                      <td className='px-4 py-2.5 text-right tabular-nums text-muted-foreground'>
                        {invItem.item?.unit_type === "weight"
                          ? weightLabel(invItem)
                          : "—"}
                      </td>
                      <td className='px-4 py-2.5'>
                        <div className='flex items-center justify-end gap-1'>
                          {invItem.counted_units > 0 && (
                            <Button
                              variant='ghost'
                              size='icon-sm'
                              onClick={() => handleCopyValue(invItem)}
                              title='Copy value'
                              aria-label='Copy value'
                            >
                              <Copy />
                            </Button>
                          )}
                          <Button
                            variant='ghost'
                            size='icon-sm'
                            onClick={() =>
                              handleUpdateCountedUnits(
                                invItem.id,
                                invItem.counted_units,
                                invItem.item?.unit_type || "units"
                              )
                            }
                            title='Quick update count'
                            aria-label='Quick update count'
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant='ghost-destructive'
                            size='icon-sm'
                            onClick={() =>
                              handleDeleteInventoryItem(
                                invItem.id,
                                invItem.item?.name || "Unknown"
                              )
                            }
                            title='Remove from inventory'
                            aria-label='Remove from inventory'
                          >
                            <Trash2 />
                          </Button>
                          <Button
                            variant='outline'
                            size='sm'
                            className='ml-1'
                            onClick={() => router.push(itemHref(invItem.id))}
                          >
                            Count
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <ul className='divide-y divide-border md:hidden'>
              {paginatedItems.map((invItem: CombinedInventoryItem) => (
                <li key={invItem.id} className='px-4 py-3'>
                  <div className='flex items-start gap-3'>
                    <input
                      type='checkbox'
                      className='mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-primary'
                      onChange={() => handleToggleEntered(invItem.id, true)}
                      aria-label={`Mark ${invItem.item?.name} as entered`}
                    />
                    <button
                      onClick={() => router.push(itemHref(invItem.id))}
                      className='min-w-0 flex-1 text-left'
                    >
                      <p className='truncate font-medium text-foreground'>
                        {invItem.item?.name || "N/A"}
                      </p>
                      <p className='mt-0.5 truncate text-xs capitalize text-muted-foreground'>
                        {[invItem.item?.item_type, invItem.item?.brand]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </button>
                    <div className='shrink-0 text-right'>
                      <p className='font-semibold tabular-nums text-foreground'>
                        {invItem.counted_units}
                      </p>
                      {invItem.item?.unit_type === "weight" && (
                        <p className='text-xs tabular-nums text-muted-foreground'>
                          {weightLabel(invItem)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className='mt-2 flex justify-end gap-1 pl-8'>
                    {invItem.counted_units > 0 && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleCopyValue(invItem)}
                      >
                        <Copy />
                        Copy
                      </Button>
                    )}
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() =>
                        handleUpdateCountedUnits(
                          invItem.id,
                          invItem.counted_units,
                          invItem.item?.unit_type || "units"
                        )
                      }
                    >
                      <Pencil />
                      Update
                    </Button>
                    <Button
                      variant='ghost-destructive'
                      size='icon-sm'
                      onClick={() =>
                        handleDeleteInventoryItem(
                          invItem.id,
                          invItem.item?.name || "Unknown"
                        )
                      }
                      aria-label='Remove from inventory'
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <p className='border-t border-border px-5 py-2.5 text-xs text-muted-foreground'>
              Showing {paginatedItems.length} of {unenteredItems.length}{" "}
              remaining {unenteredItems.length === 1 ? "item" : "items"}
            </p>
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          </>
        )}
      </Card>

      {/* Entered items */}
      <Card className='overflow-hidden'>
        <button
          onClick={() => setShowEntered(!showEntered)}
          className='flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-muted/40'
          aria-expanded={showEntered}
        >
          <span className='flex items-center gap-2 text-base font-semibold text-foreground'>
            <CheckCircle2 className='size-4 text-success' />
            Entered items
            <span className='rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'>
              {enteredItems.length}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              showEntered && "rotate-180"
            )}
          />
        </button>
        {showEntered && (
          <div className='border-t border-border'>
            {enteredItems.length === 0 ? (
              <p className='px-5 py-8 text-center text-sm text-muted-foreground'>
                No items have been marked as entered yet.
              </p>
            ) : (
              <ul className='divide-y divide-border'>
                {enteredItems.map((item: CombinedInventoryItem) => (
                  <li
                    key={item.id}
                    className='flex items-center justify-between gap-3 px-5 py-2.5'
                  >
                    <span className='truncate text-sm text-muted-foreground line-through decoration-muted-foreground/40'>
                      {item.item?.name || "N/A"}
                    </span>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => handleToggleEntered(item.id, false)}
                      title='Move back to main list'
                    >
                      <RotateCcw />
                      Undo
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
