#!/bin/sh
set -eu

# Railway gives us a single volume mounted at /data, containing what used to
# be ./data (achievements.db, public/*.json, etc).
# The app reads/writes via ./data and public/data, so bridge them:
#   ./data -> /data (when the volume is present)
#   public/data -> ../data/public (resolves to /data/public via the link above)

if [ -d /data ]; then
  mkdir -p /data/public
  if [ -L data ]; then
    : # already linked
  elif [ -d data ]; then
    # First boot with a fresh volume: seed it from the image without overwriting.
    if [ -d data/public ]; then
      for f in data/public/*; do
        [ -e "$f" ] || continue
        base=$(basename "$f")
        [ -e "/data/public/$base" ] || cp -a "$f" "/data/public/$base"
      done
    fi
    if [ -f data/achievements.db ] && [ ! -f /data/achievements.db ]; then
      cp -a data/achievements.db /data/achievements.db
    fi
    rm -rf data
    ln -sfn /data data
  else
    ln -sfn /data data
  fi
else
  # Local dev / build: no volume, just use the repo-local ./data.
  mkdir -p data/public
fi

# public/data must be a symlink, never a real dir (app mutates it a lot and
# Railway only persists one location). Guard against wiping real data.
if [ -e public/data ] && [ ! -L public/data ]; then
  rm -rf public/data
fi
mkdir -p data/public
ln -sfn ../data/public public/data

ls -l data public/data | head -n 20
