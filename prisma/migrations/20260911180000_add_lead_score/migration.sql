-- AlterTable
ALTER TABLE `deal`
    ADD COLUMN `qualFit` VARCHAR(191) NULL,
    ADD COLUMN `qualNeed` VARCHAR(191) NULL,
    ADD COLUMN `qualIntent` VARCHAR(191) NULL,
    ADD COLUMN `qualDecision` VARCHAR(191) NULL,
    ADD COLUMN `qualTiming` VARCHAR(191) NULL,
    ADD COLUMN `leadScore` INTEGER NULL,
    ADD COLUMN `leadScoreAssessed` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `leadScoreNoMatch` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `leadScoreSort` INTEGER NOT NULL DEFAULT -1;

-- CreateIndex
CREATE INDEX `deal_leadScoreNoMatch_leadScore_idx` ON `deal`(`leadScoreNoMatch`, `leadScore`);

-- CreateIndex
CREATE INDEX `deal_leadScoreAssessed_idx` ON `deal`(`leadScoreAssessed`);

-- CreateIndex
CREATE INDEX `deal_leadScoreSort_idx` ON `deal`(`leadScoreSort`);
