import { config } from "dotenv";
config({ path: ".env.local" });
import { defineConfig, env } from "prisma/config";

// Prisma CLI-config. Migrations gebruiken DATABASE_URL; de app-runtime
// gebruikt de losse DATABASE_* host-vars via de MariaDB-adapter (src/lib/db.ts).
// Op Vercel ontbreekt DATABASE_URL vaak; generate bouwt die dan uit DATABASE_*.
function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const host = process.env.DATABASE_HOST;
  const port = process.env.DATABASE_PORT ?? "3306";
  const database = process.env.DATABASE_NAME;
  const user = process.env.DATABASE_USER;
  const password = process.env.DATABASE_PASSWORD;
  if (host && database && user && password) {
    const auth = `${encodeURIComponent(user)}:${encodeURIComponent(password)}`;
    return `mysql://${auth}@${host}:${port}/${database}?sslaccept=accept_invalid_certs`;
  }

  return env("DATABASE_URL");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
