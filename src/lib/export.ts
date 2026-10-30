// src/lib/export.ts
// Builds the "Physical Inventory" .txt file that the store inventory system
// imports. Format (plain ASCII, CRLF line endings, trailing line break):
//
//   Physical Inventory
//   [WorkSheetInfo]
//   ,<inventory name>
//   [Records]
//   <UPC>,<quantity>,<ITEM NAME>
//   ...

import { CombinedInventoryItem } from "@/types";

const LINE_BREAK = "\r\n";

// Commas separate the fields, so they (and line breaks) can't appear inside one
function cleanField(value: string) {
  return value
    .replace(/[,\r\n]+/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();
}

/**
 * The quantity column: total weight in lbs (2 decimals) for items counted by
 * weight, the unit count for everything else. Same value the Copy button uses.
 */
export function exportQuantity(invItem: CombinedInventoryItem): string {
  const units = invItem.counted_units || 0;
  if (invItem.item?.unit_type === "weight") {
    return (units * (invItem.item?.average_weight_per_unit || 0)).toFixed(2);
  }
  return String(units);
}

/** Builds the full file contents for an inventory. */
export function buildInventoryExport(
  inventoryName: string,
  items: CombinedInventoryItem[],
): string {
  const lines = [
    "Physical Inventory",
    "[WorkSheetInfo]",
    `,${cleanField(inventoryName)}`,
    "[Records]",
    ...items.map((invItem) =>
      [
        cleanField(invItem.item?.upc_number ?? ""),
        exportQuantity(invItem),
        cleanField(invItem.item?.name ?? "").toUpperCase(),
      ].join(","),
    ),
  ];
  return lines.join(LINE_BREAK) + LINE_BREAK;
}

/** File name for the download, e.g. "Weekly 10/30/26" -> "Weekly 10_30_26.txt". */
export function exportFileName(inventoryName: string): string {
  const safe = inventoryName.replace(/[\\/:*?"<>|]+/g, "_").trim();
  return `${safe || "inventory"}.txt`;
}

/** Triggers a browser download of the inventory file. */
export function downloadInventoryExport(
  inventoryName: string,
  items: CombinedInventoryItem[],
) {
  const blob = new Blob([buildInventoryExport(inventoryName, items)], {
    type: "text/plain;charset=us-ascii",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = exportFileName(inventoryName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
