FROM denoland/deno:alpine-1.42.1

EXPOSE 8000
WORKDIR /app
USER deno

COPY --chown=deno:deno [".", "/app/"]

RUN deno cache source/*.ts

CMD ["task", "serve"]
