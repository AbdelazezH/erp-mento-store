import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Use DIRECT_URL for migrations (no pgBouncer pooler — it blocks DDL).
    // DIRECT_URL = same as DATABASE_URL but remove "-pooler" from the hostname.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  },
});
