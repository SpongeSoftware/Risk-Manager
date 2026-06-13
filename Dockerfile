FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm.toml /app/
WORKDIR /app
RUN pnpm install --frozen-lockfile

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm.toml /app/
WORKDIR /app
RUN pnpm install --frozen-lockfile --prod

FROM base AS build
COPY . /app/
COPY --from=deps /app/node_modules /app/node_modules
WORKDIR /app
RUN pnpm run build

FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
COPY package.json pnpm-lock.yaml /app/
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
COPY --from=build /app/public /app/public
COPY --from=build /app/drizzle /app/drizzle
COPY --from=build /app/app/server/migrate.ts /app/app/server/migrate.ts
COPY --from=build /app/app/server/schema.ts /app/app/server/schema.ts
WORKDIR /app
EXPOSE 3000
ENV PORT=3000
CMD ["pnpm", "run", "start"]
