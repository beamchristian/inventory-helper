// src/lib/countSheet.ts
// Printable count sheets for counting an inventory on paper, as PDF or Word.
// Items are grouped by type and sorted by brand and name (the same order as
// counting in the app), with blank Cases / Units boxes to write counts in.
//
// The PDF and Word libraries are loaded only when an export is requested.

import type { CellHookData, RowInput } from "jspdf-autotable";
import { CombinedInventoryItem } from "@/types";
import { sortForCountMode } from "@/lib/utils";
import { downloadBlob, safeFileBaseName } from "@/lib/export";

export type CountSheetFormat = "pdf" | "docx";

export interface CountSheetOptions {
  /** Adds a column with each item's current count, for recounts. */
  includeCurrentCounts: boolean;
}

interface SheetRow {
  name: string;
  brand: string;
  upc: string;
  avgWeight: string;
  perCase: string;
  hasCase: boolean;
  current: string;
}

interface SheetGroup {
  type: string;
  rows: SheetRow[];
}

const NO_VALUE = "—";

function formatNumber(value: number) {
  return Number(value.toFixed(2)).toString();
}

/** Sorts the items for counting and groups them by item type. */
export function buildCountSheetGroups(
  items: CombinedInventoryItem[],
): SheetGroup[] {
  const groups: SheetGroup[] = [];
  for (const invItem of sortForCountMode(items)) {
    const item = invItem.item;
    const type = item?.item_type?.trim() || "Other";
    const isWeight = item?.unit_type === "weight";
    const avgWeight = item?.average_weight_per_unit;
    const units = invItem.counted_units || 0;

    const row: SheetRow = {
      name: item?.name ?? "",
      brand: item?.brand || NO_VALUE,
      upc: item?.upc_number || NO_VALUE,
      avgWeight:
        isWeight && avgWeight ? `${formatNumber(avgWeight)} lb` : NO_VALUE,
      perCase: item?.case_quantity ? String(item.case_quantity) : NO_VALUE,
      hasCase: !!item?.case_quantity,
      current:
        isWeight && avgWeight
          ? `${formatNumber(units)} (${formatNumber(units * avgWeight)} lb)`
          : formatNumber(units),
    };

    const last = groups[groups.length - 1];
    if (last && last.type.toLowerCase() === type.toLowerCase()) {
      last.rows.push(row);
    } else {
      groups.push({ type, rows: [row] });
    }
  }
  return groups;
}

interface Column {
  header: string;
  /** Width in points for the PDF (0 = take the remaining width); Word scales these. */
  width: number;
  align: "left" | "center";
  value: (row: SheetRow) => string;
}

function buildColumns({ includeCurrentCounts }: CountSheetOptions): Column[] {
  return [
    { header: "Done", width: 30, align: "center", value: () => "" },
    { header: "Item", width: 0, align: "left", value: (r) => r.name },
    { header: "Brand", width: 72, align: "left", value: (r) => r.brand },
    { header: "UPC", width: 78, align: "center", value: (r) => r.upc },
    { header: "Avg wt", width: 50, align: "center", value: (r) => r.avgWeight },
    { header: "Per case", width: 42, align: "center", value: (r) => r.perCase },
    ...(includeCurrentCounts
      ? [
          {
            header: "Current",
            width: 66,
            align: "center" as const,
            value: (r: SheetRow) => r.current,
          },
        ]
      : []),
    // Blank boxes to write in; Cases is greyed out when an item has no case size
    {
      header: "Cases",
      width: 50,
      align: "center",
      value: (r) => (r.hasCase ? "" : NO_VALUE),
    },
    { header: "Units", width: 50, align: "center", value: () => "" },
    { header: "Notes", width: 84, align: "left", value: () => "" },
  ];
}

function sheetTitle(inventoryName: string) {
  return `Count sheet: ${inventoryName}`;
}

function sheetSubtitle(itemCount: number) {
  const printed = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  return `Printed ${printed} · ${itemCount} ${itemCount === 1 ? "item" : "items"}`;
}

// ---------------------------------------------------------------- PDF ----

async function buildPdf(
  inventoryName: string,
  groups: SheetGroup[],
  columns: Column[],
  itemCount: number,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const { autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "letter",
  });
  const margin = 36;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const fixedWidth = columns.reduce((sum, c) => sum + c.width, 0);
  const itemWidth = pageWidth - margin * 2 - fixedWidth;

  const body: RowInput[] = [];
  for (const group of groups) {
    body.push([
      {
        content: `${group.type} (${group.rows.length})`,
        colSpan: columns.length,
        styles: {
          fillColor: [229, 231, 235],
          fontStyle: "bold",
          textColor: [17, 24, 39],
          halign: "left",
          minCellHeight: 16,
        },
      },
    ]);
    for (const row of group.rows) {
      body.push(
        columns.map((column) => ({
          content: column.value(row),
          styles:
            column.header === "Cases" && !row.hasCase
              ? { fillColor: [243, 244, 246], textColor: [156, 163, 175] }
              : {},
        })),
      );
    }
  }

  autoTable(doc, {
    head: [columns.map((c) => c.header)],
    body,
    startY: margin + 44,
    margin: {
      top: margin + 30,
      left: margin,
      right: margin,
      bottom: margin + 10,
    },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 4,
      minCellHeight: 22,
      valign: "middle",
      lineColor: [209, 213, 219],
      lineWidth: 0.5,
      textColor: [31, 41, 55],
    },
    headStyles: {
      fillColor: [31, 41, 55],
      textColor: 255,
      fontStyle: "bold",
      minCellHeight: 18,
    },
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [
        i,
        {
          cellWidth: c.width || itemWidth,
          halign: c.align,
        },
      ]),
    ),
    didParseCell: (data: CellHookData) => {
      // Line column headings up with their values
      if (data.section === "head") {
        data.cell.styles.halign = columns[data.column.index].align;
      }
    },
    didDrawCell: (data: CellHookData) => {
      // Draw a tick box in the "Done" column of item rows
      if (
        data.section === "body" &&
        data.column.index === 0 &&
        data.cell.colSpan === 1
      ) {
        const size = 9;
        doc.setDrawColor(107, 114, 128);
        doc.setLineWidth(0.8);
        doc.rect(
          data.cell.x + (data.cell.width - size) / 2,
          data.cell.y + (data.cell.height - size) / 2,
          size,
          size,
        );
      }
    },
    didDrawPage: () => {
      // Repeat the inventory name on every page
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(17, 24, 39);
      doc.text(sheetTitle(inventoryName), margin, margin + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(75, 85, 99);
      doc.text(sheetSubtitle(itemCount), margin, margin + 20);
      doc.text(
        "Counted by: ____________________",
        pageWidth - margin,
        margin + 6,
        { align: "right" },
      );
      doc.text("Date: _______________", pageWidth - margin, margin + 20, {
        align: "right",
      });
    },
  });

  // Page numbers, now that the total is known
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text(
      `Page ${page} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 20,
      {
        align: "right",
      },
    );
  }

  return doc.output("blob");
}

// --------------------------------------------------------------- Word ----

async function buildDocx(
  inventoryName: string,
  groups: SheetGroup[],
  columns: Column[],
  itemCount: number,
): Promise<Blob> {
  const {
    AlignmentType,
    BorderStyle,
    Document,
    Footer,
    HeightRule,
    Packer,
    PageNumber,
    PageOrientation,
    Paragraph,
    ShadingType,
    Table,
    TableCell,
    TableRow,
    TabStopType,
    TextRun,
    VerticalAlign,
    WidthType,
  } = await import("docx");

  // Letter landscape with 0.5" margins; Word measures in twentieths of a point
  const usableWidth = 15840 - 720 * 2;
  const pointsTotal = columns.reduce((sum, c) => sum + c.width, 0);
  const itemPoints = 792 - 36 * 2 - pointsTotal;
  const widths = columns.map((c) =>
    Math.round(((c.width || itemPoints) / (792 - 72)) * usableWidth),
  );

  const border = { style: BorderStyle.SINGLE, size: 4, color: "D1D5DB" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const font = "Calibri";

  const cell = (
    text: string,
    index: number,
    opts: { bold?: boolean; color?: string; fill?: string; span?: number } = {},
  ) =>
    new TableCell({
      columnSpan: opts.span,
      width: {
        size: opts.span ? usableWidth : widths[index],
        type: WidthType.DXA,
      },
      borders,
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      shading: opts.fill
        ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill }
        : undefined,
      children: [
        new Paragraph({
          alignment:
            opts.span || columns[index]?.align === "left"
              ? AlignmentType.LEFT
              : AlignmentType.CENTER,
          children: [
            new TextRun({
              text,
              bold: opts.bold,
              color: opts.color,
              size: 17, // half-points: 8.5pt
              font,
            }),
          ],
        }),
      ],
    });

  const rows = [
    new TableRow({
      tableHeader: true, // repeats on every page
      children: columns.map((c, i) =>
        cell(c.header, i, { bold: true, color: "FFFFFF", fill: "1F2937" }),
      ),
    }),
  ];
  for (const group of groups) {
    rows.push(
      new TableRow({
        cantSplit: true,
        children: [
          cell(`${group.type} (${group.rows.length})`, 0, {
            bold: true,
            fill: "E5E7EB",
            span: columns.length,
          }),
        ],
      }),
    );
    for (const row of group.rows) {
      rows.push(
        new TableRow({
          cantSplit: true,
          height: { value: 440, rule: HeightRule.ATLEAST },
          children: columns.map((c, i) => {
            if (c.header === "Done") return cell("☐", i, { color: "6B7280" });
            if (c.header === "Cases" && !row.hasCase) {
              return cell(NO_VALUE, i, { color: "9CA3AF", fill: "F3F4F6" });
            }
            return cell(c.value(row), i);
          }),
        }),
      );
    }
  }

  const doc = new Document({
    creator: "Inventory Helper",
    title: sheetTitle(inventoryName),
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: 12240,
              height: 15840,
            },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    children: [
                      "Page ",
                      PageNumber.CURRENT,
                      " of ",
                      PageNumber.TOTAL_PAGES,
                    ],
                    size: 16,
                    color: "6B7280",
                    font,
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: usableWidth }],
            children: [
              new TextRun({
                text: sheetTitle(inventoryName),
                bold: true,
                size: 26,
                font,
              }),
              new TextRun({
                text: "\tCounted by: ____________________",
                size: 18,
                color: "4B5563",
                font,
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 160 },
            tabStops: [{ type: TabStopType.RIGHT, position: usableWidth }],
            children: [
              new TextRun({
                text: sheetSubtitle(itemCount),
                size: 18,
                color: "4B5563",
                font,
              }),
              new TextRun({
                text: "\tDate: _______________",
                size: 18,
                color: "4B5563",
                font,
              }),
            ],
          }),
          new Table({
            width: { size: usableWidth, type: WidthType.DXA },
            columnWidths: widths,
            rows,
          }),
        ],
      },
    ],
  });

  return Packer.toBlob(doc);
}

// ------------------------------------------------------------- Export ----

/** Builds the count sheet in the chosen format. */
export async function buildCountSheet(
  format: CountSheetFormat,
  inventoryName: string,
  items: CombinedInventoryItem[],
  options: CountSheetOptions,
): Promise<Blob> {
  const groups = buildCountSheetGroups(items);
  const columns = buildColumns(options);
  return format === "pdf"
    ? buildPdf(inventoryName, groups, columns, items.length)
    : buildDocx(inventoryName, groups, columns, items.length);
}

/** Builds the count sheet and downloads it. */
export async function downloadCountSheet(
  format: CountSheetFormat,
  inventoryName: string,
  items: CombinedInventoryItem[],
  options: CountSheetOptions,
) {
  const blob = await buildCountSheet(format, inventoryName, items, options);
  downloadBlob(
    blob,
    `${safeFileBaseName(inventoryName)} - Count Sheet.${format}`,
  );
}
