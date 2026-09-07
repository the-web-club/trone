-- AlterTable
ALTER TABLE `company` ADD COLUMN `viesValidatedAt` DATETIME(3) NULL,
    ADD COLUMN `viesValid` BOOLEAN NULL,
    ADD COLUMN `viesCheckedName` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `quote` ADD COLUMN `vatRate` DECIMAL(5, 2) NULL,
    ADD COLUMN `vatRegime` ENUM('BINNENLANDS', 'VERLEGD', 'EXPORT') NULL,
    ADD COLUMN `vatNotice` TEXT NULL;

-- AlterTable
ALTER TABLE `quote_version` ADD COLUMN `vatRate` DECIMAL(5, 2) NULL,
    ADD COLUMN `vatRegime` ENUM('BINNENLANDS', 'VERLEGD', 'EXPORT') NULL,
    ADD COLUMN `vatNotice` TEXT NULL;

-- AlterTable
ALTER TABLE `order` ADD COLUMN `vatRate` DECIMAL(5, 2) NULL,
    ADD COLUMN `vatRegime` ENUM('BINNENLANDS', 'VERLEGD', 'EXPORT') NULL,
    ADD COLUMN `vatNotice` TEXT NULL;

-- AlterTable
ALTER TABLE `invoice` ADD COLUMN `vatRate` DECIMAL(5, 2) NULL,
    ADD COLUMN `vatRegime` ENUM('BINNENLANDS', 'VERLEGD', 'EXPORT') NULL,
    ADD COLUMN `vatNotice` TEXT NULL;
