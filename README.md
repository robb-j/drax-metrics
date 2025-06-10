# drax-metrics

A minimalistic metrics micro-service app to collect anonymous events on a
website. It's made up of an API to collect the metrics, a simple UI to view them
and a JSON schema to validate events. Things like CORS and authentication should
be done at a higher-level than this container, like a Kubernetes Ingress.

![A screenshot of the DRAX UI showing filtering events](./assets/screenshot.webp)

> Named for [Hugo](https://purl.r0b.io/drax)

## Usage

### Configuration

The container has configuration based on a JSON file, `config.json`, CLI
arguments and environment variables, based on
[Gruber](https://github.com/robb-j/gruber). The configuration is
self-documenting and with the repo checked-out, you can get it with
`deno task config` which outputs something like this:

| name         | type   | flag | variable     | fallback                                   |
| ------------ | ------ | ---- | ------------ | ------------------------------------------ |
| cors.origins | string | ~    | CORS_ORIGINS | *                                          |
| database.url | url    | ~    | DATABASE_URL | postgres://user:secret@localhost:5432/user |
| env          | string | ~    | DENO_ENV     | production                                 |
| meta.name    | string | ~    | APP_NAME     | drax-metrics                               |
| meta.version | string | ~    | APP_VERSION  | 0.1.0                                      |
| server.port  | number | ~    | PORT         | 8000                                       |
| server.url   | url    | ~    | SELF_URL     | http://localhost:8000/                     |

> cors.origins - Mainly for development or local deployments, set to a csv of
> hosts to allow

You could provide a JSON configuration file to override certain fields like
this:

```json
{
  "server": {
    "url": "https://metrics.example.com/",
    "port": 9000
  },
  "database": {
    "url": "postgres://user:really_really_secret@example.com:5432/database"
  }
}
```

### Events schema

To validate the events you want to store, you also provide a
[JSON schema](https://json-schema.org/specification), `schema.json`. Every event
that comes into the server is validated against this schema.

It is recommended to have a top-level `anyOf` operator, like
[./schema.json](./schema.json), then each event type is one of the children of
that. Every event must have a `name` and then any other fields you would like to
record. The API also takes a `visitor` field but this is validated outside of
the schema. you will probably also want to use "required" too.

### Extra arguments

When running the server, there are these extra CLI arguments you might want to
use:

- `--migrate` — run available database migrations

### API

**info** — `GET /api`

Get information about the API and let's you know everything is working

**healthz** — `GET /healthz`

An endpoint to be used as a Kubernetes readiness probe endpoint

**createEvent** — `POST /api/events/:name`

Log a new event in the system. It takes a JSON payload that should have your
custom fields and a `visitor` string value. It returns the new event if it is
useful.

**listTypes** — `GET /api/types`

Lists each event types and the number of events for them. This is only based on
the events in the database and doesn't consult the schema.

**typedEvents** — `GET /api/events/:name`

Gets events of a specific type.

**listVisitors** — `GET /api/visitors`

Lists each unique visitor and the number of events they have triggered.

**visitorEvents** — `GET /api/visitors/:visitor`

Gets all the events belonging to a visitor.

**createVisitor** — `POST /api/visitors`

Generate a unique ID for the `visitor` field. Visitor can be anything, I thought
this might be helpful though?

**meta** — `GET /api/meta`

Fetches aggregations and general information about the metrics stored. You get
the total number of events and a list of types and visitors.

```json
{
  "events": 11,
  "types": ["login", "page_view", "logout"],
  "visitors": ["geoff"]
}
```

**download** — `GET /api/download`

A JSON file for downloading all of the events in the system.

### Client

There is an API client hosted along with the app, once constructed each endpoint
has a same-named method to fetch the JSON with appropriate parameters as method
variables.

```ts
import { DraxClient } from "http://localhost:8000/client.js";

const api = new DraxClient(location.href);

const data = await api.meta();
```

The client is also hosted at `https://esm.r0b.io/drax-client@0.2.0/mod.js`,
replace **0.2.0** with the version you want to recieve.

### UI

If you visit the root URL, `/`, there is a basic app to explore the data in the
[API](#api).

![A screenshot of the DRAX UI showing filtering events](./assets/screenshot.webp)

## Deployment

> WIP

## Development

The main scripts to run are deno tasks, check out the repo locally and run them.

```bash
# cd to/this/folder

# Run the development postgres container on port localhost:5432
docker-compose up -d

# Run the database migrations
deno task migrate up

# Dump config
deno task config

# Run the dev server w/ auto-restart & .env support
deno task dev

# Run for prod
deno task serve
```

**release process**

1. Make sure the `CHANGELOG.md` is up to date
2. Bump the version in `meta.json`
3. Commit the change as `vX.Y.Z`
4. Tag the commit as `vX.Y.Z`
5. Push the commit & tag and it'll build the container.
6. Upload the versioned client & schema into the S3 bucket with `public-read`
   permissions
