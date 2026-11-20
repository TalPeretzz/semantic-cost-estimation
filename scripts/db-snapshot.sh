#!/usr/bin/env bash
# Regenerate db/snapshot.sql from the running postgres container.
#
# Data only — the schema is owned by TypeORM's synchronise, so dumping it here
# would duplicate it and drift from the entities.
#
# --column-inserts rather than COPY: TypeORM creates columns in entity order,
# which need not match the order in this dump. Naming every column makes the
# restore independent of that, and gives one row per line for readable diffs.
set -euo pipefail

cd "$(dirname "$0")/.."

DB_USER="${POSTGRES_USER:-sce}"
DB_NAME="${POSTGRES_DB:-sce_dev}"
OUT="db/snapshot.sql"

if ! docker compose ps --status running --services | grep -qx postgres; then
  echo "postgres container is not running — start it with: docker compose up -d postgres" >&2
  exit 1
fi

docker compose exec -T postgres pg_dump \
  -U "$DB_USER" -d "$DB_NAME" \
  --data-only --column-inserts --no-owner --no-privileges \
  | grep -v '^\\\(un\)\?restrict ' \
  > "$OUT"
# The \restrict pair pg_dump emits carries a token regenerated on every run, so
# it would churn the diff, and older psql clients reject the meta-command.

printf '%s rows in %s\n' "$(grep -c '^INSERT INTO' "$OUT")" "$OUT"
