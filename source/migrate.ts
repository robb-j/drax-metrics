import { getPostgresMigrator, loader } from "gruber/mod.ts";
import postgres from "postgres/mod.js";
import { appConfig } from "./config.ts";

export const useDatabase = loader(() => {
  return postgres(appConfig.database.url.toString());
});

export async function runMigrations(direction: "up" | "down") {
  const sql = useDatabase();
  const migrator = getPostgresMigrator({
    sql: sql,
    directory: new URL("../migrations/", import.meta.url),
  });

  await migrator[direction]();

  await sql.end();
}

if (import.meta.main) {
  if (Deno.args.includes("down")) await runMigrations("down");
  else if (Deno.args.includes("up")) await runMigrations("up");
  else {
    console.error("Usage:\n  migrator.ts <up|down>");
    Deno.exit(1);
  }
}
