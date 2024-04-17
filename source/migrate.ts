import { getDenoPostgresMigrator, loader } from "gruber/mod.ts";
import postgres from "postgres/mod.js";
import { appConfig } from "./config.ts";

export const useDatabase = loader(() => {
  return postgres(appConfig.database.url.toString());
});

if (import.meta.main) {
  const sql = useDatabase();
  const migrator = getDenoPostgresMigrator({
    sql: sql,
    directory: new URL("../migrations/", import.meta.url),
  });

  if (Deno.args.includes("down")) await migrator.down();
  else if (Deno.args.includes("up")) await migrator.up();
  else {
    console.error("Usage:\n  migrator.ts <up|down>");
    Deno.exit(1);
  }

  await sql.end();
}
