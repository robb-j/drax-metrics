import { parseArgs } from "@std/cli";
import { serveDir } from "@std/http";
import {
  Cors,
  defineRoute,
  FetchRouter,
  getTerminator,
  HTTPError,
} from "gruber/mod.ts";

import { appConfig } from "./config.ts";
import { runMigrations, useDatabase } from "./migrate.ts";

const info = defineRoute({
  method: "GET",
  pathname: "/api",
  handler() {
    return Response.json({
      message: "ok",
      meta: structuredClone(appConfig.meta),
    });
  },
});

const healthz = defineRoute({
  method: "GET",
  pathname: "/healthz",
  handler() {
    return arnie.getResponse();
  },
});

const createEvent = defineRoute({
  method: "POST",
  pathname: "/api/events/:name",
  async handler({ request, params }) {
    const sql = useDatabase();

    const { visitor, ...payload } = await request.json();

    if (typeof visitor !== "string") throw HTTPError.badRequest("bad visitor");

    if (!appConfig.validateEvent({ name: params.name, ...payload })) {
      // console.error(appConfig.validateEvent.errors);
      throw HTTPError.badRequest("bad payload");
    }

    const [record] = await sql`
      INSERT INTO events (name, visitor, payload)
      VALUES (${params.name}, ${visitor}, ${sql.json(payload)})
      RETURNING id, created, name, visitor, payload
    `;

    return Response.json(record);
  },
});

const listTypes = defineRoute({
  method: "GET",
  pathname: "/api/types",
  async handler() {
    const sql = useDatabase();
    const records = await sql`
      SELECT name, count(*) AS count
      FROM events
      GROUP BY name
      ORDER BY count DESC
    `;
    return Response.json(records);
  },
});

const typedEvents = defineRoute({
  method: "GET",
  pathname: "/api/events/:name",
  async handler({ params }) {
    const sql = useDatabase();
    const records = await sql`
      SELECT id, created, name, visitor, payload
      FROM events
      WHERE name = ${params.name}
      ORDER BY created DESC
    `;
    return Response.json(records);
  },
});

const listVisitors = defineRoute({
  method: "GET",
  pathname: "/api/visitors",
  async handler() {
    const sql = useDatabase();
    const records = await sql`
      SELECT visitor, count(*) AS count
      FROM events
      GROUP BY visitor
      ORDER BY count DESC
    `;
    return Response.json(records);
  },
});

const visitorEvents = defineRoute({
  method: "GET",
  pathname: "/api/visitors/:visitor",
  async handler({ params }) {
    const sql = useDatabase();
    const records = await sql`
      SELECT id, created, name, visitor, payload
      FROM events
      WHERE visitor = ${params.visitor}
      ORDER BY created DESC
    `;
    return Response.json(records);
  },
});

const createVisitor = defineRoute({
  method: "POST",
  pathname: "/api/visitors",
  handler() {
    return Response.json({ id: crypto.randomUUID() });
  },
});

const meta = defineRoute({
  method: "GET",
  pathname: "/api/meta",
  async handler() {
    const sql = useDatabase();

    const events = await sql`
      select count(*) as count from events;
    `;
    const types = await sql`
      select distinct name from events;
    `;
    const visitors = await sql`
      select distinct visitor from events;
    `;

    return Response.json({
      events: parseInt(events[0].count),
      types: types.map((t) => t.name),
      visitors: visitors.map((v) => v.visitor),
    });
  },
});

const download = defineRoute({
  method: "GET",
  pathname: "/api/download",
  async handler() {
    const sql = useDatabase();
    const records = await sql`SELECT * from events`;
    return Response.json(records);
  },
});

const publicFiles = defineRoute({
  method: "GET",
  pathname: "*",
  handler({ request }) {
    return serveDir(request, { fsRoot: "public", quiet: true });
  },
});

const preflight = defineRoute({
  method: "OPTIONS",
  pathname: "*",
  handler({ request }) {
    console.log(request.headers);
    return new Response(undefined);
  },
});

const cors = new Cors({
  origins: appConfig.cors.origins.split(",").filter((h) => h.trim()),
});

const arnie = getTerminator({
  timeout: appConfig.env === "development" ? 0 : 5_000,
});

const routes = [
  preflight,
  info,
  healthz,
  createEvent,
  createVisitor,
  listTypes,
  listVisitors,
  visitorEvents,
  typedEvents,
  meta,
  download,
  publicFiles,
];

if (import.meta.main) {
  const sql = useDatabase();

  const args = parseArgs(Deno.args, { boolean: ["migrate"] });
  if (args.migrate) await runMigrations("up");

  const router = new FetchRouter({
    routes,
    log: true,
    cors,
    errorHandler: (err, request) => {
      console.error("[http error] %s %s", request.method, request.url, err);
    },
  });

  const server = Deno.serve(
    { port: appConfig.server.port },
    (request) => router.getResponse(request),
  );

  arnie.start(async () => {
    await server.shutdown();
    await sql.end();
  });
}
