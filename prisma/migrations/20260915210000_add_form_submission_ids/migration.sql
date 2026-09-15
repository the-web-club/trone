-- AlterTable
ALTER TABLE `company` ADD COLUMN `submissionId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `contact` ADD COLUMN `submissionId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `task` ADD COLUMN `submissionId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `order` ADD COLUMN `submissionId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `feature_request` ADD COLUMN `submissionId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `company_submissionId_key` ON `company`(`submissionId`);

-- CreateIndex
CREATE UNIQUE INDEX `contact_submissionId_key` ON `contact`(`submissionId`);

-- CreateIndex
CREATE UNIQUE INDEX `task_submissionId_key` ON `task`(`submissionId`);

-- CreateIndex
CREATE UNIQUE INDEX `order_submissionId_key` ON `order`(`submissionId`);

-- CreateIndex
CREATE UNIQUE INDEX `feature_request_submissionId_key` ON `feature_request`(`submissionId`);
