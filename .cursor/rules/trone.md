# TRÔNE — Cursor projectregels

Lees eerst docs/MVP.md. Kernpunten die je altijd aanhoudt:

1. Single-tenant. `Company` is een klant, geen tenant. Geen `organizationId`
   op alles. Klantportaal-queries ALTIJD scopen op de `companyId` van de
   ingelogde `customer_user`. Cross-klant toegang → 404, nooit 403-lek.

2. Twee auth-populaties. Interne gebruikers via Better Auth (`user`).
   Klanten via `customer_user` (los, portaal-only). Nooit vermengen.

3. Prijs komt ALTIJD uit `src/lib/pricing` (`calculatePrice`). Nooit
   prijzen elders herberekenen of hardcoden. De server herberekent altijd
   na; vertrouw nooit de client-prijs als eindbedrag. Config-snapshot (JSON)
   bevriest keuzes + prijs bij vastleggen. Raak de prijsmodule niet aan
   zonder `pnpm test` groen te houden.

4. Conventies (van crm.thewebclub.nl): bestanden kebab-case; components
   PascalCase; server actions in `(beveiligd)/actions/*.ts` met "use server";
   Prisma server-only via `getPrismaClient()`; interne id's via `createId()`;
   modellen/enums Engels, UI-copy Nederlands; NL-routes zonder UUID in de URL.

5. UI: Tailwind v4 tokens (geen losse hex), shadcn base-nova + Base UI, CVA +
   cn(). Control-hoogte 32px default. Neem de tokens en UI-primitieven van
   crm.thewebclub.nl over.

6. Validatie met Zod, centraal. Configuratie-schema's draaien client- én
   server-side vanuit hetzelfde Zod-schema.

7. Lever complete, deployable bestanden (geen diffs). Audit voor je
   implementeert: begrijp het bestaande bestand voor je het wijzigt.
