# Self-hosting image: builds the game with Vite and serves the static dist/ with nginx on port 80.
#   docker build -t folded-frontier . && docker run -p 8080:80 folded-frontier
# Saves still live in the player's browser (server-side saves are issue #7). Save codes need a secure
# context, so serve it over HTTPS (or use it on localhost).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY tools/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
