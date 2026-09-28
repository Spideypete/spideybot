FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Railway builds must not depend on a stale lockfile.
# npm install resolves package.json/package-lock.json drift while keeping
# production dependencies only.
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "index.cjs"]
