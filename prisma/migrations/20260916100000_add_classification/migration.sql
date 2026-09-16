-- AlterTable
ALTER TABLE `company` ADD COLUMN `industryCode` VARCHAR(191) NULL,
    ADD COLUMN `sectorCode` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `company_industryCode_idx` ON `company`(`industryCode`);

-- CreateIndex
CREATE INDEX `company_sectorCode_idx` ON `company`(`sectorCode`);

-- CreateIndex
CREATE INDEX `company_industryCode_sectorCode_idx` ON `company`(`industryCode`, `sectorCode`);

-- CreateTable
CREATE TABLE `company_relation_type` (
    `companyId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,

    INDEX `company_relation_type_code_idx`(`code`),
    PRIMARY KEY (`companyId`, `code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deal_application` (
    `dealId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,

    INDEX `deal_application_code_idx`(`code`),
    PRIMARY KEY (`dealId`, `code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `company_relation_type` ADD CONSTRAINT `company_relation_type_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deal_application` ADD CONSTRAINT `deal_application_dealId_fkey` FOREIGN KEY (`dealId`) REFERENCES `deal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
