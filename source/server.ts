import { serveDir } from "std/http/mod.ts";
import { defineRoute, DenoRouter, HTTPError } from "gruber/mod.ts";
import { runMigrations, useDatabase } from "./migrate.ts";
import { appConfig } from "./config.ts";
import { parseArgs } from "std/cli/parse_args.ts";

const info = defineRoute({
  method: "GET",
  pathname: "/api",
  handler() {
    return Response.json({
      message: "ok",
      meta: appConfig.meta,
    });
  },
});

let appState = "running";
const healthz = defineRoute({
  method: "GET",
  pathname: "/healthz",
  handler() {
    return appState === "terminating"
      ? new Response("terminating", { status: 503 })
      : new Response("ok");
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

const routes = [
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

async function shutdown(server: Deno.HttpServer) {
  console.log("Exiting...");
  appState = "shutdown";
  server.unref();
  // Wait longer in prod for connections to terminate and Load balancers to update
  if (appConfig.env !== "development") {
    await new Promise((r) => setTimeout(r, 5_000));
  }
  Deno.exit();
}

if (import.meta.main) {
  const args = parseArgs(Deno.args, { boolean: ["migrate"] });
  if (args.migrate) await runMigrations("up");

  const router = new DenoRouter({ routes });
  const server = Deno.serve({ port: appConfig.port }, async (request) => {
    const response = await router.getResponse(request);
    console.debug(response.status, request.method.padEnd(5), request.url);
    return response;
  });
  Deno.addSignalListener("SIGINT", () => shutdown(server));
  Deno.addSignalListener("SIGTERM", () => shutdown(server));
}
