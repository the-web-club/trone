-- Afgeleid zoekveld op deal + gerichte indexen voor de lijstfilters.
--
-- Waarom: het leadzoekveld zocht met LIKE '%term%' over deal.title én via
-- gecorreleerde subquery's over company.name en contact.firstName/lastName.
-- Dat predicaat werd per facet-telling opnieuw uitgevoerd (acht keer per
-- filteractie), elke keer met twee eq_ref-lookups per rij.
--
-- `searchIndex` bevat exact dezelfde velden als het oude predicaat
-- (title, bedrijfsnaam, contact voor- en achternaam) en niets meer, zodat de
-- zoeksemantiek ongewijzigd blijft. Triggers houden de kolom bij, dus ook de
-- CSV-import en eventuele directe SQL kunnen hem niet stale maken.
--
-- Geen bestaande businessdata wordt gewijzigd: dit voegt alleen een afgeleide
-- kolom en indexen toe.

ALTER TABLE `deal` ADD COLUMN `searchIndex` TEXT NULL;

-- Idempotente backfill: herhalen levert exact dezelfde waarden op.
UPDATE `deal` d
  LEFT JOIN `company` c ON c.id = d.companyId
  LEFT JOIN `contact` ct ON ct.id = d.contactId
   SET d.searchIndex = LOWER(CONCAT_WS(' ', d.title, c.name, ct.firstName, ct.lastName));

-- Bijhouden bij schrijven op deal zelf.
DROP TRIGGER IF EXISTS `deal_search_index_bi`;
CREATE TRIGGER `deal_search_index_bi` BEFORE INSERT ON `deal`
FOR EACH ROW
  SET NEW.searchIndex = LOWER(CONCAT_WS(' ',
    NEW.title,
    (SELECT c.name FROM `company` c WHERE c.id = NEW.companyId),
    (SELECT ct.firstName FROM `contact` ct WHERE ct.id = NEW.contactId),
    (SELECT ct.lastName FROM `contact` ct WHERE ct.id = NEW.contactId)));

DROP TRIGGER IF EXISTS `deal_search_index_bu`;
CREATE TRIGGER `deal_search_index_bu` BEFORE UPDATE ON `deal`
FOR EACH ROW
  SET NEW.searchIndex = LOWER(CONCAT_WS(' ',
    NEW.title,
    (SELECT c.name FROM `company` c WHERE c.id = NEW.companyId),
    (SELECT ct.firstName FROM `contact` ct WHERE ct.id = NEW.contactId),
    (SELECT ct.lastName FROM `contact` ct WHERE ct.id = NEW.contactId)));

-- Bijhouden bij naamswijziging van een gekoppeld bedrijf of contact.
DROP TRIGGER IF EXISTS `company_name_search_index_au`;
CREATE TRIGGER `company_name_search_index_au` AFTER UPDATE ON `company`
FOR EACH ROW
BEGIN
  IF NOT (NEW.name <=> OLD.name) THEN
    UPDATE `deal` d
      LEFT JOIN `contact` ct ON ct.id = d.contactId
       SET d.searchIndex = LOWER(CONCAT_WS(' ', d.title, NEW.name, ct.firstName, ct.lastName))
     WHERE d.companyId = NEW.id;
  END IF;
END;

DROP TRIGGER IF EXISTS `contact_name_search_index_au`;
CREATE TRIGGER `contact_name_search_index_au` AFTER UPDATE ON `contact`
FOR EACH ROW
BEGIN
  IF NOT (NEW.firstName <=> OLD.firstName) OR NOT (NEW.lastName <=> OLD.lastName) THEN
    UPDATE `deal` d
      LEFT JOIN `company` c ON c.id = d.companyId
       SET d.searchIndex = LOWER(CONCAT_WS(' ', d.title, c.name, NEW.firstName, NEW.lastName))
     WHERE d.contactId = NEW.id;
  END IF;
END;

-- Indexen, elk onderbouwd met EXPLAIN op een dataset van 12.000 leads /
-- 5.000 bedrijven / 14.000 contacten. Alleen indexen die in EXPLAIN
-- daadwerkelijk gekozen worden en de kosten verlagen.
--
-- Geen index op (createdAt, id): InnoDB hangt de primary key al achter elke
-- secundaire index, dus het bestaande deal(createdAt) dekt de stabiele
-- sortering `createdAt DESC, id DESC` met Using index. Om dezelfde reden
-- eindigen de composites hieronder niet op `id`.

-- Bedrijvenlijst sorteert altijd op naam.
-- Voor: type=ALL, rows=4518, Using filesort. Na: key=company_name_idx, Using index.
CREATE INDEX `company_name_idx` ON `company` (`name`);

-- Contactenlijst sorteert op voor- en achternaam.
-- Voor: type=ALL, rows=15224, Using filesort. Na: key=contact_name_idx, Using index.
CREATE INDEX `contact_name_idx` ON `contact` (`firstName`, `lastName`);

-- Plaats-facet met actief landfilter.
-- Voor: type=ALL, rows=5223, Using temporary + filesort, 97 ms.
-- Na: type=ref, rows=1256, Using index, 20 ms.
CREATE INDEX `company_country_city_idx` ON `company` (`country`, `city`);

-- Sortering "laatst gewijzigd" had geen enkele index.
CREATE INDEX `deal_updatedAt_idx` ON `deal` (`updatedAt`);

-- Filter + stabiele sortering uit één index, voor de drie filters die de
-- lijst het vaakst combineert met de standaardsortering.
-- Elk verifieerd als type=ref met Using index i.p.v. een volledige indexscan.
CREATE INDEX `deal_status_createdAt_idx` ON `deal` (`status`, `createdAt`);
CREATE INDEX `deal_stageId_createdAt_idx` ON `deal` (`stageId`, `createdAt`);
CREATE INDEX `deal_ownerUserId_createdAt_idx` ON `deal` (`ownerUserId`, `createdAt`);
