#!/bin/sh
set -eu

mkdir -p data/public

# public/data must be a symlink into the volume, never a real dir
if [ -e public/data ] && [ ! -L public/data ]; then
  rm -rf public/data
fi
ln -sfn ../data/public public/data