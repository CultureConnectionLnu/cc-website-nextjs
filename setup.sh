#!/bin/sh

# Create symbolic links from /data/public to /public/data
# This is important because railway only lets us mount one directory as a volume
# but we need /data and /public/data to both have persistent dynamic data.
rm -rf public/data
mkdir -p data/public
ln -sfn ../data/public public/data
