# drax-metrics

A minimalistic metrics micro-service container to collect anonymous events on a website,
It's made up of an API to collect the metrics and a simple UI to view them.
Things like CORS and authentication should be done at a higher-level than this container, like a Kubernetes Ingress.

![A screenshot of the DRAX UI showing filtering events](./assets/screenshot.webp)

> Named for [Hugo](https://purl.r0b.io/drax)

## Usage

### Configuration

The container has configuration based on a JSON file, `config.json`, CLI arguments and environment variables, based on [Gruber](https://github.com/robb-j/gruber).
The configuration is self-documenting and with the repo checked-out, you can get it with `deno task config` which outputs something like this:

| name         | type   | flag   | variable     | fallback                                   |
| ------------ | ------ | ------ | ------------ | ------------------------------------------ |
| database.url | url    | ~      | DATABASE_URL | postgres://user:secret@localhost:5432/user |
| env          | string | ~      | DENO_ENV     | production                                 |
| meta.name    | string | ~      | APP_NAME     | drax-metrics                               |
| meta.version | string | ~      | APP_VERSION  | 0.0.0                                      |
| port         | number | --port | APP_PORT     | 8000                                       |
| selfUrl      | url    | ~      | SELF_URL     | http://localhost:8000/                     |

You could provide a JSON configuration file to override certain fields like this:

```json
{
  "port": 9000,
  "selfUrl": "https://metrics.example.com/",
  "database": {
    "url": "postgres://user:really_really_secret@example.com:5432/database"
  }
}
```

### Events schema

To validate the events you want to store, you also provide a [JSON schema](https://json-schema.org/specification), `schema.json`.
Every event that comes into the server is validated against this schema.

It is recommended to have a top-level `anyOf` operator, like [./schema.json](./schema.json), then each event type is one of the children of that. Every event must have a `name` and then any other fields you would like to record. The API also takes a `visitor` field but this is validated outside of the schema.

### API

**info** — `GET /info`

Get information about the API and let's you know everything is working

**healthz** — `GET /healthz`

An endpoint to be used as a Kubernetes readiness probe endpoint

**create event** — `POST /events/:name`

Log a new event in the system. It takes a JSON payload that should have your custom fields and a `visitor` string value. It returns the new event if it is useful.

**list types** — `GET /types`

Lists each event types and the number of events for them. This is only based on the events in the database and doesn't consult the schema.

**typed events** — `GET /events/:name`

Gets events of a specific type.

**list visitors** — `GET /visitors`

Lists each unique visitor and the number of events they have triggered.

**visitor events** — `GET /visitor/:visitor`

Gets all the events belonging to a visitor.

**create visitor** — `POST /visitors`

Generate a unique ID for the `visitor` field. Visitor can be anything, I thought this might be helpful though?

**meta** — `GET /meta`

Fetches aggregations and general information about the metrics stored.
You get the total number of events and a list of types and visitors.

```json
{
  "events": 11,
  "types": ["login", "page_view", "logout"],
  "visitors": ["geoff"]
}
```

**download** — `GET /download`

A JSON file for downloading all of the events in the system.

### UI

If you visit the root URL, `/`, there is a basic app to explore the data in the [API](#api).

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
