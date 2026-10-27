#!/bin/sh
# Prepara il server autonomo di un'app Next per il rilascio: `.deploy/<app>`.
#
# `output: "standalone"` mette in `.next/standalone` il server e i soli file di
# node_modules che l'app usa davvero (tracciati da Next), ma lascia fuori gli
# asset statici e `public`: vanno copiati accanto a `server.js`, che poi li
# serve da solo. Il risultato è l'unica cosa che entra nell'immagine di
# Railway (vedi railpack.json), invece dell'intero monorepo con i suoi
# node_modules, app mobile compresa.
#
# Uso: sh scripts/stage-standalone.sh web|dashboard|vetro
set -eu

app="$1"
src="apps/$app"
out=".deploy/$app"

rm -rf "$out"
mkdir -p "$(dirname "$out")"
cp -R "$src/.next/standalone" "$out"
cp -R "$src/.next/static" "$out/$src/.next/static"
if [ -d "$src/public" ]; then
  cp -R "$src/public" "$out/$src/public"
fi

echo "standalone di $app pronto in $out ($(du -sh "$out" | cut -f1))"
