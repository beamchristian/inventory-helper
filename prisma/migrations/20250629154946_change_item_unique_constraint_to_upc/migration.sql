/*
  Warnings:

  - A unique constraint covering the columns `[user_id,upc_number]` on the table `Item` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Item_user_id_upc_number_key" ON "Item"("user_id", "upc_number");
