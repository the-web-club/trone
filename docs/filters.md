# Faceted filters

Centrale filterlaag voor troneseating.app. Tellingen komen **server-side** uit dezelfde predicaten als de lijst, over de volledige dataset binnen de gebruikersscope. Nooit uit de huidige pagina.

## Architectuur

Eén gedeelde definitie per entiteit in `src/lib/filters/definitions.ts`. URL-parsing blijft in de bestaande `*-query.ts` modules; die whitelisten keys en waarden.

Het filtercontract heeft twee uitdrukkingen van dezelfde semantiek:

| Laag | Waar | Waarvoor |
| --- | --- | --- |
| Prisma `where` | `buildDealListWhere`, `buildCompanyListWhere`, `buildContactListWhere`, … | de lijst en het totaal |
| SQL-fragment | `src/lib/filters/sql-where.ts` | facet-aggregatie |

De SQL-laag bestaat omdat Prisma's `groupBy` niet op een kolom van een relatie kan groeperen. De vorige implementatie groepeerde daarom op `companyId` (O(bedrijven) groepen), haalde die id's naar Node en deed een tweede query met `IN (…duizenden id's…)`. Voor contacten haalde hij de hele tabel met geneste leads en toepassingen op om in JS te tellen. Dat groeide lineair mee met de dataset.

Twee implementaties is een driftrisico. `src/lib/filters/sql-where.drift.test.ts` vergelijkt daarom beide op een matrix van filtercombinaties tegen dezelfde database: `COUNT(*)` moet identiek zijn. `src/lib/filters/facet-counts.db.test.ts` controleert daarnaast dat elke facet-telling gelijk is aan het lijsttotaal dat je krijgt als je die optie echt aanzet.

Raw SQL loopt altijd via `Prisma.sql` met gebonden parameters. `$queryRawUnsafe` en `$executeRawUnsafe` worden niet gebruikt.

De lijstpagina doet één RSC-request. Daarin worden items, totaal, paginering en facet-tellingen gebundeld (Promise.all op de server). Geen request per filter of per optie.

```ts
{
  items, pagination, total,
  facets: { branche: { options: [{ value, label, count }] } },
  index: { version, generatedAt, mode: "live" }
}
```

TRÔNE is single-tenant. Er is geen `organization_id`. Scope is de hele CRM-dataset plus optionele eigenaarfilters (`aan-mij`). De client kan geen organisatie kiezen.

## Ondersteunde facets

| Entiteit | Facets | Geen telling |
| --- | --- | --- |
| Lead | fase, bron, eigenaar, status, leadscore, branche, sector, toepassing | zoeken, waarde, datum, sortering |
| Bedrijf | plaats, land, eigenaar, leads, branche, sector, toepassing | zoeken |
| Contact | bedrijf, eigenaar, branche, sector, toepassing | zoeken |
| Taak | toegewezen, wanneer, afgerond | zoeken, vrije datum |
| Offerte | status, klant | zoeken, datum |
| Order | status, klant | zoeken, datum |

Multi-select facets (branche, sector, toepassing) gebruiken **OR binnen het facet** en **AND tussen facetten**. Dat staat in de definitie (`selectionOperator: "OR"`).

Stabiele value keys: enum/id/code. Leeg = `onbekend`. Lead zonder bedrijf = `geen-bedrijf`. Labels mogen wijzigen.

## Countsemantiek

- Unieke entiteiten: `COUNT(deal.id)` / `COUNT(company.id)` / `COUNT(contact.id)`. Bij joins `COUNT(DISTINCT …)` of equivalent (unieke `(dealId, code)` op `deal_application`; unieke company/contact-sets in JS voor toepassingen).
- **Other Filters Changed / self-exclusion:** telling voor facet F = records die matchen met alle actieve filters **behalve F**.
- Zoeken telt mee. Sortering niet.
- Ontbrekende catalogusopties komen terug met count `0` (LEFT JOIN). Ontbrekende tellingen bij een queryfout zijn `null`, niet `0`.
- Optie met `0`: zichtbaar, disabled, blijft op zijn plek. Een al geselecteerde `0` blijft verwijderbaar.

## Index

Er is **geen denormalized `filter_facet_index`-tabel**. Live `GROUP BY` houdt telling en lijst transactioneel gelijk. Een sidecar-index zou bij import/webhook/bulk extra write-amplification geven en tijdelijke 0-tellingen riskeren.

`pnpm tsx --env-file=.env.local --conditions react-server scripts/rebuild-filter-index.ts` is een idempotente health-check: dezelfde count-queries, geen duplicate rijen, geen stale 0. `index.version` is `1` (`mode: "live"`).

Mutaties (create/update/import/webhook) schrijven de bronrijen; de volgende list-request leest verse counts. Geen aparte cache-TTL.

### Zoeken op leads

Het leadzoekveld zoekt op de lead én op het gekoppelde bedrijf en contact. Dat liep via `LIKE '%term%'` op `deal.title` plus twee gecorreleerde subquery's, en dat predicaat werd per facet opnieuw uitgevoerd (acht keer per filteractie).

`deal.searchIndex` is een afgeleide lowercase kolom met **exact dezelfde velden** als het oude predicaat: titel, bedrijfsnaam, contact voor- en achternaam. Geen e-mail, want dat zat er eerder ook niet in. De zoeksemantiek is daarmee ongewijzigd, inclusief substring-matching midden in een woord; `search.db.test.ts` vergelijkt de aantallen met het oude predicaat.

Bewust geen FULLTEXT: dat matcht op woordgrenzen, waardoor `jan` niet langer `Jansen` zou vinden. Dat zou de bestaande semantiek breken.

De kolom wordt door **databasetriggers** bijgehouden (`deal_search_index_bi/bu`, `company_name_search_index_au`, `contact_name_search_index_au`), niet door applicatiecode. Zo kan geen enkel schrijfpad hem stale maken, ook de CSV-import of directe SQL niet. `pnpm search:backfill` is een idempotente reparatie/controle: hij werkt alleen rijen bij die afwijken en eindigt met exitcode 1 als er iets overblijft.

### Indexen

Bestaande filterkolommen hadden al indexen (`stageId`, `status`, `ownerUserId`, `sourceId`, `industryCode`, `sectorCode`, `deal_application.code`, …). Toegevoegd in `20260916120000_add_deal_search_index`, elk met EXPLAIN onderbouwd op 12.000 leads / 5.000 bedrijven / 14.000 contacten:

| Index | Waarom | Voor → na |
| --- | --- | --- |
| `company(name)` | bedrijvenlijst sorteert altijd op naam | `type=ALL` + filesort, 4.518 rijen → `Using index`, 25 rijen |
| `contact(firstName, lastName)` | contactenlijst sorteert op naam | `type=ALL` + filesort, 15.224 rijen → `Using index`, 25 rijen |
| `company(country, city)` | plaats-facet met actief landfilter | `type=ALL` + temporary + filesort, 97 ms → `type=ref` + `Using index`, 20 ms |
| `deal(updatedAt)` | sortering "laatst gewijzigd" had geen index | filesort → `Using index` |
| `deal(status, createdAt)` | filter + standaardsortering uit één index | volledige indexscan → `type=ref` |
| `deal(stageId, createdAt)` | kanban-kolom en fasefilter | 10.056 → 2.401 rijen |
| `deal(ownerUserId, createdAt)` | "aan mij" + sortering | 10.056 → 1.500 rijen |

Geen index op `(createdAt, id)`: InnoDB hangt de primary key al achter elke secundaire index, dus het bestaande `deal(createdAt)` dekt de stabiele sortering `createdAt DESC, id DESC` met `Using index`. Om dezelfde reden eindigen de composites hierboven niet op `id`. Dat is met EXPLAIN gecontroleerd, niet aangenomen.

## Cache

Alleen request-scope (React `cache` waar die al bestond voor lookup-lijsten). Geen cross-request facetcache, zodat organisaties/gebruikers niet kunnen lekken en aantallen niet achterlopen op mutaties.

## UI

Desktop dropdowns en de mobiele filter-sheet gebruiken dezelfde facetpayload. Openen van een dropdown triggert geen extra count-query. Discrete filters gaan via `router.replace`. Zoeken debounce ~150–250 ms. Tijdens laden blijven vorige opties staan (`isPending` → “Bijwerken…”). Bij stale classificatie: “Tellingen tijdelijk niet beschikbaar”, opties niet massaal disabled.

## Keuzelijsten

Bedrijf- en contactopties gingen als volledige tabel via props naar de browser (`listCompaniesForSelect()` en `listContactsForSelect()` zonder `take`), op elke filteractie opnieuw. Op de bench-dataset was dat 2,4 MB RSC-payload per lijstrender.

Nu:

- `searchCompaniesForSelect()` / `searchContactsForSelect()` leveren maximaal 50 rijen, met `includeIds` om de huidige selectie altijd zichtbaar te houden;
- `AsyncComboboxMenu` (`src/components/ui/async-combobox.tsx`) zoekt server-side bij: debounce 220 ms, geen request onder de minimumlengte, en een oplopend requestnummer zodat een ouder antwoord een nieuwer nooit overschrijft;
- filterdropdowns voor bedrijf (contacten) en klant (offertes, orders) komen uit de facetrij zelf, inclusief naam. Alleen bedrijven die echt contacten/offertes/orders hebben zijn zinvolle opties; een bedrijf met nul contacten leverde altijd een leeg resultaat op en stond er eerder wél bij.

## Performance

Gemeten op een bench-dataset van **12.000 leads / 5.000 bedrijven / 14.000 contacten** (`scripts/bench-setup.mjs`), mediaan van vijf warme runs. Zie `src/lib/filters/performance.db.test.ts`.

| Scenario | Voor | Na |
| --- | --- | --- |
| Leadpagina, payload | 1.370 ms, **2.422 KB**, 18 query's | 140 ms, **37 KB**, 15 query's |
| Leadlijst (alleen lijst+count) | 63 ms | 66 ms, 21 KB |
| Leadfacetten | 325 ms, 11 query's | 151 ms, 8 query's |
| Leadfacetten + zoekterm | 599 ms | 200 ms |
| Leadlijst, zoeken | 923 ms (volledige pagina) | 62 ms |
| Bedrijvenpagina | 867 ms, 15 query's | 234 ms, 12 query's |
| Bedrijffacetten | 802 ms, 10 query's | 176 ms, 7 query's |
| Bedrijven `leads=5plus` | 139 ms, 3 query's | 65 ms, 2 query's |
| Contactenpagina | 1.552 ms, **874 KB** | 197 ms, **51 KB** |
| Contactfacetten | **2.662 ms** | 248 ms, 15 KB |
| Diepe pagina 400 (offset 9.975) | — | 94 ms (pagina 1: 81 ms) |
| Zes filteracties parallel | — | 281 ms |

Richtwaarde: één gebundelde request per filteractie, begrensd aantal `GROUP BY`s (niet per optie), geen full table dump naar de browser.

Relationele branche/sector op leads en contacten: `LEFT JOIN company` + `GROUP BY` op de bedrijfs­kolom, in de database. Toepassingen: `GROUP BY deal_application.code` (uniek per lead+code) respectievelijk `COUNT(DISTINCT entity)` bij bedrijven en contacten. Lead-aantal bucket op bedrijven: subquery-predicaat, geen id-lijst.

## Bekende beperkingen

- Single-tenant: geen organization-isolatie in queries. Scope is de hele CRM-dataset plus optionele eigenaarfilters.
- Offsetpaginering blijft O(offset). Op 12.000 leads is pagina 400 nog 94 ms (`Using index`), maar dit groeit lineair. Bij honderdduizenden leads is keyset-paginering nodig; de huidige UX met paginanummers is daarvoor bewust ongewijzigd gelaten.
- De bedrijf-facet op contacten toont de 200 bedrijven met de meeste contacten. Een bedrijf buiten die top blijft filterbaar via de URL of de bedrijfsdetailpagina, en een actief filter houdt altijd zijn label.
- `deal.searchIndex` vergt de triggers uit de migratie. Draai `pnpm search:backfill` na een bulk-import die triggers omzeilt (`LOAD DATA`, replicatie).
- Zoeken op leads gebruikt `LIKE '%term%'` op één kolom. Dat kan geen index gebruiken en blijft O(rijen); het is nu wel één kolomvergelijking in plaats van drie tabellen. FULLTEXT is bewust niet gekozen omdat het de substring-semantiek zou breken.
- Geen Playwright-e2e in deze repo; de filterflow is gedekt in unit- en databasetests (`src/lib/filters/*.test.ts`).
- Vrije datum- en waardebereiken hebben geen discrete optietellingen.
- Staff- en feedbacklijsten gebruiken deze facet-engine nog niet.
