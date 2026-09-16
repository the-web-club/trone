-- Audit- en eventlog voor Instellingen > Logs.
--
-- Append-only tabel: de applicatie schrijft alleen INSERTs. Er is geen
-- UPDATE- of DELETE-pad in de UI of in de server helpers, zodat een event
-- bewijswaarde houdt.
--
-- Geen foreign key naar `user`: een audit-event moet leesbaar blijven nadat
-- een gebruiker is verwijderd. Een FK zou die verwijdering blokkeren, of met
-- ON DELETE CASCADE juist het bewijs opruimen. De actor staat daarom als
-- snapshot in de rij (actorNameSnapshot / actorEmailSnapshot / actorRoleSnapshot)
-- naast de losse `actorUserId`.
--
-- `eventType`, `category`, `action`, `source`, `severity` en `result` zijn
-- VARCHAR en geen ENUM: een nieuw event zou anders een migratie kosten. De
-- toegestane standaardwaarden staan in één registry (src/lib/audit/registry.ts).
--
-- `searchIndex` is een afgeleid lowercase zoekveld. Het wordt bij de INSERT
-- door de applicatie gevuld (src/lib/audit/log.ts). Omdat de tabel append-only
-- is kan het veld niet stale raken, dus zijn hier geen triggers nodig zoals bij
-- `deal.searchIndex`.

CREATE TABLE `audit_event` (
    `id` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(64) NOT NULL,
    `category` VARCHAR(32) NOT NULL,
    `action` VARCHAR(96) NOT NULL,
    `source` VARCHAR(24) NOT NULL,
    `severity` VARCHAR(16) NOT NULL,
    `result` VARCHAR(16) NOT NULL,
    `actorUserId` VARCHAR(191) NULL,
    `actorNameSnapshot` VARCHAR(191) NULL,
    `actorEmailSnapshot` VARCHAR(191) NULL,
    `actorRoleSnapshot` VARCHAR(32) NULL,
    `entityType` VARCHAR(48) NULL,
    `entityId` VARCHAR(191) NULL,
    `entityLabel` VARCHAR(191) NULL,
    `route` VARCHAR(255) NULL,
    `httpMethod` VARCHAR(8) NULL,
    `targetKey` VARCHAR(191) NULL,
    `targetLabel` VARCHAR(191) NULL,
    `sessionId` VARCHAR(191) NULL,
    `requestId` VARCHAR(64) NULL,
    `clientEventId` VARCHAR(64) NULL,
    `metadata` JSON NULL,
    `searchIndex` TEXT NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `eventVersion` SMALLINT NOT NULL DEFAULT 1,

    -- Idempotency: een netwerkherhaling van dezelfde clientbatch mag geen
    -- tweede rij opleveren. Twee echte kliks krijgen twee verschillende
    -- clientEventId's en blijven dus twee events.
    UNIQUE INDEX `audit_event_clientEventId_key`(`clientEventId`),

    -- Keyset-pagination en de standaardsortering (occurredAt DESC, id DESC).
    INDEX `audit_event_occurredAt_id_idx`(`occurredAt`, `id`),

    -- Eén index per filterkolom, met occurredAt + id erachter zodat de
    -- sortering en de keyset-cursor uit dezelfde index komen en MariaDB niet
    -- hoeft te filesorten.
    INDEX `audit_event_eventType_occurredAt_id_idx`(`eventType`, `occurredAt`, `id`),
    INDEX `audit_event_actorUserId_occurredAt_id_idx`(`actorUserId`, `occurredAt`, `id`),
    INDEX `audit_event_category_occurredAt_id_idx`(`category`, `occurredAt`, `id`),
    INDEX `audit_event_source_occurredAt_id_idx`(`source`, `occurredAt`, `id`),
    INDEX `audit_event_result_occurredAt_id_idx`(`result`, `occurredAt`, `id`),
    INDEX `audit_event_severity_occurredAt_id_idx`(`severity`, `occurredAt`, `id`),
    INDEX `audit_event_action_occurredAt_id_idx`(`action`, `occurredAt`, `id`),

    -- "Alles op dit object": lead-detail, contact, bedrijf.
    INDEX `audit_event_entity_occurredAt_idx`(`entityType`, `entityId`, `occurredAt`),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
