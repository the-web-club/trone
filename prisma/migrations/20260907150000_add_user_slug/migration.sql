-- AlterTable
ALTER TABLE `user` ADD COLUMN `slug` VARCHAR(191) NULL;

-- Unique, readable slugs for existing staff. New users get a clean name slug in the app.
UPDATE `user`
SET `slug` = CONCAT(
  IF(
    CHAR_LENGTH(
      TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(`name`, '[^a-zA-Z0-9]+', '-')))
    ) = 0,
    'medewerker',
    TRIM(BOTH '-' FROM LOWER(REGEXP_REPLACE(`name`, '[^a-zA-Z0-9]+', '-')))
  ),
  '-',
  LOWER(LEFT(REPLACE(`id`, '-', ''), 8))
)
WHERE `slug` IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX `user_slug_key` ON `user`(`slug`);
