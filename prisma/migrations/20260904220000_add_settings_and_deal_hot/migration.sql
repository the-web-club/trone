-- AlterTable
ALTER TABLE `deal` ADD COLUMN `isHot` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `app_setting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `app_setting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `app_setting` (`id`, `key`, `value`, `updatedAt`)
VALUES
  (UUID(), 'stil_dagen', '14', CURRENT_TIMESTAMP(3)),
  (UUID(), 'opvolging_maanden', '3', CURRENT_TIMESTAMP(3)),
  (UUID(), 'hot_waarde', '2500', CURRENT_TIMESTAMP(3));
