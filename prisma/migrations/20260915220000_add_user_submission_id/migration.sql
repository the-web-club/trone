-- AlterTable
ALTER TABLE `user` ADD COLUMN `submissionId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `user_submissionId_key` ON `user`(`submissionId`);
