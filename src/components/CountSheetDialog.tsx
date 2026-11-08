// src/components/CountSheetDialog.tsx
// Options for printing a paper count sheet of an inventory, as PDF or Word.
"use client";

import React, { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import Modal from "@/components/Modal";
import { Button } from "@/components/ui/button";
import { useDialog } from "@/components/DialogProvider";
import { CombinedInventoryItem } from "@/types";
import { cn } from "@/lib/utils";
import type { CountSheetFormat } from "@/lib/countSheet";

interface CountSheetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryName: string;
  allItems: CombinedInventoryItem[];
  itemsToEnter: CombinedInventoryItem[];
}

interface ChoiceProps<T extends string> {
  legend: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; hint: string }[];
}

// A row of selectable cards, used for the format and item choices
function Choice<T extends string>({
  legend,
  name,
  value,
  onChange,
  options,
}: ChoiceProps<T>) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-foreground">
        {legend}
      </legend>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "cursor-pointer rounded-md border px-3 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
              value === option.value
                ? "border-primary bg-primary/5"
                : "border-input hover:bg-accent",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span className="block text-sm font-medium text-foreground">
              {option.label}
            </span>
            <span className="block text-xs text-muted-foreground">
              {option.hint}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CountSheetDialog({
  isOpen,
  onClose,
  inventoryName,
  allItems,
  itemsToEnter,
}: CountSheetDialogProps) {
  const dialog = useDialog();
  const [format, setFormat] = useState<CountSheetFormat>("pdf");
  const [scope, setScope] = useState<"all" | "toEnter">("all");
  const [includeCurrentCounts, setIncludeCurrentCounts] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const items = scope === "all" ? allItems : itemsToEnter;

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      // Loaded on demand so the PDF/Word libraries stay out of the page bundle
      const { downloadCountSheet } = await import("@/lib/countSheet");
      await downloadCountSheet(format, inventoryName, items, {
        includeCurrentCounts,
      });
      onClose();
    } catch (err) {
      console.error("Error creating count sheet:", err);
      await dialog.alert({
        title: "Couldn't create the count sheet",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print count sheet"
      description="A sheet for counting this inventory on paper, grouped by type with boxes to write cases and units."
      dismissible={!isGenerating}
    >
      <div className="space-y-4">
        <Choice
          legend="Format"
          name="count-sheet-format"
          value={format}
          onChange={setFormat}
          options={[
            { value: "pdf", label: "PDF", hint: "Ready to print" },
            { value: "docx", label: "Word", hint: "Editable .docx" },
          ]}
        />
        <Choice
          legend="Items"
          name="count-sheet-scope"
          value={scope}
          onChange={setScope}
          options={[
            {
              value: "all",
              label: "All items",
              hint: `${allItems.length} in this inventory`,
            },
            {
              value: "toEnter",
              label: "Items to enter",
              hint: `${itemsToEnter.length} not entered yet`,
            },
          ]}
        />
        <label className="flex cursor-pointer items-start gap-2.5">
          <input
            type="checkbox"
            checked={includeCurrentCounts}
            onChange={(e) => setIncludeCurrentCounts(e.target.checked)}
            className="mt-0.5 size-4 cursor-pointer accent-primary"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">
              Include current counts
            </span>
            <span className="block text-xs text-muted-foreground">
              Adds a column with each item&apos;s count so far, for recounts.
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDownload}
            disabled={isGenerating || items.length === 0}
          >
            {isGenerating ? <Loader2 className="animate-spin" /> : <FileDown />}
            {isGenerating
              ? "Creating..."
              : `Download ${format === "pdf" ? "PDF" : "Word"}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
