-- CreateTable
CREATE TABLE `timeline_event` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('NOTE', 'CALL', 'EMAIL', 'MEETING', 'DEMO', 'STAGE_CHANGE', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'ORDER_CREATED', 'ORDER_STATUS', 'TASK_DUE', 'TASK_DONE', 'SYSTEM') NOT NULL,
    `body` TEXT NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `userId` VARCHAR(191) NULL,
    `dealId` VARCHAR(191) NULL,
    `contactId` VARCHAR(191) NULL,
    `companyId` VARCHAR(191) NULL,
    `quoteId` VARCHAR(191) NULL,
    `orderId` VARCHAR(191) NULL,

    INDEX `timeline_event_userId_idx`(`userId`),
    INDEX `timeline_event_dealId_idx`(`dealId`),
    INDEX `timeline_event_contactId_idx`(`contactId`),
    INDEX `timeline_event_companyId_idx`(`companyId`),
    INDEX `timeline_event_quoteId_idx`(`quoteId`),
    INDEX `timeline_event_orderId_idx`(`orderId`),
    INDEX `timeline_event_occurredAt_idx`(`occurredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `timeline_event` ADD CONSTRAINT `timeline_event_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_event` ADD CONSTRAINT `timeline_event_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `deal`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_event` ADD CONSTRAINT `timeline_event_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contact`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_event` ADD CONSTRAINT `timeline_event_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_event` ADD CONSTRAINT `timeline_event_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `quote`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timeline_event` ADD CONSTRAINT `timeline_event_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `order`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill existing deal activities into the shared timeline
INSERT INTO `timeline_event` (`id`, `type`, `body`, `occurredAt`, `createdAt`, `userId`, `dealId`, `contactId`, `companyId`)
SELECT
    `da`.`id`,
    `da`.`type`,
    `da`.`body`,
    `da`.`occurredAt`,
    `da`.`occurredAt`,
    CASE WHEN `u`.`id` IS NULL THEN NULL ELSE `da`.`userId` END,
    `da`.`dealId`,
    `d`.`contactId`,
    `d`.`companyId`
FROM `deal_activity` `da`
LEFT JOIN `deal` `d` ON `d`.`id` = `da`.`dealId`
LEFT JOIN `user` `u` ON `u`.`id` = `da`.`userId`;
