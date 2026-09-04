-- AlterTable
ALTER TABLE `quote` ADD COLUMN `currentVersionId` VARCHAR(191) NULL,
    ADD COLUMN `currentVersionNumber` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `quote_version` (
    `id` VARCHAR(191) NOT NULL,
    `quoteId` VARCHAR(191) NOT NULL,
    `versionNumber` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
    `subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `discountTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,

    INDEX `quote_version_quoteId_idx`(`quoteId`),
    UNIQUE INDEX `quote_version_quoteId_versionNumber_key`(`quoteId`, `versionNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quote_version_item` (
    `id` VARCHAR(191) NOT NULL,
    `quoteVersionId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `configurationId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `lineDiscountPct` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `lineTotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `configSnapshot` JSON NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    INDEX `quote_version_item_quoteVersionId_idx`(`quoteVersionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `quote_version` ADD CONSTRAINT `quote_version_quoteId_fkey` FOREIGN KEY (`quoteId`) REFERENCES `quote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_version_item` ADD CONSTRAINT `quote_version_item_quoteVersionId_fkey` FOREIGN KEY (`quoteVersionId`) REFERENCES `quote_version`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quote_version_item` ADD CONSTRAINT `quote_version_item_configurationId_fkey` FOREIGN KEY (`configurationId`) REFERENCES `configuration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Bestaande offertes migreren naar v1 zodat snapshots en totalen intact blijven.
INSERT INTO `quote_version` (`id`, `quoteId`, `versionNumber`, `status`, `subtotal`, `discountTotal`, `total`, `createdAt`, `sentAt`)
SELECT UUID(), `id`, 1, `status`, `subtotal`, `discountTotal`, `total`, `createdAt`,
    CASE WHEN `status` = 'DRAFT' THEN NULL ELSE `createdAt` END
FROM `quote`;

INSERT INTO `quote_version_item` (
    `id`,
    `quoteVersionId`,
    `productId`,
    `configurationId`,
    `description`,
    `quantity`,
    `unitPrice`,
    `lineDiscountPct`,
    `lineTotal`,
    `configSnapshot`,
    `sortOrder`
)
SELECT
    UUID(),
    qv.`id`,
    qi.`productId`,
    qi.`configurationId`,
    qi.`description`,
    qi.`quantity`,
    qi.`unitPrice`,
    qi.`lineDiscountPct`,
    qi.`lineTotal`,
    qi.`configSnapshot`,
    qi.`sortOrder`
FROM `quote_item` qi
INNER JOIN `quote_version` qv ON qv.`quoteId` = qi.`quoteId` AND qv.`versionNumber` = 1;

UPDATE `quote` q
INNER JOIN `quote_version` qv ON qv.`quoteId` = q.`id` AND qv.`versionNumber` = 1
SET q.`currentVersionId` = qv.`id`,
    q.`currentVersionNumber` = 1;
