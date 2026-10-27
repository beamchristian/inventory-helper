-- Clean up data left behind by users who were deleted before this migration.
-- Items were never linked to users, so deleting a user left their items behind.
-- None of these items are used in any inventory (checked 2026-10-29).
DELETE FROM "Item" i
WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = i.user_id);

-- Inventories whose owner was deleted (their userId was set to NULL).
DELETE FROM "Inventory" v
WHERE v."userId" IS NULL
   OR NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = v."userId");

-- DropForeignKey
ALTER TABLE "Inventory" DROP CONSTRAINT "Inventory_userId_fkey";

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
