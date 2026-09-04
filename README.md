# TRÔNE Seating — Workspace

Interne CRM, offerte/order/factuur en klantportaal voor TRÔNE Seating.
Configurator volgt in fase 2 op de al aanwezige prijsmodule.

Zie `docs/MVP.md` voor de volledige bouwinstructie en `.cursor/rules/trone.md`
voor de projectregels.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Prisma 7 ·
MariaDB SkySQL (via `@prisma/adapter-mariadb`) · Better Auth · Tailwind v4 ·
Zod · Vitest · Vercel.

## Setup

1. `pnpm install`
2. Kopieer `.env.example` naar `.env.local` en vul de SkySQL-gegevens in
   (eigen database `trone_seating` binnen de bestaande service). Voor
   productafbeeldingen: `BLOB_READ_WRITE_TOKEN` uit het Vercel-dashboard
   (Storage → Blob → je store → tab `.env.local`). De huidige store is
   privé; de app serveert beelden via `/api/media` na inloggen.
3. `pnpm prisma:generate`
4. `pnpm prisma:migrate`   (eerste migration aanmaken en draaien)
5. `pnpm seed`             (stages, opties, prijzen, 2 basisproducten)
6. `pnpm test`             (prijsmodule — moet groen zijn)
7. `pnpm dev`

## Wat er al staat

- `src/lib/pricing/` — pure, geteste prijsmodule (single source of truth).
- `prisma/schema.prisma` — volledig datamodel (24 modellen).
- `src/lib/db.ts`, `id.ts`, `number-sequence-service.ts`, `pricing-context.ts`.
- `scripts/seed.ts` — catalogus-seed met echte prijzen.

## Scripts

`dev` · `build` · `start` · `lint` · `typecheck` · `test` · `seed` ·
`prisma:generate` · `prisma:migrate` · `prisma:deploy` · `prisma:validate`
