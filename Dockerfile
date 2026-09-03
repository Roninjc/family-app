# Build stage: PUBLIC_ vars are inlined at build time ($env/static/public).
FROM node:22-alpine AS builder
WORKDIR /app

ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_ANON_KEY
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL \
    PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build && yarn install --production --frozen-lockfile --ignore-scripts

# Runtime stage
FROM node:22-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/build build/
COPY --from=builder /app/node_modules node_modules/
COPY package.json ./

EXPOSE 3000
HEALTHCHECK --interval=2s --timeout=2s --start-period=2s --retries=3 CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/login').then(response => process.exit(response.status < 500 ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "build"]
