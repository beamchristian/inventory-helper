"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  useItems,
  useAddItem,
  useUpdateItem,
  useDeleteItem,
} from "../../hooks/useItems";
import { Item } from "../../types";
import { PaginationControls } from "../../components/PaginationControls";
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
import { cn, showMessage } from "@/lib/utils";
import { ArrowDown, ArrowUp, Package, Pencil, Plus, Trash2 } from "lucide-react";

type SortColumn =
  | "name"
  | "upc_number"
  | "unit_type"
  | "average_weight_per_unit"
  | "item_type"
  | "brand";

export default function SettingsPage() {
  const { status } = useSession();
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  const {
    data: itemsData,
    isLoading,
    isError,
    error,
  } = useItems({
    page: currentPage,
    limit: itemsPerPage,
  });

  const itemsOnPage = useMemo(() => itemsData?.data || [], [itemsData]);
  const paginationInfo = useMemo(() => itemsData?.pagination, [itemsData]);
  const totalPages = useMemo(
    () => paginationInfo?.totalPages || 1,
    [paginationInfo],
  );

  const addItemMutation = useAddItem();
  const updateItemMutation = useUpdateItem();
  const deleteItemMutation = useDeleteItem();

  // ... (errorMessage, newItemForm state, useEffect for auth, and all handler functions like handleNewItemChange, handleAddItem, etc., remain the same) ...

  const errorMessage = useMemo(() => {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Unknown error.";
  }, [error]);

  const [newItemForm, setNewItemForm] = useState<
    Omit<Item, "id" | "created_at" | "updated_at" | "user_id">
  >({
    name: "",
    upc_number: "",
    average_weight_per_unit: null,
    unit_type: "quantity",
    item_type: null,
    brand: null,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/sign-in";
    }
  }, [status]);

  const handleNewItemChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setNewItemForm((prev) => {
      let updatedValue: string | number | null = value;
      if (type === "number") {
        updatedValue = value === "" ? null : parseFloat(value);
      }
      if (name === "unit_type" && value === "quantity") {
        return { ...prev, [name]: value, average_weight_per_unit: null };
      }
      return { ...prev, [name]: updatedValue };
    });
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "authenticated") {
      showMessage("You must be logged in to add items.", "error");
      return;
    }

    const newUpc = newItemForm.upc_number?.trim();
    if (
      newUpc &&
      itemsOnPage.some((item: Item) => item.upc_number === newUpc)
    ) {
      showMessage(`An item with the UPC "${newUpc}" already exists.`, "error");
      return;
    }

    // (Your existing validation logic remains here...)

    try {
      const itemToSave = {
        ...newItemForm,
        average_weight_per_unit:
          newItemForm.unit_type === "quantity"
            ? null
            : newItemForm.average_weight_per_unit,
      };
      await addItemMutation.mutateAsync(itemToSave);
      setNewItemForm({
        name: "",
        upc_number: "",
        average_weight_per_unit: null,
        unit_type: "quantity",
        item_type: null,
        brand: null,
      });
      showMessage("Item added successfully!", "success");
    } catch (err: unknown) {
      showMessage(
        `Error adding item: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        "error",
      );
    }
  };

  const handleEditItemChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setEditingItem((prev) => {
      if (!prev) return null;
      let updatedValue: string | number | null = value;
      if (type === "number") {
        updatedValue = value === "" ? null : parseFloat(value);
      }
      if (name === "unit_type" && value === "quantity") {
        return { ...prev, [name]: value, average_weight_per_unit: null };
      }
      return { ...prev, [name]: updatedValue };
    });
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (status !== "authenticated") {
      showMessage("You must be logged in to update items.", "error");
      return;
    }
    // (Your existing validation logic remains here...)

    try {
      const itemToUpdate = {
        ...editingItem,
        average_weight_per_unit:
          editingItem.unit_type === "quantity"
            ? null
            : editingItem.average_weight_per_unit,
      };
      await updateItemMutation.mutateAsync(itemToUpdate);
      setEditingItem(null);
      showMessage("Item updated successfully!", "success");
    } catch (err: unknown) {
      showMessage(
        `Error updating item: ${
          err instanceof Error ? err.message : "Unknown error"
        }`,
        "error",
      );
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (status !== "authenticated") {
      showMessage("You must be logged in to delete items.", "error");
      return;
    }
    if (
      window.confirm(
        "Are you sure you want to delete this item? It will also be removed from every inventory it appears in, including completed ones. This action cannot be undone.",
      )
    ) {
      try {
        await deleteItemMutation.mutateAsync(itemId);
        showMessage("Item deleted successfully!", "success");
      } catch (err: unknown) {
        showMessage(
          `Error deleting item: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
          "error",
        );
      }
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedItems = useMemo(() => {
    if (!itemsOnPage) return [];
    const sortableItems = [...itemsOnPage];
    sortableItems.sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      if (aValue === null || aValue === undefined)
        return sortDirection === "asc" ? 1 : -1;
      if (bValue === null || bValue === undefined)
        return sortDirection === "asc" ? -1 : 1;
      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      const valA = String(aValue);
      const valB = String(bValue);
      return sortDirection === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });
    return sortableItems;
  }, [itemsOnPage, sortColumn, sortDirection]);

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  if (status === "loading" || isLoading) {
    return <LoadingSpinner className='min-h-[60vh]' />;
  }

  if (status === "unauthenticated" || isError) {
    return (
      <PageContainer className='max-w-md'>
        <Card>
          <CardContent className='text-center'>
            <p className='mb-4 text-sm text-destructive'>
              {status === "unauthenticated"
                ? "You must be logged in to view your items."
                : `Error loading items: ${errorMessage}`}
            </p>
            <Button onClick={() => (window.location.href = "/sign-in")}>
              Go to sign in
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const renderSortHeader = ({
    label,
    column,
    className,
  }: {
    label: string;
    column: SortColumn;
    className?: string;
  }) => (
    <button
      onClick={() => handleSort(column)}
      className={cn(
        "inline-flex items-center gap-1 text-left transition-colors hover:text-foreground",
        sortColumn === column && "text-foreground",
        className
      )}
    >
      {label}
      {sortColumn === column &&
        (sortDirection === "asc" ? (
          <ArrowUp className='size-3' />
        ) : (
          <ArrowDown className='size-3' />
        ))}
    </button>
  );

  return (
    <PageContainer>
      <div
        id='messageBox'
        className='fixed bottom-4 right-4 z-50 hidden rounded-md border bg-card px-4 py-3 text-sm shadow-lg'
      ></div>

      <PageHeader
        title='Items'
        description='Your master list of products. Items added here can be pulled into any inventory.'
      />

      {/* Add New Item Form */}
      <Card className='mb-6'>
        <CardHeader>
          <CardTitle>Add item</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleAddItem}
            className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'
          >
            <div>
              <Label htmlFor='newName'>Name</Label>
              <Input
                type='text'
                id='newName'
                name='name'
                value={newItemForm.name}
                onChange={handleNewItemChange}
                required
              />
            </div>
            <div>
              <Label htmlFor='newUpc'>
                UPC
              </Label>
              <Input
                type='text'
                id='newUpc'
                name='upc_number'
                value={newItemForm.upc_number || ""}
                onChange={handleNewItemChange}
                required
              />
            </div>
            <div>
              <Label htmlFor='newUnitType'>Count by</Label>
              <Select
                id='newUnitType'
                name='unit_type'
                value={newItemForm.unit_type}
                onChange={handleNewItemChange}
                required
              >
                <option value='quantity'>Quantity</option>
                <option value='weight'>Weight (lbs)</option>
              </Select>
            </div>
            {newItemForm.unit_type === "weight" && (
              <div>
                <Label htmlFor='newAvgWeight'>Avg. weight per unit (lbs)</Label>
                <Input
                  type='number'
                  id='newAvgWeight'
                  name='average_weight_per_unit'
                  step='0.01'
                  value={newItemForm.average_weight_per_unit || ""}
                  onChange={handleNewItemChange}
                  required={newItemForm.unit_type === "weight"}
                />
              </div>
            )}
            <div>
              <Label htmlFor='newItemType'>Type</Label>
              <Input
                type='text'
                id='newItemType'
                name='item_type'
                placeholder='e.g. Meat'
                value={newItemForm.item_type || ""}
                onChange={handleNewItemChange}
              />
            </div>
            <div>
              <Label htmlFor='newBrand'>
                Brand <span className='font-normal text-muted-foreground'>(optional)</span>
              </Label>
              <Input
                type='text'
                id='newBrand'
                name='brand'
                value={newItemForm.brand || ""}
                onChange={handleNewItemChange}
              />
            </div>
            <div className='flex justify-end sm:col-span-2 lg:col-span-3'>
              <Button type='submit' disabled={addItemMutation.isPending}>
                <Plus />
                {addItemMutation.isPending ? "Adding..." : "Add item"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Items list */}
      <Card className='overflow-hidden'>
        <CardHeader>
          <div>
            <CardTitle>All items</CardTitle>
            {paginationInfo?.totalItems != null && (
              <CardDescription>
                {paginationInfo.totalItems}{" "}
                {paginationInfo.totalItems === 1 ? "item" : "items"}
              </CardDescription>
            )}
          </div>
        </CardHeader>
        {!isLoading && !isError && itemsOnPage.length === 0 ? (
          <div className='flex flex-col items-center px-5 py-14 text-center'>
            <span className='mb-3 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground'>
              <Package className='size-5' />
            </span>
            <p className='text-sm font-medium text-foreground'>No items yet</p>
            <p className='mt-1 text-sm text-muted-foreground'>
              Use the form above to add your first item.
            </p>
          </div>
        ) : (
          <>
            {/* Header for Desktop View */}
            <div className='hidden gap-4 border-b border-border bg-muted/50 px-5 py-2.5 text-xs font-medium text-muted-foreground md:grid md:grid-cols-12'>
              {renderSortHeader({ label: "Name", column: "name", className: "col-span-3" })}
              {renderSortHeader({ label: "UPC", column: "upc_number", className: "col-span-2" })}
              {renderSortHeader({ label: "Type", column: "item_type", className: "col-span-2" })}
              {renderSortHeader({ label: "Brand", column: "brand", className: "col-span-2" })}
              <span className='col-span-3 sr-only'>Actions</span>
            </div>

            {/* List of Items (stacked on mobile, rows on desktop) */}
            <ul className='divide-y divide-border'>
              {sortedItems.map((item) => (
                <li
                  key={item.id}
                  className='px-5 py-3 transition-colors hover:bg-muted/40 md:grid md:grid-cols-12 md:items-center md:gap-4'
                >
                  {editingItem && editingItem.id === item.id ? (
                    // Edit Form replaces the item content
                    <form
                      onSubmit={handleUpdateItem}
                      className='col-span-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
                    >
                      <div>
                        <Label htmlFor={`edit-name-${item.id}`} className='text-xs'>
                          Name
                        </Label>
                        <Input
                          id={`edit-name-${item.id}`}
                          type='text'
                          name='name'
                          value={editingItem.name}
                          onChange={handleEditItemChange}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-upc-${item.id}`} className='text-xs'>
                          UPC
                        </Label>
                        <Input
                          id={`edit-upc-${item.id}`}
                          type='text'
                          name='upc_number'
                          value={editingItem.upc_number || ""}
                          onChange={handleEditItemChange}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-type-${item.id}`} className='text-xs'>
                          Type
                        </Label>
                        <Input
                          id={`edit-type-${item.id}`}
                          type='text'
                          name='item_type'
                          value={editingItem.item_type || ""}
                          onChange={handleEditItemChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-brand-${item.id}`} className='text-xs'>
                          Brand
                        </Label>
                        <Input
                          id={`edit-brand-${item.id}`}
                          type='text'
                          name='brand'
                          value={editingItem.brand || ""}
                          onChange={handleEditItemChange}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-unit-${item.id}`} className='text-xs'>
                          Count by
                        </Label>
                        <Select
                          id={`edit-unit-${item.id}`}
                          name='unit_type'
                          value={editingItem.unit_type}
                          onChange={handleEditItemChange}
                          required
                        >
                          <option value='quantity'>Quantity</option>
                          <option value='weight'>Weight (lbs)</option>
                        </Select>
                      </div>
                      {editingItem.unit_type === "weight" && (
                        <div>
                          <Label htmlFor={`edit-weight-${item.id}`} className='text-xs'>
                            Avg. weight per unit (lbs)
                          </Label>
                          <Input
                            id={`edit-weight-${item.id}`}
                            type='number'
                            inputMode='decimal'
                            name='average_weight_per_unit'
                            step='any'
                            min='0.01'
                            value={editingItem.average_weight_per_unit ?? ""}
                            onChange={handleEditItemChange}
                            required
                          />
                        </div>
                      )}
                      <div className='col-span-full flex justify-end gap-2'>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => setEditingItem(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type='submit'
                          size='sm'
                          disabled={updateItemMutation.isPending}
                        >
                          {updateItemMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className='flex items-start justify-between gap-3 md:col-span-3'>
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-medium text-foreground'>
                            {item.name}
                          </p>
                          <p className='mt-0.5 truncate text-xs capitalize text-muted-foreground md:hidden'>
                            {[item.item_type, item.brand, item.upc_number]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                        </div>
                        <Badge className='md:hidden'>{item.unit_type}</Badge>
                      </div>
                      <span className='hidden truncate font-mono text-xs text-muted-foreground md:col-span-2 md:block'>
                        {item.upc_number || "—"}
                      </span>
                      <span className='hidden truncate text-sm capitalize text-muted-foreground md:col-span-2 md:block'>
                        {item.item_type || "—"}
                      </span>
                      <span className='hidden truncate text-sm text-muted-foreground md:col-span-2 md:block'>
                        {item.brand || "—"}
                      </span>
                      <div className='mt-2 flex justify-end gap-1 md:col-span-3 md:mt-0'>
                        <Button
                          variant='ghost'
                          size='sm'
                          onClick={() => setEditingItem(item)}
                        >
                          <Pencil />
                          Edit
                        </Button>
                        <Button
                          variant='ghost-destructive'
                          size='sm'
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 />
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>

            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              onItemsPerPageChange={handleItemsPerPageChange}
              noun='Page'
            />
          </>
        )}
      </Card>
    </PageContainer>
  );
}
