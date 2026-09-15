-- AlterTable
ALTER TABLE `deal` ADD COLUMN `submissionId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `deal_submissionId_key` ON `deal`(`submissionId`);
