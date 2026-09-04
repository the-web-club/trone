-- AlterTable
ALTER TABLE `company` ADD COLUMN `sourceKlantcode` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `deal` ADD COLUMN `aanvraagId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `company_sourceKlantcode_key` ON `company`(`sourceKlantcode`);

-- CreateIndex
CREATE UNIQUE INDEX `deal_aanvraagId_key` ON `deal`(`aanvraagId`);
