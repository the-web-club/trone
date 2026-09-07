-- CreateIndex
CREATE INDEX `session_userId_idx` ON `session`(`userId`);

-- CreateIndex
CREATE INDEX `account_userId_idx` ON `account`(`userId`);

-- CreateIndex
CREATE INDEX `company_city_idx` ON `company`(`city`);

-- CreateIndex
CREATE INDEX `company_country_idx` ON `company`(`country`);

-- CreateIndex
CREATE INDEX `deal_status_idx` ON `deal`(`status`);

-- CreateIndex
CREATE INDEX `deal_ownerUserId_idx` ON `deal`(`ownerUserId`);

-- CreateIndex
CREATE INDEX `deal_sourceId_idx` ON `deal`(`sourceId`);

-- CreateIndex
CREATE INDEX `deal_contactId_idx` ON `deal`(`contactId`);

-- CreateIndex
CREATE INDEX `deal_createdAt_idx` ON `deal`(`createdAt`);

-- CreateIndex
CREATE INDEX `deal_status_stageId_idx` ON `deal`(`status`, `stageId`);

-- CreateIndex
CREATE INDEX `task_status_assigneeUserId_idx` ON `task`(`status`, `assigneeUserId`);

-- CreateIndex
CREATE INDEX `quote_dealId_idx` ON `quote`(`dealId`);

-- CreateIndex
CREATE INDEX `quote_contactId_idx` ON `quote`(`contactId`);

-- CreateIndex
CREATE INDEX `quote_status_idx` ON `quote`(`status`);

-- CreateIndex
CREATE INDEX `quote_createdAt_idx` ON `quote`(`createdAt`);

-- CreateIndex
CREATE INDEX `order_quoteId_idx` ON `order`(`quoteId`);

-- CreateIndex
CREATE INDEX `order_dealId_idx` ON `order`(`dealId`);

-- CreateIndex
CREATE INDEX `order_contactId_idx` ON `order`(`contactId`);

-- CreateIndex
CREATE INDEX `order_status_idx` ON `order`(`status`);

-- CreateIndex
CREATE INDEX `order_createdAt_idx` ON `order`(`createdAt`);

-- CreateIndex
CREATE INDEX `invoice_companyId_idx` ON `invoice`(`companyId`);
