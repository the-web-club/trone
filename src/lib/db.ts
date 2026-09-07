import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// =====================================================================
// Prisma-client tegen MariaDB SkySQL, via de MariaDB-adapter.
// Conventie overgenomen van crm.thewebclub.nl: losse host-vars i.p.v.
// DATABASE_URL op runtime, TLS aan, kleine connection pool (serverless).
// DATABASE_URL wordt alleen door de Prisma CLI (migrations) gebruikt.
// Eén client per isolate (ook in productie), anders raakt connectionLimit: 5
// uitgeput door een nieuwe pool per getPrismaClient()-aanroep.
// =====================================================================

declare global {
  var __tronePrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const adapter = new PrismaMariaDb({
    host: requireEnv("DATABASE_HOST"),
    port: Number(process.env.DATABASE_PORT ?? 3306),
    database: requireEnv("DATABASE_NAME"),
    user: requireEnv("DATABASE_USER"),
    password: requireEnv("DATABASE_PASSWORD"),
    ssl: true,
    connectionLimit: 5,
  });
  return new PrismaClient({ adapter });
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Ontbrekende env-variabele: ${name}`);
  return v;
}

export function getPrismaClient(): PrismaClient {
  if (!global.__tronePrisma) global.__tronePrisma = createClient();
  return global.__tronePrisma;
}
