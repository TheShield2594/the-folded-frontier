#!/bin/sh
# Entrypoint of the self-hosting image (Dockerfile): runs the save server (server/save-server.mjs) as the ff user and
# nginx in front of it. If either one stops, the other is stopped too and the container exits, so Docker's restart
# policy brings both back.
set -e
mkdir -p "$FF_DATA" && chown ff:ff "$FF_DATA"
su-exec ff node /srv/save-server.mjs & SAVE=$!
nginx -g 'daemon off;' & WEB=$!
trap 'kill -TERM $SAVE $WEB 2>/dev/null' TERM INT
while kill -0 $SAVE 2>/dev/null && kill -0 $WEB 2>/dev/null; do sleep 1; done
kill -TERM $SAVE $WEB 2>/dev/null || true
wait
