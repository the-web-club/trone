-- AlterTable
ALTER TABLE `timeline_event`
    ADD COLUMN `direction` ENUM('INBOUND', 'OUTBOUND') NULL,
    ADD COLUMN `outcome` ENUM('CONNECTED', 'NO_ANSWER', 'VOICEMAIL', 'BUSY', 'WRONG_NUMBER') NULL;

-- AlterTable
ALTER TABLE `task`
    ADD COLUMN `kind` ENUM('FOLLOW_UP') NOT NULL DEFAULT 'FOLLOW_UP',
    ADD COLUMN `dueDateOnly` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `sourceEventId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `task_sourceEventId_idx` ON `task`(`sourceEventId`);

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `task_sourceEventId_fkey` FOREIGN KEY (`sourceEventId`) REFERENCES `timeline_event`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
