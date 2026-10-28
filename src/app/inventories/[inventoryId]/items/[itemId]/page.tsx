"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { InventoryItem, Item } from "@/types";
import {
  useInventoryItems,
  useUpdateInventoryItem,
} from "@/hooks/useInventoryItems";
import { useUpdateItem } from "@/hooks/useItems";
import { PaginationControls } from "@/components/PaginationControls";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Equal,
  Minus,
  Pencil,
  Plus,
  X,
} from "lucide-react";

type InventoryItemSortColumn =
  | "name"
  | "unit_type"
  | "upc_number"
  | "counted_units"
  | "calculated_weight"
  | "brand"
  | "item_type";

/**
 * useInventoryItemDetails Hook
 */
const useInventoryItemDetails = (
  inventoryId: string,
  itemId: string | undefined,
) => {
  return useQuery<InventoryItem & { item: Item }>({
    queryKey: ["inventoryItem", itemId],
    queryFn: async () => {
      if (!itemId || !inventoryId) throw new Error("ID is missing.");
      const response = await fetch(
        `/api/inventories/${inventoryId}/items/${itemId}`,
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch inventory item details.",
        );
      }
      return response.json();
    },
    enabled: !!itemId && !!inventoryId,
  });
};

/**
 * Turns the cases and units fields into one number of units, e.g. 1 case +
 * 6 units at 12 per case = 18. An empty field counts as 0. Returns null when
 * both fields are empty or either holds something that isn't a number.
 */
function combineCasesAndUnits(
  casesInput: string,
  unitsInput: string,
  caseQuantity: number | null
): number | null {
  const casesText = caseQuantity ? casesInput.trim() : "";
  const unitsText = unitsInput.trim();
  if (casesText === "" && unitsText === "") return null;

  const cases = casesText === "" ? 0 : Number(casesText);
  const units = unitsText === "" ? 0 : Number(unitsText);
  if (!Number.isFinite(cases) || !Number.isFinite(units)) return null;

  return cases * (caseQuantity ?? 0) + units;
}

/**
 * Inline editor for a weight item's average weight per unit. Saves to the
 * master item, so the new weight applies in every inventory.
 */
function UnitWeightEditor({
  item,
  onSaved,
}: {
  item: Item;
  onSaved: () => void;
}) {
  const updateItemMutation = useUpdateItem();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setValue(item.average_weight_per_unit?.toString() ?? "");
    setError(null);
    setIsEditing(true);
  };

  const save = async () => {
    const weight = parseFloat(value);
    if (!Number.isFinite(weight) || weight <= 0) {
      setError("Enter a weight greater than 0.");
      return;
    }
    if (weight === item.average_weight_per_unit) {
      setIsEditing(false);
      return;
    }
    try {
      await updateItemMutation.mutateAsync({
        ...item,
        average_weight_per_unit: weight,
      });
      setIsEditing(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save weight.");
    }
  };

  if (!isEditing) {
    return (
      <div className='mt-0.5 flex items-center gap-1'>
        <span className='font-medium tabular-nums text-foreground'>
          {item.average_weight_per_unit?.toFixed(2) ?? "N/A"} lbs
        </span>
        <Button
          variant='ghost'
          size='icon-sm'
          onClick={startEditing}
          title='Edit average unit weight'
          aria-label='Edit average unit weight'
        >
          <Pencil />
        </Button>
      </div>
    );
  }

  return (
    <div className='mt-1'>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className='flex items-center gap-2'
      >
        <div className='relative w-32'>
          <Input
            type='number'
            inputMode='decimal'
            step='any'
            min='0'
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setIsEditing(false)}
            aria-label='Average unit weight in pounds'
            className='h-8 pr-9 tabular-nums'
            autoFocus
          />
          <span className='pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground'>
            lbs
          </span>
        </div>
        <Button
          type='submit'
          size='icon-sm'
          disabled={updateItemMutation.isPending}
          title='Save'
          aria-label='Save weight'
        >
          <Check />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          onClick={() => setIsEditing(false)}
          disabled={updateItemMutation.isPending}
          title='Cancel'
          aria-label='Cancel editing weight'
        >
          <X />
        </Button>
      </form>
      {error ? (
        <p className='mt-1.5 text-xs text-destructive'>{error}</p>
      ) : (
        <p className='mt-1.5 text-xs text-muted-foreground'>
          Updates this item everywhere, including weights in past inventories.
        </p>
      )}
    </div>
  );
}

/**
 * InventoryItemDetailPage Component
 */
export default function InventoryItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const inventoryId = params.inventoryId as string;
  const itemId = params.itemId as string;

  // NEW: Read sort parameters from the URL, providing defaults to match the main page
  const sortColumn =
    (searchParams.get("sortColumn") as InventoryItemSortColumn) || "item_type";
  const sortDirection =
    (searchParams.get("sortDirection") as "asc" | "desc") || "asc";

  // Units typed by the user, plus cases for items that have a case quantity
  const [inputValue, setInputValue] = useState<string>("");
  const [caseInputValue, setCaseInputValue] = useState<string>("");

  // Start every item with empty fields
  useEffect(() => {
    setInputValue("");
    setCaseInputValue("");
  }, [itemId]);

  const {
    data: inventoryItem,
    isLoading: isInventoryItemLoading,
    isError: isInventoryItemError,
    error: inventoryItemError,
  } = useInventoryItemDetails(inventoryId, itemId);
  const {
    data: rawInventoryItems,
    isLoading: areAllItemsLoading,
    isError: areAllItemsError,
    error: allItemsError,
  } = useInventoryItems(inventoryId);
  const updateInventoryItemMutation = useUpdateInventoryItem();

  // MODIFIED: This now uses the exact same sorting logic as the main page
  const navigableItems = useMemo(() => {
    if (!rawInventoryItems) return [];

    const unentered = rawInventoryItems.filter((item) => !item.is_entered);
    const sortableItems = [...unentered];

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
    return sortableItems;
  }, [rawInventoryItems, sortColumn, sortDirection]);

  const currentIndex = useMemo(
    () => navigableItems.findIndex((item) => item.id === itemId),
    [navigableItems, itemId],
  );
  const totalItems = navigableItems.length || 0;

  // MODIFIED: Navigation now preserves the sort parameters
  const navigateToItem = useCallback(
    (index: number) => {
      if (navigableItems && index >= 0 && index < totalItems) {
        const nextOrPrevItem = navigableItems[index];
        router.push(
          `/inventories/${inventoryId}/items/${nextOrPrevItem.id}?sortColumn=${sortColumn}&sortDirection=${sortDirection}`,
        );
      }
    },
    [
      navigableItems,
      inventoryId,
      router,
      sortColumn,
      sortDirection,
      totalItems,
    ],
  );

  const performUpdate = useCallback(
    async (newCount: number) => {
      if (!inventoryItem?.id || !inventoryItem.inventory_id) return;
      if (newCount < 0) {
        alert("Count cannot go below zero.");
        return;
      }
      if (
        inventoryItem.item?.unit_type === "quantity" &&
        !Number.isInteger(newCount)
      ) {
        alert("Quantity items must have whole number counts.");
        newCount = Math.floor(newCount);
      }
      try {
        await updateInventoryItemMutation.mutateAsync({
          id: inventoryItem.id,
          counted_units: newCount,
          inventory_id: inventoryItem.inventory_id,
        });
        queryClient.invalidateQueries({ queryKey: ["inventoryItem", itemId] });
        queryClient.invalidateQueries({
          queryKey: ["inventoryItems", inventoryId],
        });
        setInputValue("");
        setCaseInputValue("");
      } catch (err) {
        alert(
          `Error updating count: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        );
      }
    },
    [
      inventoryItem,
      updateInventoryItemMutation,
      queryClient,
      itemId,
      inventoryId,
    ],
  );

  const handleOperation = (operation: "add" | "subtract" | "replace") => {
    // Combine cases and loose units into one number of units
    const caseQuantity = inventoryItem?.item?.case_quantity ?? null;
    const value = combineCasesAndUnits(caseInputValue, inputValue, caseQuantity);
    if (value === null) {
      alert("Please enter a valid number.");
      return;
    }
    const currentCount = inventoryItem?.counted_units ?? 0;
    let newCount: number;
    switch (operation) {
      case "add":
        newCount = currentCount + value;
        break;
      case "subtract":
        newCount = currentCount - value;
        break;
      case "replace":
        newCount = value;
        break;
      default:
        return;
    }
    performUpdate(newCount);
  };

  if (isInventoryItemLoading || areAllItemsLoading) {
    return <LoadingSpinner className='min-h-[60vh]' />;
  }
  if (isInventoryItemError || areAllItemsError || !inventoryItem) {
    const errorMsg =
      inventoryItemError?.message ||
      allItemsError?.message ||
      "Inventory item not found.";
    return (
      <PageContainer className='max-w-md'>
        <Card>
          <CardContent className='text-center'>
            <p className='mb-4 text-sm text-destructive'>{errorMsg}</p>
            <Button
              variant='outline'
              onClick={() => router.push(`/inventories/${inventoryId}`)}
            >
              <ArrowLeft />
              Back to inventory
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const { item } = inventoryItem;
  const currentCount = inventoryItem.counted_units ?? 0;
  const calculatedTotalWeight =
    item?.unit_type === "weight" && item?.average_weight_per_unit != null
      ? (currentCount * item.average_weight_per_unit).toFixed(2)
      : null;
  const isUpdating = updateInventoryItemMutation.isPending;

  // Case counting is offered only when the item has a units-per-case value
  const caseQuantity = item?.case_quantity ?? null;
  const enteredTotal = combineCasesAndUnits(
    caseInputValue,
    inputValue,
    caseQuantity
  );
  const hasEntry = enteredTotal !== null;
  const showCaseTotal = caseQuantity !== null && caseInputValue !== "" && hasEntry;
  const fullCases = caseQuantity ? Math.floor(currentCount / caseQuantity) : 0;
  const looseUnits = caseQuantity ? currentCount - fullCases * caseQuantity : 0;

  return (
    <PageContainer className='max-w-2xl'>
      <Button
        variant='ghost'
        size='sm'
        className='-ml-3 mb-3 text-muted-foreground'
        onClick={() => router.push(`/inventories/${inventoryId}`)}
      >
        <ArrowLeft />
        Back to inventory
      </Button>

      <PageHeader
        title={item?.name ?? "Loading..."}
        description={
          <span className='flex flex-wrap items-center gap-x-3 gap-y-1'>
            <Badge>{item?.unit_type ?? "N/A"}</Badge>
            {totalItems > 0 && currentIndex >= 0 && (
              <span>
                Item {currentIndex + 1} of {totalItems} to enter
              </span>
            )}
          </span>
        }
      />

      <Card className='mb-6'>
        <CardContent className='flex flex-col items-center py-8'>
          <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
            Current count
          </p>
          <p className='mt-2 text-5xl font-semibold tabular-nums text-foreground'>
            {currentCount}
          </p>
          {caseQuantity !== null && currentCount > 0 && (
            <p className='mt-2 text-sm tabular-nums text-muted-foreground'>
              {fullCases} {fullCases === 1 ? "case" : "cases"}
              {looseUnits > 0 &&
                ` + ${Number(looseUnits.toFixed(2))} ${
                  looseUnits === 1 ? "unit" : "units"
                }`}
            </p>
          )}
          {calculatedTotalWeight !== null && (
            <p className='mt-2 text-sm text-muted-foreground'>
              Total weight{" "}
              <span className='font-medium tabular-nums text-foreground'>
                {calculatedTotalWeight} lbs
              </span>
            </p>
          )}

          <div className='mt-8 w-full max-w-sm'>
            {caseQuantity !== null ? (
              <div className='grid grid-cols-2 gap-2'>
                <div>
                  <label
                    htmlFor='caseInput'
                    className='mb-1 block text-center text-xs font-medium text-muted-foreground'
                  >
                    Cases ({caseQuantity} per case)
                  </label>
                  <Input
                    id='caseInput'
                    type='number'
                    inputMode='numeric'
                    step='1'
                    min='0'
                    value={caseInputValue}
                    onChange={(e) => setCaseInputValue(e.target.value)}
                    placeholder='0'
                    className='h-12 text-center text-lg'
                  />
                </div>
                <div>
                  <label
                    htmlFor='countInput'
                    className='mb-1 block text-center text-xs font-medium text-muted-foreground'
                  >
                    Units
                  </label>
                  <Input
                    id='countInput'
                    type='number'
                    inputMode='decimal'
                    step={item?.unit_type === "quantity" ? "1" : "any"}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder='0'
                    className='h-12 text-center text-lg'
                  />
                </div>
              </div>
            ) : (
              <Input
                id='countInput'
                type='number'
                inputMode='decimal'
                step={item?.unit_type === "quantity" ? "1" : "any"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder='Enter a value'
                aria-label='Count value'
                className='h-12 text-center text-lg'
              />
            )}
            {showCaseTotal && (
              <p className='mt-1.5 text-center text-xs tabular-nums text-muted-foreground'>
                Total: {Number(enteredTotal.toFixed(2))} units
              </p>
            )}
            <div className='mt-3 grid grid-cols-3 gap-2'>
              <Button
                size='lg'
                variant='outline'
                onClick={() => handleOperation("subtract")}
                disabled={isUpdating || !hasEntry}
              >
                <Minus />
                Subtract
              </Button>
              <Button
                size='lg'
                variant='outline'
                onClick={() => handleOperation("replace")}
                disabled={isUpdating || !hasEntry}
              >
                <Equal />
                Set
              </Button>
              <Button
                size='lg'
                onClick={() => handleOperation("add")}
                disabled={isUpdating || !hasEntry}
              >
                <Plus />
                Add
              </Button>
            </div>
          </div>
        </CardContent>
        <PaginationControls
          currentPage={currentIndex + 1}
          totalPages={totalItems}
          onPageChange={(page) => navigateToItem(page - 1)}
          itemsPerPage={1}
          onItemsPerPageChange={() => {}}
          prevButtonContent={
            <>
              <ChevronLeft /> Previous
            </>
          }
          nextButtonContent={
            <>
              Next <ChevronRight />
            </>
          }
          noun='Item'
          showItemsPerPage={false}
        />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Item details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className='grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2'>
            {[
              { label: "Name", value: item?.name ?? "N/A" },
              { label: "Count by", value: item?.unit_type ?? "N/A" },
              { label: "UPC", value: item?.upc_number || "—", mono: true },
              {
                label: "Units per case",
                value: item?.case_quantity ? String(item.case_quantity) : "—",
              },
              { label: "Type", value: item?.item_type || "—" },
              { label: "Brand", value: item?.brand || "—" },
            ].map((row) => (
              <div key={row.label}>
                <dt className='text-xs text-muted-foreground'>{row.label}</dt>
                <dd
                  className={cn(
                    "mt-0.5 font-medium capitalize text-foreground",
                    "mono" in row && row.mono && "font-mono normal-case",
                  )}
                >
                  {row.value}
                </dd>
              </div>
            ))}
            {item?.unit_type === "weight" && (
              <div className='sm:col-span-2'>
                <dt className='text-xs text-muted-foreground'>
                  Avg. unit weight
                </dt>
                <dd>
                  <UnitWeightEditor
                    item={item}
                    onSaved={() => {
                      // Refresh the totals that depend on the unit weight
                      queryClient.invalidateQueries({
                        queryKey: ["inventoryItem", itemId],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["inventoryItems", inventoryId],
                      });
                    }}
                  />
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
