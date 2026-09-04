-- AlterTable
ALTER TABLE `option_value` ADD COLUMN `swatchHex` VARCHAR(16) NULL,
    ADD COLUMN `swatchImageUrl` VARCHAR(2048) NULL;

-- CreateTable
CREATE TABLE `product_image` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `imageUrl` VARCHAR(2048) NOT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,

    INDEX `product_image_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_image_selection` (
    `id` VARCHAR(191) NOT NULL,
    `imageId` VARCHAR(191) NOT NULL,
    `optionId` VARCHAR(191) NOT NULL,
    `optionValueId` VARCHAR(191) NOT NULL,

    INDEX `product_image_selection_imageId_idx`(`imageId`),
    UNIQUE INDEX `product_image_selection_imageId_optionId_key`(`imageId`, `optionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_image` ADD CONSTRAINT `product_image_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_image_selection` ADD CONSTRAINT `product_image_selection_imageId_fkey` FOREIGN KEY (`imageId`) REFERENCES `product_image`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_image_selection` ADD CONSTRAINT `product_image_selection_optionId_fkey` FOREIGN KEY (`optionId`) REFERENCES `product_option`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_image_selection` ADD CONSTRAINT `product_image_selection_optionValueId_fkey` FOREIGN KEY (`optionValueId`) REFERENCES `option_value`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
