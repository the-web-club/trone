# Faceted filters

Centrale filterlaag voor troneseating.app. Tellingen komen **server-side** uit dezelfde predicaten als de lijst, over de volledige dataset binnen de gebruikersscope. Nooit uit de huidige pagina.

## Architectuur

Eén gedeelde definitie per entiteit in `src/lib/filters/definitions.ts`. URL-parsing blijft in de bestaande `*-query.ts` modules; die whitelisten keys en waarden. Resultaten en facetten gebruiken `buildDealListWhere`, `buildCompanyListWhere`, `buildContactListWhere`, `buildQuoteListWhere`, `buildOrderListWhere` en `buildTaskListWhere`.

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

Filterkolommen hebben al database-indexen (`stageId`, `status`, `ownerUserId`, `sourceId`, `industryCode`, `sectorCode`, `deal_application.code`, …).

Er is **geen denormalized `filter_facet_index`-tabel**. Live `GROUP BY` houdt telling en lijst transactioneel gelijk. Een sidecar-index zou bij import/webhook/bulk extra write-amplification geven en tijdelijke 0-tellingen riskeren.

`pnpm tsx --env-file=.env.local --conditions react-server scripts/rebuild-filter-index.ts` is een idempotente health-check: dezelfde count-queries, geen duplicate rijen, geen stale 0. `index.version` is `1` (`mode: "live"`).

Mutaties (create/update/import/webhook) schrijven de bronrijen; de volgende list-request leest verse counts. Geen aparte cache-TTL.

## Cache

Alleen request-scope (React `cache` waar die al bestond voor lookup-lijsten). Geen cross-request facetcache, zodat organisaties/gebruikers niet kunnen lekken en aantallen niet achterlopen op mutaties.

## UI

Desktop dropdowns en de mobiele filter-sheet gebruiken dezelfde facetpayload. Openen van een dropdown triggert geen extra count-query. Discrete filters gaan via `router.replace`. Zoeken debounce ~150–250 ms. Tijdens laden blijven vorige opties staan (`isPending` → “Bijwerken…”). Bij stale classificatie: “Tellingen tijdelijk niet beschikbaar”, opties niet massaal disabled.

## Performance

Richtwaarde: één gebundelde request per filteractie, begrensd aantal `GROUP BY`s (niet per optie), geen full table dump naar de browser.

Bestaande indexen die deze plannen ondersteunen:

- `deal(stageId)`, `deal(status, stageId)`, `deal(ownerUserId)`, `deal(sourceId)`, `deal(companyId)`, `deal(createdAt)`
- `company(city)`, `company(country)`, `company(ownerUserId)`, `company(industryCode, sectorCode)`
- `contact(companyId)`, `contact(ownerUserId)`
- `deal_application(code)` + PK `(dealId, code)`

Relationele branche/sector op leads: `GROUP BY deal.companyId` + lookup van die company-ids. Toepassingen op leads: `GROUP BY deal_application.code` (uniek per lead+code). Toepassingen op bedrijven/contacten: compacte `(entityId, codes)`-set en `COUNT(DISTINCT entity)`.

Bekende beperking: bij tienduizenden bedrijven laadt de toepassing-facet van bedrijven/contacten matching ids in geheugen. Als dat te traag wordt, is een denormalized facet-index het volgende stap.

## Bekende beperkingen

- Single-tenant: geen organization-isolatie in queries.
- Geen Playwright-e2e in deze repo; de filterflow is gedekt in unit/integratietests (`src/lib/filters/options.test.ts`, facet-tests per service).
- Vrije datum- en waardebereiken hebben geen discrete optietellingen.
- Staff- en feedbacklijsten gebruiken deze facet-engine nog niet.
