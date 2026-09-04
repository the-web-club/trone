-- CreateTable
CREATE TABLE `task` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `dueAt` DATETIME(3) NULL,
    `status` ENUM('OPEN', 'DONE', 'CANCELLED') NOT NULL DEFAULT 'OPEN',
    `priority` ENUM('LOW', 'NORMAL', 'HIGH') NULL,
    `assigneeUserId` VARCHAR(191) NOT NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `dealId` VARCHAR(191) NULL,
    `contactId` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,

    INDEX `task_assigneeUserId_idx`(`assigneeUserId`),
    INDEX `task_createdByUserId_idx`(`createdByUserId`),
    INDEX `task_dealId_idx`(`dealId`),
    INDEX `task_contactId_idx`(`contactId`),
    INDEX `task_companyId_idx`(`companyId`),
    INDEX `task_status_idx`(`status`),
    INDEX `task_dueAt_idx`(`dueAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `task_assigneeUserId_fkey` FOREIGN KEY (`assigneeUserId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `task_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `task_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `deal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `task_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `task_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
