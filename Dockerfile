FROM denoland/deno:alpine-1.46.3

EXPOSE 8000
WORKDIR /app
USER deno

COPY --chown=deno:deno [".", "/app/"]

RUN deno cache source/*.ts

ENV DENO_ENV production

CMD ["task", "serve"]
