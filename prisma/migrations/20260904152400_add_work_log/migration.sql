-- CreateTable
CREATE TABLE `work_log` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `category` ENUM('MONTAGE', 'BELRONDE', 'BEZOEK', 'ADMINISTRATIE', 'OVERIG') NOT NULL DEFAULT 'OVERIG',
    `durationMinutes` INTEGER NULL,
    `companyId` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `work_log_userId_idx`(`userId`),
    INDEX `work_log_companyId_idx`(`companyId`),
    INDEX `work_log_orderId_idx`(`orderId`),
    INDEX `work_log_occurredAt_idx`(`occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `work_log` ADD CONSTRAINT `work_log_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_log` ADD CONSTRAINT `work_log_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_log` ADD CONSTRAINT `work_log_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
