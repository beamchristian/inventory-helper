/*
  Warnings:

  - Made the column `upc_number` on table `Item` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Item" ALTER COLUMN "upc_number" SET NOT NULL;
