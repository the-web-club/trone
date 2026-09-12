-- CreateTable
CREATE TABLE `feature_request` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `type` ENUM('BUG', 'FEATURE', 'UX_DESIGN', 'IMPROVEMENT') NOT NULL,
    `status` ENUM('OPEN', 'PLANNED', 'IN_PROGRESS', 'DONE', 'MERGED') NOT NULL DEFAULT 'OPEN',
    `title` VARCHAR(160) NOT NULL,
    `description` TEXT NULL,
    `authorUserId` VARCHAR(191) NOT NULL,
    `mergedIntoId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `feature_request_slug_key`(`slug`),
    INDEX `feature_request_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `feature_request_type_idx`(`type`),
    INDEX `feature_request_authorUserId_idx`(`authorUserId`),
    INDEX `feature_request_mergedIntoId_idx`(`mergedIntoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feature_request_vote` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `feature_request_vote_userId_idx`(`userId`),
    UNIQUE INDEX `feature_request_vote_requestId_userId_key`(`requestId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `feature_request_comment` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `authorUserId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `feature_request_comment_requestId_createdAt_idx`(`requestId`, `createdAt`),
    INDEX `feature_request_comment_authorUserId_idx`(`authorUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `feature_request` ADD CONSTRAINT `feature_request_authorUserId_fkey` FOREIGN KEY (`authorUserId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feature_request` ADD CONSTRAINT `feature_request_mergedIntoId_fkey` FOREIGN KEY (`mergedIntoId`) REFERENCES `feature_request`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feature_request_vote` ADD CONSTRAINT `feature_request_vote_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `feature_request`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feature_request_vote` ADD CONSTRAINT `feature_request_vote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feature_request_comment` ADD CONSTRAINT `feature_request_comment_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `feature_request`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `feature_request_comment` ADD CONSTRAINT `feature_request_comment_authorUserId_fkey` FOREIGN KEY (`authorUserId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
