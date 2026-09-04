-- AlterTable
ALTER TABLE `session` ADD COLUMN `impersonatedBy` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `banExpires` DATETIME(3) NULL,
    ADD COLUMN `banReason` VARCHAR(191) NULL,
    ADD COLUMN `banned` BOOLEAN NULL DEFAULT false;
