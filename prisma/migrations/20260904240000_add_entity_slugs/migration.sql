-- AlterTable
ALTER TABLE `company` ADD COLUMN `slug` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `contact` ADD COLUMN `slug` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `deal` ADD COLUMN `slug` VARCHAR(191) NULL;

-- Unique placeholders so the column can become NOT NULL immediately.
-- App create/update and scripts/backfill-slugs.ts replace these with name slugs.
UPDATE `company`
SET `slug` = CONCAT('b-', LOWER(REPLACE(`id`, '-', '')))
WHERE `slug` IS NULL;

UPDATE `contact`
SET `slug` = CONCAT('c-', LOWER(REPLACE(`id`, '-', '')))
WHERE `slug` IS NULL;

UPDATE `deal`
SET `slug` = CONCAT('d-', LOWER(REPLACE(`id`, '-', '')))
WHERE `slug` IS NULL;

-- AlterTable
ALTER TABLE `company` MODIFY `slug` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `contact` MODIFY `slug` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `deal` MODIFY `slug` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `company_slug_key` ON `company`(`slug`);

-- CreateIndex
CREATE UNIQUE INDEX `contact_slug_key` ON `contact`(`slug`);

-- CreateIndex
CREATE UNIQUE INDEX `deal_slug_key` ON `deal`(`slug`);
