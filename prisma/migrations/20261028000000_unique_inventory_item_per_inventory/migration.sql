/*
  Warnings:

  - A unique constraint covering the columns `[inventory_id,item_id]` on the table `InventoryItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_inventory_id_item_id_key" ON "InventoryItem"("inventory_id", "item_id");
