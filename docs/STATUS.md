# TRÔNE Seating — status-audit tegen `docs/MVP.md`

Datum: 4 september 2026.  
Bron: code, Prisma-schema, migraties, routes, tests en een read-only query op de live database `trone_seating`.  
Niets in deze audit is verzonnen. Waar iets niet te verifiëren was, staat unreadable.

Statuslegenda:

- **[KLAAR]** — gebouwd en consistent (routes, service, actions, UI aanwezig).
- **[DEELS]** — gebouwd maar onvolledig, ongetest of met bekende gaten.
- **[ONTBREEKT]** — nog niet gebouwd.

---

## Samenvatting

Fase 0 (skelet, auth, shell, catalogus, seed) en het interne CRM + offerte-configurator zijn grotendeels aanwezig. Offerte-versiebeheer, prijsbeheer, swatches, medewerkers en het werkzaamhedenlogboek staan er.

Wat de MVP uit fase 1 nog blokkeert voor een eerste bruikbare keten: **offerte → order**, **productiestatus**, **factuur/Mollie**, **klantportaal**, en **offerte daadwerkelijk versturen** (geen PDF, geen mail naar de klant).

`pnpm typecheck` is schoon. `pnpm test` is groen (27 tests, 4 bestanden). `pnpm lint` slaagt met 4 unused-import-warnings. `prisma migrate status` meldt: 7 migraties gevonden, schema up to date.

---

## 1. Auth

**Status: [DEELS]**

Better Auth 1.6.x staat. Interne gebruikers zitten in `user`. Rollen `admin` / `user` / `viewer` zijn geconfigureerd. Signup is uit. Inloggen en sessie-helpers bestaan. Bootstrap-admin via `INITIAL_ADMIN_*`.

**Bewijs**

- `src/lib/auth.ts` — `emailAndPassword.enabled`, `disableSignUp: true`, plugin `admin` met `roles: { admin, user, viewer }`.
- `src/lib/auth-session.ts` — `getSession`, `requireSession` (redirect `/inloggen`), `getSessionRole`, `isAdminSession`, `requireAdmin`.
- `src/lib/auth-client.ts` — `createAuthClient` + `adminClient`.
- `src/app/api/auth/[...all]/route.ts` — Better Auth Next-handler.
- `src/app/inloggen/page.tsx`, `src/app/inloggen/login-form.tsx` — interne login.
- `src/app/wachtwoord-instellen/page.tsx` — wachtwoord via uitnodigingslink.
- `scripts/create-admin.ts` — `auth.api.createUser` met `role: "admin"`.
- Schema: `prisma/schema.prisma` model `User.role` comment `admin | user | viewer`; extra velden `banned`, `isActive`.

**Gaten**

- `viewer` is gedefinieerd in Better Auth, maar CRM-schrijfacties (bedrijf, contact, lead, offerte, logboek) doen alleen `requireSession()`. Een viewer kan dus muteren. Alleen catalogus (`src/app/(beveiligd)/actions/catalog-actions.ts`) en medewerkers (`src/app/(beveiligd)/actions/user-actions.ts`) eisen `requireAdmin()`.
- Geen tests voor auth/sessie.
- Of Resend-uitnodigingen in productie aankomen is **niet geverifieerd** (alleen codepad: `src/lib/mail.ts` + `sendResetPassword` in `auth.ts`).

---

## 2. Database: schema, migraties, seed

**Status: [KLAAR]** (schema + migraties + seed-catalogus). Testdata in de live DB is een apart punt, zie Datacheck.

### Schema

`prisma/schema.prisma` bevat de MVP-modellen: User/Session/Account/Verification, Company, Contact, LeadSource, DealStage, Deal, DealActivity, Product, ProductOption, OptionValue, ProductOptionAvailability, ProductImage, ProductImageSelection, CompanyPricing, Configuration, ConfigurationItem, Quote, QuoteItem, QuoteVersion, QuoteVersionItem, Order, OrderItem, Invoice, CustomerUser, NumberSequence, WorkLog.

Enums: `DealStatus`, `ActivityType`, `OptionInputType`, `QuoteStatus`, `OrderStatus`, `InvoiceStatus`, `WorkLogCategory`.

### Migraties (7, in mapvolgorde)

1. `20260904080039_init` — basistabellen inclusief CRM, catalogus, quote/order/invoice, `customer_user`, `number_sequence`.
2. `20260904081546_better_auth_admin_fields` — `user.banned` / `banReason` / `banExpires`, `session.impersonatedBy`.
3. `20260904081658_better_auth_account_issuer` — `account.issuer`.
4. `20260904120000_add_images_swatches` — `option_value.swatchHex` / `swatchImageUrl`, `product_image`, `product_image_selection`.
5. `20260904131600_add_quote_versions` — `quote_version`, `quote_version_item`, `quote.currentVersionId` / `currentVersionNumber`, backfill bestaande offertes naar v1.
6. `20260904152300_add_user_is_active` — `user.isActive`.
7. `20260904152400_add_work_log` — `work_log`.

`prisma migrate status` (4 sep 2026, tegen SkySQL `trone_seating`): **Database schema is up to date.** Of `prisma migrate deploy` op een lege DB foutloos doorloopt is **niet opnieuw uitgevoerd** (dat zou schrijven); de statuscheck is schoon.

### Seed vs catalogus-eisen

`scripts/seed.ts` is idempotent (upsert). Gecontroleerd in seed **en** in de live DB:

| Eis (MVP) | Seed | Live DB |
| --- | --- | --- |
| 2 producten ECS €2555, LAS4.1 €2875 | ja | ja (`ECS` 2555, `LAS4.1` 2875) |
| 20 optie-assen | ja, codes `control` … `mount_bracket` | ja, 20 opties, 43 waarden |
| Climate-combo €550 (geen som) | `Verwarming + koeling` 550 | zelfde |
| Draaitafel op aanvraag | `turntable` / `Ja` `onRequest: true` | zelfde |
| Luchtvering alleen ECS | availability ECS + `air_suspension` | 1 regel: ECS / `air_suspension` |
| 7 stages Lead → Gewonnen/Verloren | ja | niet opnieuw geteld; seed upsert |
| Leadbronnen + nummerreeksen 2026 | ja | niet opnieuw uitgelezen |

Prijzen van meerprijzen in de live DB komen overeen met de seed (leder 450, TS95 950, TS97 1540, 10-direction 540, 3-punts 350, seatlift 800, Sittab 135, Linde/Hyster 165, enz.).

Seed vult **geen** bedrijven, leads of testdata. Die records komen uit app-gebruik.

Overige DB-files: `src/lib/db.ts` (MariaDB-adapter, `connectionLimit: 5`, TLS), `src/lib/id.ts`, `src/lib/number-sequence-service.ts`, `src/lib/pricing-context.ts`.

---

## 3. App-shell, navigatie, tokens, UI-primitieven

**Status: [KLAAR]**

**Bewijs**

- `src/app/(beveiligd)/layout.tsx` — `requireSession` + `AppShell`.
- `src/components/shell/app-shell.tsx`, `app-sidebar.tsx`, `app-topbar.tsx`, `page-header.tsx`.
- `src/components/shell/nav-config.ts` — Overzicht, Leads, Bedrijven, Contacten, Offertes, Orders, Producten, Logboek, Instellingen.
- Tokens: `src/styles/tokens.css` (`--sidebar-w: 200px`, `--topbar-h: 52px`, `--content-max: 1200px`, grijsschaal), `src/app/globals.css` (`@theme inline`, Inter Tight via `--font-sans`).
- Primtieven onder `src/components/ui/`: button, input, select, textarea, dialog, popover, table, badge, panel, card, form-field, filter-bar, segmented-control, control-styles.
- `src/app/page.tsx` — redirect sessie → `/overzicht`, anders `/inloggen`.

**Kanttekening (conventie, geen ontbrekend scherm):** MVP §7 punt 3 zegt “geen UUID in de URL”. Detailroutes gebruiken wel UUID: `/bedrijven/[id]`, `/leads/[id]`, `/offertes/[id]`, `/orders/[id]`. `createShortCode()` in `src/lib/id.ts` wordt daarvoor niet gebruikt. Offertenummers zelf (`OFF2026…`) zijn wél korte codes, maar staan niet in het pad.

---

## 4. Bedrijven (CRUD, lijst, detail)

**Status: [DEELS]**

**Bewijs**

- Routes: `/bedrijven` (`src/app/(beveiligd)/bedrijven/page.tsx`), `/bedrijven/nieuw`, `/bedrijven/[id]`.
- Service: `src/lib/company-service.ts` — `listCompanyRows`, `getCompany`, `createCompany`, `updateCompany`.
- Actions: `src/app/(beveiligd)/actions/company-actions.ts`.
- UI: `src/components/company/company-form.tsx`, `companies-filters.tsx`.
- URL-filters: `src/lib/companies-query.ts` (`zoeken`, `plaats`, `land`, `pagina`). Tests in `src/lib/companies-query.test.ts`.

**Gaten**

- Geen delete (geen `deleteCompany`, geen action, geen UI). CRUD is dus C/R/U.
- Geen eigen tests voor de service.
- `CompanyPricing` (klantkorting) heeft wél een model en wordt meegenomen bij offertes, maar er is **geen UI** om korting per bedrijf te zetten.

---

## 5. Contacten (CRUD, gekoppeld aan bedrijf, primair)

**Status: [DEELS]**

**Bewijs**

- Lijst: `/contacten` (`src/app/(beveiligd)/contacten/page.tsx`) met filters `zoeken` / `bedrijf`.
- Aanmaken/bewerken: dialogs op bedrijfsdetail (`src/components/company/contact-form-dialog.tsx`).
- Service: `src/lib/contact-service.ts` — `createContact` / `updateContact` wissen andere primaries via `clearOtherPrimaries`.
- Actions: `src/app/(beveiligd)/actions/contact-actions.ts`.
- Query: `src/lib/contacts-query.ts` (meegetest in `companies-query.test.ts`).

**Gaten**

- Geen `/contacten/nieuw`, geen `/contacten/[id]`. De lijst linkt naar het bedrijf.
- Geen delete.
- `Contact.companyId` is optioneel in het schema; de create-action vereist wel een `companyId` (via bedrijfsdialog). Los contact zonder bedrijf is via de UI niet aan te maken.

---

## 6. Leads / pijplijn

**Status: [KLAAR]**

Aanwezig: deals, 7 stages, kanban + lijst, activiteitenlog, URL-filters, list/kanban-toggle, facetten, bron- en waardefilters, CSV-export.

**Bewijs**

- Routes: `/leads`, `/leads/nieuw`, `/leads/[id]`, `/leads/exporteren`.
- Service: `src/lib/deal-service.ts` — `listDeals`, `listAllDeals`, `getDealFilterFacets`, `exportDealsCsv`, `createDeal`, `updateDeal`, `moveDealToStage`, `addDealActivity`.
- Actions: `src/app/(beveiligd)/actions/deal-actions.ts`.
- UI: `leads-browser.tsx`, `leads-filters.tsx`, `leads-list-table.tsx`, `leads-kanban.tsx` (`@dnd-kit`), `deal-form.tsx`, `deal-activity-form.tsx`.
- Query: `src/lib/deals-query.ts` — `zoeken`, `fase`, `bron`, `eigenaar`, `status`, `waarde-min`/`waarde-max`, `van`/`tot`, `datumveld`, `sortering`, `view=kanban|lijst`, `pagina`.
- Tests: `src/lib/deals-query.test.ts`, `src/lib/deal-filter-facets.test.ts`.

**Kanttekeningen (niet blokkerend voor dit onderdeel)**

- Geen delete van een lead.
- Geen service-tests voor create/update/move (alleen query + facets).
- Kanban haalt tot 1000 deals (`KANBAN_LIST_CAP` in `deal-service.ts`).

---

## 7. Offerte-configurator (Tesla-stijl)

**Status: [DEELS]**

De configurator zelf (live prijs, availability, op-aanvraag, snapshot bij opslaan) is gebouwd. Ontbreekt t.o.v. MVP fase 1: PDF, en “versturen” mailt de klant niet.

**Bewijs — aanwezig**

- UI: `src/components/quote/quote-form.tsx`, `quote-line-editor.tsx`, `src/components/configurator/*` (choice-tile, option-section, option-toggle, price-bar, product-stage, swatch-dots, animated-price).
- Client-prijs: `quote-form.tsx` / `quote-line-editor.tsx` roepen `calculatePrice` + `validateConfiguration`.
- Server herberekent: `src/lib/quote-service.ts` `pricedLine()` → `validateConfiguration` + `calculatePrice`; gebruikt in `createQuote`, `editDraft`, `sendQuote`.
- Snapshot per regel: `persistQuoteItems` schrijft `Configuration.configSnapshot` én `QuoteItem.configSnapshot`.
- Availability: seed + `validateConfiguration` weigert luchtvering op LAS4.1; UI filtert via `optionsForProduct` in `src/lib/quote-catalog.ts`.
- Op aanvraag: `turntable` in seed; UI `price-bar.tsx` toont `+ n.t.b.`; `quote-lines.tsx` toont “n.t.b. door productspecialist”.
- Routes: `/offertes`, `/offertes/nieuw`, `/offertes/[id]`, `/offertes/[id]/bewerken`.
- Actions: `src/app/(beveiligd)/actions/quote-actions.ts`.

**Gaten**

- Geen PDF-generatie (geen pdf-route, geen pdf-dependency in `package.json`).
- `sendQuote` legt een versie vast; roept `sendMail` niet aan. Geen klantmail.
- Geen tests voor `quote-service` / snapshot-persist.
- `CompanyPricing` wordt wel toegepast als rijen bestaan; er is geen scherm om die rijen te beheren.

---

## 8. Prijsbeheer

**Status: [KLAAR]**

**Bewijs**

- Route: `/producten` (`src/app/(beveiligd)/producten/page.tsx`).
- UI: `src/components/catalog/catalog-prices.tsx`, `price-field.tsx`.
- Service: `src/lib/catalog-service.ts` — `updateProductBasePrice`, `updateOptionValuePrice` (blokkeert `priceOnRequest`).
- Actions: `updateProductBasePriceAction`, `updateOptionValuePriceAction` achter `requireAdmin()`.
- Niet-admins zien de catalogus alleen-lezen (`canEdit = isAdminSession`).

**Gat:** geen tests voor catalogus-updates.

---

## 9. Swatches en productafbeeldingen

**Status: [KLAAR]** (code + placeholders). Live Blob-upload is **niet in de browser getest**.

**Bewijs**

- Schema + migratie `20260904120000_add_images_swatches`.
- Upload: `src/lib/blob.ts` (`@vercel/blob` `put`, private, eist `BLOB_READ_WRITE_TOKEN`).
- `resolveImage`: `src/lib/product-visuals.ts`.
- Placeholders: `src/lib/placeholder-visuals.ts`, `scripts/generate-placeholders.ts`, 61 SVG’s onder `public/placeholders/` (per optiewaarde, swatch-fabric, product, combo back×fabric). Catalogus-waarde “Geen” heeft o.a. `placeholder-air_suspension-geen.svg` en `placeholder-climate-geen.svg`.
- Admin-UI: `swatch-editor.tsx`, `product-images-admin.tsx` op `/producten`.
- Private Blob-weergave: `src/app/api/media/route.ts` (sessie + hostname `*.blob.vercel-storage.com`).
- Configurator gebruikt `resolveImage` + placeholder-fallback.

---

## 10. Offerte-versiebeheer

**Status: [DEELS]**

Concept bewerken, versturen = versie, suffix `-vN`, vergelijken: aanwezig. Versturen is intern (status + snapshot), geen externe bezorging.

**Bewijs**

- Modellen `QuoteVersion` / `QuoteVersionItem`; migratie `20260904131600_add_quote_versions`.
- `src/lib/quote-version.ts` — `formatQuoteVersionNumber` → `` `${quoteNumber}-v${versionNumber}` ``; `compareVersionLines`.
- `sendQuote` / `createRevision` / `updateQuoteStatus` in `src/lib/quote-service.ts`.
- UI: `quote-version-actions.tsx`, `quote-version-history.tsx`, `quote-version-compare.tsx`; detail leest `?versie=`, `?vergelijk=` / `?met=`.

**Gaten**

- Geen tests voor versielogica.
- “Versturen” mailt/PDF’t niet (zie §7).

---

## 11. Order-flow (offerte → order, productiestatus)

**Status: [DEELS]**

Schema en lees-UI bestaan. De keten “gewonnen/geaccepteerd → order” en productiestatus beheren ontbreken.

**Bewijs — aanwezig**

- Modellen `Order` / `OrderItem` met `OrderStatus` (NEW … CANCELLED) en `configSnapshot`.
- Lijst `/orders` + filters (`src/lib/orders-query.ts`, `src/lib/order-service.ts` `listOrders`).
- Detail `/orders/[id]` — toont nummer, klant, status-badge, werkzaamhedenlogboek.

**Gaten**

- Geen `createOrder`, geen action, geen “maak order van offerte”.
- `updateQuoteStatus(..., ACCEPTED)` zet alleen offertestatus; maakt geen order.
- Geen UI/action om `Order.status` te wijzigen.
- Detail toont geen orderregels, geen snapshot, geen bedragen.
- Live DB: **0 orders**. Het orderdetailscherm is dus niet met echte data te verifiëren.

---

## 12. Mollie-facturatie

**Status: [ONTBREEKT]**

**Bewijs dat alleen het datamodel er is**

- `Invoice` in `prisma/schema.prisma` (`mollieInvoiceId`, `pdfUrl`, statussen).
- Tabel al in `20260904080039_init`.

**Niet aanwezig**

- Geen `@mollie` (of andere) dependency in `package.json`.
- Geen `invoice-service`, geen actions, geen `/facturen`-route, geen webhook-route.
- Grep in `src/` op `mollie` / `Invoice` (buiten schema): geen hits.
- Live DB: **0 invoices**.

---

## 13. Klantportaal

**Status: [ONTBREEKT]**

**Bewijs**

- Model `CustomerUser` in schema + init-migratie.
- Geen routes onder een portaal-pad, geen `customer_user`-login, geen queries scoped op `companyId` van een klantgebruiker.
- Grep in `src/` op `CustomerUser` / `customer_user` / `klantportaal`: geen hits.
- Live DB: **0 customer_users**.

Herhaalbestelling, orderhistorie, offerte/factuurinzage voor klanten: niet gebouwd.

---

## 14. Medewerkersbeheer

**Status: [KLAAR]**

**Bewijs**

- `/instellingen` → kaart Medewerkers; `/instellingen/medewerkers`.
- `src/lib/user-service.ts` — `inviteUser`, `sendInvitation` (`auth.api.requestPasswordReset` → `/wachtwoord-instellen`), `updateUserRole`, `setUserActive` (laatste admin beschermd, sessies gewist bij deactiveren).
- Actions achter `requireAdmin()`.
- UI: `invite-user-form.tsx`, `staff-table.tsx`, `staff-filters.tsx`.
- Mailtemplate: `invitationMail` in `src/lib/mail.ts`.

**Kanttekening:** of de mail in de praktijk aankomt hangt af van `RESEND_*` — niet live getest in deze audit. Live DB heeft 1 user: `admin@troneseating.nl` / rol admin.

---

## 15. Werkzaamhedenlogboek

**Status: [KLAAR]**

Vrij én gekoppeld aan klant/order.

**Bewijs**

- Model `WorkLog`; migratie `20260904152400_add_work_log`.
- `src/lib/worklog-service.ts` — create/update/delete, validatie dat order bij bedrijf hoort.
- Actions: `src/app/(beveiligd)/actions/worklog-actions.ts`.
- `/logboek` plus secties op `/bedrijven/[id]` en `/orders/[id]`.
- UI: `work-log-form.tsx`, `work-log-list.tsx`, `work-log-link-fields.tsx`, `work-log-section.tsx`.

**Kanttekening:** filters op `/logboek` zijn een eigen GET-formulier, niet de gedeelde `ListBrowser`/`ListFilterToolbar`. Geen paginatie. Geen tests.

---

## 16. App-wide UX-consistentie (lijst-/filtertaal)

**Status: [DEELS]**

Gedeelde taal bestaat en wordt op de meeste lijsten gebruikt; niet overal.

**Bewijs — consistent**

- `src/components/list/list-browser.tsx`, `list-filter-toolbar.tsx`, `list-pagination.tsx`, `date-range-fields.tsx`.
- `src/lib/list-query.ts`, `src/lib/list-copy.ts` (`listSummary`, “Geen resultaten”).
- Toegepast op: bedrijven, contacten, offertes, orders, medewerkers; leads via `LeadsBrowser` + eigen (rijkere) filterbalk.

**Afwijkend**

- `/logboek` — losse `<form method="get">`, geen `ListBrowser`, geen paginatie.
- `/overzicht` — dashboardkaarten, geen lijsttaal (acceptabel).
- `/producten` — geen lijst/filter (catalogusformulier).

---

## Kwaliteitscheck

Uitgevoerd in deze audit (4 sep 2026):

| Commando | Resultaat |
| --- | --- |
| `pnpm typecheck` (`tsc --noEmit`) | exit 0, geen output |
| `pnpm lint` (`eslint .`) | exit 0; **4 warnings**, 0 errors |
| `pnpm test` (`vitest run`) | **4 files, 27 tests, allen groen** |
| `pnpm exec prisma migrate status` | 7 migraties, schema up to date |

### Lint-warnings

Allemaal in `src/lib/pricing/calculate.ts` (`@typescript-eslint/no-unused-vars`):

- `OptionAvailability`
- `OptionValue`
- `ProductOption`
- `SelectedOption`

### Tests die bestaan

| Bestand | Wat het dekt |
| --- | --- |
| `src/lib/pricing/__tests__/calculate.test.ts` | `calculatePrice` (basis+opties, ECS+luchtvering, korting vóór btw, aantal, draaitafel on-request, 0% btw), `vatOnNet`, `validateConfiguration` (LAS4.1 weigert luchtvering, ECS staat toe, required, onbekend product) |
| `src/lib/deals-query.test.ts` | URL-bouw/parse leads (filters, kanban, export) |
| `src/lib/companies-query.test.ts` | URL-bouw/parse bedrijven, contacten, offertes, orders, staff |
| `src/lib/deal-filter-facets.test.ts` | facet-where negeert eigen dimensie (gemockte Prisma) |

**Niet getest (geen `*.test.ts`):** quote-service, order-service, auth, catalogus-actions, worklog, versievergelijking, `resolveImage`, blob-upload.

MVP noemt “11 tests groen” voor de prijsmodule. De suite is groter (27 totaal); de prijsmodule-tests zitten in `calculate.test.ts` en zijn groen.

---

## Architectuur-integriteit

### (a) Server herberekent altijd met `calculatePrice()` bij opslaan

**Bevestigd voor offertes.** Niet van toepassing voor orders (er is geen order-opslaanpad).

In `src/lib/quote-service.ts`:

- `pricedLine()` (rond regel 341–386) bouwt input, runt `validateConfiguration`, daarna `const price = calculatePrice(input, ctx)`.
- `persistQuoteItems()` gebruikt uitsluitend `pricedLine` voor bedragen en snapshot.
- `createQuote`, `editDraft` en `sendQuote` laden `loadPricingContext(prisma)` en roepen `pricedLine` / `persistQuoteItems` aan. `sendQuote` herberekent opnieuw vóór het vastleggen van de versie.

Client-prijs in `quote-form.tsx` / `quote-line-editor.tsx` is preview; het bindende bedrag komt uit bovenstaande serverpad.

### (b) Offerte-/orderregels bewaren een bevroren config-snapshot

**Bevestigd voor offertes.** Orderregels hebben het veld, maar er is geen code die orders aanmaakt.

- Schema: `Configuration.configSnapshot`, `QuoteItem.configSnapshot`, `QuoteVersionItem.configSnapshot`, `OrderItem.configSnapshot` (allen `Json?`).
- Bij offerte-opslag schrijft `persistQuoteItems` hetzelfde snapshot-object naar `configuration` en `quoteItem` (rond regels 418 en 442).
- Snapshot-vorm: `QuoteConfigSnapshot` in `src/lib/quote-catalog.ts` (product, selections met namen/deltas, volledige `PriceResult`, `computedAt`).

---

## Datacheck (live `trone_seating`)

Read-only query, 4 sep 2026. Seed bevat géén bedrijven/leads; onderstaande records zijn app-data.

### Catalogus-waarden “Geen”

Dit zijn **geen testdata**, maar catalogus-none-waarden uit de seed:

- `air_suspension` → `Geen`
- `climate` → `Geen`

De UI verbergt ze (`isNoneCatalogValue` / `displayOptionValues` in `src/components/configurator/option-groups.ts`). Opruimen zou de “geen keuze”-internstaat breken.

### Records die als verificatie/testdata herkenbaar zijn

| Type | Naam | Actie |
| --- | --- | --- |
| Bedrijf | **Verificatiebedrijf Pijplijn** | opruimen als het geen echte klant is |
| Contact | **Anna Verificatie** | waarschijnlijk bij dat bedrijf; opruimen mee |
| Lead | **Verificatie lead pijplijn** | opruimen |
| Lead | **Verificatie lead heftruck** | opruimen |

### Overige data (niet automatisch testdata)

Niet te beoordelen zonder de eigenaar: bedrijf **Thomas Kolling** (Ommen), contact **Rik TheWebClub** (`rik@thewebclub.nl`), leads **“voor 15 caterpillars”** en **“Jan voorman tuinder”**. 9 offertes, 1 worklog, 0 orders, 0 invoices, 0 customer_users, 1 interne user (`admin@troneseating.nl`).

---

## Migratie-hygiëne

**Additief, init niet later herschreven.**

- `git log` op `prisma/migrations/20260904080039_init/migration.sql`: één commit (`80277d0`, “Fix Prisma 7 CLI and seed so local setup is repeatable”). Geen latere modify-commits op dat bestand.
- Init bevat nog geen `work_log`, `quote_version`, `product_image` of `swatch*`-kolommen; die zitten in latere migraties.
- Latere wijzigingen zijn `ALTER` / `CREATE TABLE` in eigen mappen, inclusief data-backfill voor bestaande offertes → v1.

---

## Wat er nodig is voor een complete MVP

Geprioriteerd. “Blokkeert eerste bruikbare versie” = intern team kan de kernketen klant → offerte → order niet afronden, of kan een offerte niet aan de klant geven.

### Blokkeert een eerste bruikbare versie

1. **Offerte bezorgen** — PDF + (minimaal) mail of een deelbare PDF-link. Zonder dit blijft “versturen” intern.
2. **Offerte → order** — bij geaccepteerde offerte (of gewonnen deal) een order met gekopieerde regels + bevroren snapshots; server opnieuw via `calculatePrice()` of kopie van het bevroren snapshot (bewust kiezen; MVP eist herberekende bindende prijs bij vastleggen).
3. **Productiestatus** — status zetten op de order (NEW → … → DELIVERED) + regels/snapshot tonen op `/orders/[id]`.
4. **Viewer-writes dichtzetten** — als `viewer` echt alleen-lezen moet zijn, alle mutatie-actions rollen-checken. Anders is de rol nutteloos.
5. **Verificatiedata opruimen** — `Verificatiebedrijf Pijplijn`, `Anna Verificatie`, beide “Verificatie lead …” (en eventueel hun offertes, niet in deze query uitgesplitst).

### Nice-to-have / later in fase 1

6. Delete voor bedrijf/contact/lead (of bewuste “archiveren”-keuze).
7. UI voor `CompanyPricing` (klantkorting).
8. Contact-detail / nieuw-contact buiten het bedrijf om, als dat gewenst is.
9. Gedeelde list/filtertaal op `/logboek`.
10. Tests voor `quote-service` (reken + snapshot + versie) en order-aanmaak.
11. Korte codes/slugs in URL’s i.p.v. UUID (conventie MVP §7).
12. **Mollie + Invoice** — alleen als bevestigd is dat Mollie Invoicing het kanaal is (MVP §8 punt 5).
13. **Klantportaal** — `customer_user`-login, historie, herhaalbestelling.

### Fase 2 (MVP zelf: later)

14. Publieke/ingelogde configurator die een `Configuration` als aanvraag het CRM in stuurt. Rekenkern en datamodel staan klaar.

---

## Voorgestelde bouwvolgorde

1. Testdata-opruim (snel, geen code).
2. Viewer-guard op mutations (klein, voorkomt fout gebruik).
3. Offerte-PDF (en optioneel Resend naar contact-e-mail bij `sendQuote`).
4. Order aanmaken uit geaccepteerde offerte; detailpagina met regels + snapshot.
5. Productiestatus wijzigen (action + UI op orderdetail).
6. Tests rond quote-persist + order-from-quote (beschermt de twee harde eisen).
7. CompanyPricing-UI + deletes/archiveren naar behoefte.
8. List-taal op logboek; URL-slugs als er tijd is.
9. Mollie webhook + Invoice-spiegel — ná eigenaarsbesluit.
10. Klantportaal — nádat orders/facturen bestaan, anders is er niets te tonen.
11. Fase 2: publieke configurator.

---

## Niet geverifieerd

- Browser-walkthrough van inloggen, configurator-klikpad, Blob-upload, Resend-mail.
- `prisma migrate deploy` op een lege database (alleen `migrate status` op de bestaande).
- Of de 9 bestaande offertes allemaal een geldige snapshot + versie hebben (migratie backfillt v1; daarna afhankelijkheid van `sendQuote`/`editDraft`).
- Of `Thomas Kolling` / `Rik TheWebClub` / de twee niet-verificatie-leads productie of test zijn.
