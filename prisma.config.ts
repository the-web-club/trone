import { config } from "dotenv";
config({ path: ".env.local" });
import { defineConfig, env } from "prisma/config";

// Prisma CLI-config. Migrations gebruiken DATABASE_URL; de app-runtime
// gebruikt de losse DATABASE_* host-vars via de MariaDB-adapter (src/lib/db.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
