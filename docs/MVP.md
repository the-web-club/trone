# TRÔNE Seating — Workspace MVP

Interne CRM + offerte/order/factuur + klantportaal voor TRÔNE Seating.
Configurator volgt in fase 2 en plugt in op de al aanwezige prijsmodule.

Dit document is de bouwinstructie. Het beschrijft de stack, de architectuur,
de fasering en de conventies. De codebase bevat al een bewezen kern
(prijsmodule met tests, Prisma-schema, DB-client, seed). Bouw daarop verder.

---

## 1. Wat dit is en wat het niet is

TRÔNE is één bedrijf met veel klanten. Dit is dus GEEN multi-tenant systeem
zoals crm.thewebclub.nl. `Company` is een klant, geen tenant. Er is geen
`organizationId` op alles; de enige isolatie die telt is: een ingelogde
klant ziet alleen data van zijn eigen `companyId`.

Twee gebruikerspopulaties, bewust gescheiden:

1. Interne gebruikers (TRÔNE-team) — Better Auth, tabel `user`. Rollen
   admin / user / viewer. Zij gebruiken het CRM.
2. Klantgebruikers — tabel `customer_user`, meerdere per bedrijf. Zij
   gebruiken alleen het klantportaal (orderhistorie, offertes, facturen,
   herhaalbestelling). Zij zien nooit het CRM.

---

## 2. Stack

Overgenomen van crm.thewebclub.nl (bewezen, en het is de huisstandaard):

1. Next.js 16, App Router, React 19, TypeScript strict.
2. Prisma 7 met generator `prisma-client`, output `src/generated/prisma`.
   Datasource provider `mysql`; runtime MariaDB via `@prisma/adapter-mariadb`.
3. MariaDB SkySQL (serverless, europe-west2), eigen database `trone_seating`
   binnen de bestaande service. Runtime via losse `DATABASE_*` host-vars,
   TLS aan, `connectionLimit: 5`. `DATABASE_URL` alleen voor de Prisma CLI.
4. Better Auth 1.6.x (`emailAndPassword`, `disableSignUp: true`) voor
   interne gebruikers.
5. Tailwind v4 (tokens in `@theme`, geen `tailwind.config.js`), shadcn
   base-nova + Base UI, Lucide, CVA + `cn()`. Neem de designtokens van
   crm.thewebclub.nl over (grijs-schaal, radius, spacing, Inter Tight,
   sidebar 200 / topbar 52 / content-max 1200).
6. Zod voor validatie. Anders dan crm.thewebclub.nl zetten we Zod CENTRAAL:
   configuratie-schema's zijn Zod, en draaien client- én server-side.
7. Resend voor transactionele mail. Vitest voor tests. Vercel (lhr1) voor
   hosting. ESLint (`eslint-config-next`), geen Prettier.

Bewust anders dan crm.thewebclub.nl:

1. Single-tenant (zie §1), dus geen tenant-framework.
2. Dubbele auth-populatie (intern + klant).
3. Configurator als isomorfe prijsmodule (zie §4) — bestaat nog niet in
   crm.thewebclub.nl.

---

## 3. Wat er al staat in deze repo

Bouw hierop verder; niet opnieuw uitvinden.

1. `src/lib/pricing/` — pure, isomorfe prijsmodule. `calculatePrice()` en
   `validateConfiguration()`. 11 tests groen (`pnpm test`). Dit is de single
   source of truth voor prijs. CRM-offertes, orders en straks de configurator
   rekenen ALLEMAAL hiermee. Raak de rekenlogica niet aan zonder de tests.
2. `prisma/schema.prisma` — 24 modellen, 6 enums, in crm.thewebclub.nl-
   conventies. Structureel gevalideerd.
3. `src/lib/db.ts` — Prisma-client met MariaDB-adapter.
4. `src/lib/id.ts` — `createId()` (UUID) en `createShortCode()`.
5. `src/lib/number-sequence-service.ts` — `nextNumber()` met row-lock, voor
   order-/offertenummers (`2026-00001`, `OFF202600001`).
6. `src/lib/pricing-context.ts` — laadt de catalogus uit de DB en mapt naar
   de pure `PricingContext`.
7. `scripts/seed.ts` — vult stages, leadbronnen, nummerreeksen, de 20
   optie-assen met prijzen, en de 2 basisproducten met availability.

---

## 4. De prijsmodule (kern — lees dit goed)

De configurator is het architectuurrisico van dit project. De oplossing:
één pure module die op server EN client identiek rekent.

Principe:

1. `PricingContext` = de hele catalogus (producten, opties, waarden,
   availability), als platte data zonder Prisma-types.
2. `calculatePrice(input, ctx)` is puur: zelfde input → zelfde output, geen
   IO. De configurator draait hem bij elke muisklik client-side voor de
   live prijs. De server draait hem opnieuw bij het vastleggen van een
   offerte/order — dat is de bindende berekening.
3. Nooit de client-prijs vertrouwen als eindbedrag. De server herberekent
   met dezelfde `ctx` en dezelfde `input`, en dat resultaat gaat de offerte
   in. De config-snapshot (JSON) bevriest de keuzes + prijs op dat moment,
   zodat latere prijswijzigingen bestaande offertes/orders niet raken.

Rekenregels die al geïmplementeerd en getest zijn:

1. Eindprijs per stuk = basisprijs + som van optie-meerprijzen.
2. Climate-combinatie is een VASTE waarde (€550), niet de som van
   verwarming + koeling.
3. Klantkorting is een percentage op company-niveau, toegepast VÓÓR btw.
4. BTW op totaalniveau, tarief o.b.v. klantlocatie (`Company.vatRate`,
   default 21, 0 voor verlegd/buitenland).
5. Draaitafel = "prijs op aanvraag": telt niet mee in de prijs, maar zet een
   flag (`hasOnRequest` + `onRequestOptions`) zodat de offerte een
   "n.t.b. door productspecialist"-regel toont.
6. Luchtvering (TS-serie) alleen beschikbaar bij ECS; `validateConfiguration`
   weigert het bij LAS4.1.

---

## 5. Datamodel in het kort

Catalogus: 2 basisproducten (ECS €2555 statisch, LAS4.1 €2875 luchtgeveerd).
De website-modellen (High/Low Back, Narrow, XXL, Office 24/7, zonder
hoofdsteun, 3-punts) zijn GEEN aparte producten maar combinaties van
product + assen (bediening, rughoogte, breedte, uitvoering, hoofdsteun,
gordel).

20 optie-assen, generiek als `ProductOption` (`SELECT`/`BOOLEAN`) →
`OptionValue` (met `priceDelta`, `priceOnRequest`). Booleans hebben één
`Ja`-waarde. `ProductOptionAvailability` regelt welke optie bij welk model
mag (nu alleen: luchtvering ⇢ ECS).

CRM: `Company` (met `vatRate`) + `Contact`, `Deal` met `DealStage`
(7 stages: Lead → Contact opgenomen → Verkoopgesprek → Offerte → Fysieke
Demo → Gewonnen/Verloren), `LeadSource`, `DealActivity`.

Verkoop: `Quote` + `QuoteItem` (multi-regel, elke regel een `Configuration`),
`Order` + `OrderItem` (productiestatus i.p.v. voorraad), `Invoice`
(Mollie-spiegel). `Configuration` + `ConfigurationItem` bevriezen de keuzes.

Portaal: `CustomerUser` (meerdere per `Company`).

Nummers: `NumberSequence` (orders `2026-00001`, offertes `OFF202600001`).

---

## 6. Fasering

### Fase 0 — projectskelet (start hier)

1. `pnpm install`. Scaffold Next 16 App Router als dat nog niet staat.
2. `.env.local` uit `.env.example`, met de SkySQL-gegevens van de
   `trone_seating`-database.
3. `pnpm prisma:generate`, dan `pnpm prisma:migrate` (eerste migration),
   dan `pnpm seed`. Controleer met `pnpm test` (prijsmodule groen).
4. App-shell overnemen van crm.thewebclub.nl: `(beveiligd)/layout` met
   `requireSession`, `AppSidebar`, `AppTopbar`, tokens, UI-primitieven.
   Nav-items: Overzicht, Leads, Bedrijven, Contacten, Offertes, Orders,
   Producten, Instellingen.

### Fase 1 — CRM + verkoop + portaal (de MVP)

1. Better Auth opzetten (intern), `/inloggen`, `disableSignUp`, bootstrap
   admin via `INITIAL_ADMIN_*`.
2. CRM-CRUD: bedrijven, contacten, leads/deals met pipeline (kanban of
   lijst per stage), activiteitenlog.
3. Offerte bouwen: multi-regel, per regel een configuratie samenstellen via
   dezelfde optie-data, prijs via `calculatePrice` (server herberekent),
   PDF genereren, status (draft/sent/accepted).
4. Offerte → order (gewonnen deal of geaccepteerde offerte wordt order),
   productiestatus beheren.
5. Order → Mollie-factuur aanmaken; `Invoice` spiegelt Mollie-status en
   PDF-link. Webhook voor statusupdates.
6. Klantportaal: `customer_user`-login, orderhistorie, offertes, facturen
   (Mollie-PDF), orderstatus, herhaalbestelling (kopieer order-config naar
   een nieuwe aanvraag/offerte).

### Fase 2 — configurator

Publieke of ingelogde configurator die `PricingContext` ophaalt (cachebaar)
en `calculatePrice` client-side draait voor live prijs + beeld. Genereert
een `Configuration` die als offerteaanvraag het CRM in komt. Geen herbouw
nodig: de rekenkern en het datamodel staan er al.

---

## 7. Conventies (volg crm.thewebclub.nl)

1. Bestanden kebab-case; components PascalCase named exports.
2. Server actions in `src/app/(beveiligd)/actions/*.ts`, `"use server"`.
   Reads via services in `src/lib/*-service.ts`; Prisma alleen server-side
   (`import "server-only"`).
3. Publieke paden NL, geen UUID in de URL (gebruik korte codes/slugs).
4. UI-copy Nederlands; code, modellen en enums Engels.
5. Fouten: gooi `AppError` in lib, actions returnen `{ error }`. Cross-
   klant toegang → 404, geen 403-lek. In het portaal: elke query scoped op
   `companyId` van de ingelogde `customer_user`.
6. Tokens gebruiken, geen losse hex/zinc in UI. Control-hoogte 32px default,
   `rounded-sm` velden, `rounded-md` panels.
7. Tests colocated (`*.test.ts`), pure logica eerst. Raak de prijsmodule niet
   aan zonder de tests groen te houden.

---

## 7b. Deployment (Vercel `tapro/trone`)

Volledig losstaande app: geen gedeelde code of database met
crm.thewebclub.nl, alleen dezelfde stack.

1. Repo: `github.com/the-web-club/trone`. Vercel-project: `tapro/trone`.
2. Regio `lhr1` (`vercel.json`), dicht bij SkySQL `europe-west2`.
3. Zet alle runtime-env-vars uit `.env.example` in Vercel (Production +
   Preview): `DATABASE_HOST/PORT/NAME/USER/PASSWORD`, `DATABASE_ENV`,
   `BETTER_AUTH_SECRET/URL`, `RESEND_*`, `MOLLIE_API_KEY`. `DATABASE_URL`
   alleen nodig als je migrations vanaf CI/Vercel draait; anders lokaal.
4. Serverless-let-op: Vercel-functions + serverless MariaDB met
   `connectionLimit: 5` kan bij piekverkeer de pool uitputten. Voor de
   (latere) publieke configurator: cache de `PricingContext` (die verandert
   zelden) zodat live prijsberekening de DB niet per request raakt. Overweeg
   de SkySQL-pooler als het verkeer groeit.

## 8. Openstaande punten (bij de eigenaar navragen)

Deze blokkeren de MVP niet, maar vul ze in zodra bekend:

1. Meerprijs voor breedte (Narrow/XXL) en Office 24/7-uitvoering (nu €0).
2. Montagesteun-uitzonderingen naast Sittab €135 / Linde/Hyster €165, en de
   overige heftruckmerken.
3. Stiksel-opties en of daar meerprijs op zit (nu één waarde "Standaard" €0).
4. Zijn er opties die juist alleen op LAS4.1 of alleen op ECS mogen (naast
   luchtvering)? Zo ja, vul `ProductOptionAvailability`.
5. Bevestig dat Mollie Invoicing het facturatiekanaal is (niet de
   boekhouding). Zo niet: alleen PDF's tonen, geen Mollie-koppeling.
