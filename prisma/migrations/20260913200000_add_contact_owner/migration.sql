-- AlterTable
ALTER TABLE `contact` ADD COLUMN `ownerUserId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `contact_ownerUserId_idx` ON `contact`(`ownerUserId`);
