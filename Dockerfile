# Self-hosting image: builds the game with Vite and serves dist/ with nginx on port 80, with the save server
# (server/save-server.mjs, plain Node) behind it on /api/. Saves are files under /data: mount a volume there.
#   docker compose up -d              (docker-compose.yml: port, password and the saves volume)
#   docker build -t folded-frontier . && docker run -p 8080:80 -v ff-saves:/data -e FF_PASSWORD=... folded-frontier
# The game still saves in the browser until it talks to the save server (issue #57). Save codes need a secure
# context, so serve it over HTTPS (or use it on localhost).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
RUN apk add --no-cache nodejs su-exec && adduser -D -H -u 1000 ff
ENV FF_DATA=/data FF_PORT=8787 FF_HOST=127.0.0.1 FF_PASSWORD= FF_MAX_MB=16
COPY tools/nginx.conf /etc/nginx/conf.d/default.conf
COPY tools/start.sh /start.sh
COPY server/save-server.mjs /srv/save-server.mjs
COPY --from=build /app/dist /usr/share/nginx/html
VOLUME /data
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -qO- http://127.0.0.1/api/health >/dev/null || exit 1
STOPSIGNAL SIGTERM
ENTRYPOINT ["/start.sh"]
