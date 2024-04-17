import { definePostgresMigration } from "gruber/mod.ts";

export default definePostgresMigration({
  async up(sql) {
    await sql`
      CREATE TABLE "events" (
        "id" SERIAL PRIMARY KEY,
        "created" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "visitor" VARCHAR(255) NOT NULL,
        "payload" JSONB NOT NULL DEFAULT '{}'::JSONB
      )
    `;

    await sql` CREATE INDEX "events_name" ON "events" ("name") `;
    await sql` CREATE INDEX "events_visitor" ON "events" ("visitor") `;
  },
  async down(sql) {
    await sql` DROP TABLE events `;
    await sql` DROP INDEX "events_name" `;
    await sql` DROP INDEX "events_visitor" `;
  },
});
