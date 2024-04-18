import { getDenoConfiguration } from "gruber/mod.ts";
import meta from "../meta.json" with {type:'json'}

// https://github.com/ajv-validator/ajv/issues/2132
import _Ajv from "ajv";
const ajv = new _Ajv.default()

const config = getDenoConfiguration();

const appStruct = config.object({
  env: config.string({ variable: "DENO_ENV", fallback: "production" }),
  port: config.number({ variable: "APP_PORT", flag: "--port", fallback: 8000 }),
  meta: config.object({
    name: config.string({ variable: 'APP_NAME', fallback: meta.name }),
    version: config.string({ variable: 'APP_VERSION', fallback: meta.version })
  }),
  selfUrl: config.url({
    variable: "SELF_URL",
    fallback: "http://localhost:8000", 
  }),
  database: config.object({
    url: config.url({
      variable: "DATABASE_URL",
      fallback: "postgres://user:secret@localhost:5432/user",
    }),
  }),
  cors: config.object({
    origins: config.string({ variable: 'CORS_ORIGINS',fallback: '*' }),
  })
});

export type AppConfig = ReturnType<typeof getConfig>

export async function getConfig() {
  const appConfig = await config.load(
    new URL("../config.json", import.meta.url),
    appStruct
  );
  const eventsSchema = JSON.parse(
    await Deno.readTextFile(new URL('../schema.json',import.meta.url))
  )

  const validateEvent = ajv.compile(eventsSchema)

  return { ...appConfig, validateEvent }
}

export const appConfig = await getConfig()

if (import.meta.main) {
  console.log(config.getUsage(appStruct));
  console.log();
  console.log("Current:");
  console.log(JSON.stringify(appConfig, null, 2));
}
