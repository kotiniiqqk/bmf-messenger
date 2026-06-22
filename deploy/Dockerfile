# Рантайм-образ: один контейнер отдаёт и API, и собранный веб-клиент (SPA).
# Сборка артефактов (api/dist, web) делается заранее; здесь только prod-зависимости.
FROM node:20-alpine
WORKDIR /srv

COPY api/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund

COPY api/dist ./dist
COPY web ./web

ENV NODE_ENV=production PORT=8080 WEB_DIR=/srv/web
EXPOSE 8080
CMD ["node", "dist/src/server.js"]
