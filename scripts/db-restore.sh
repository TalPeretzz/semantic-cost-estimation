#!/usr/bin/env bash
# Load db/snapshot.sql into the running postgres container.
#
# Start the server once first: the tables are created by TypeORM synchronise on
# boot, and this script only inserts rows into them.
#
# Existing rows are deleted first, so a restore is repeatable and does not
# collide on primary keys.
set -euo pipefail

cd "$(dirname "$0")/.."

DB_USER="${POSTGRES_USER:-sce}"
DB_NAME="${POSTGRES_DB:-sce_dev}"
SNAPSHOT="db/snapshot.sql"

if ! docker compose ps --status running --services | grep -qx postgres; then
  echo "postgres container is not running — start it with: docker compose up -d postgres" >&2
  exit 1
fi

missing=$(docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT 4 - count(*) FROM information_schema.tables
   WHERE table_schema='public'
     AND table_name IN ('projects','estimations','signals','evaluation_runs');")

if [ "$missing" != "0" ]; then
  echo "schema not ready — start the API once so TypeORM creates the tables, then rerun" >&2
  exit 1
fi

docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 -q \
  -c "TRUNCATE signals, estimations, evaluation_runs, projects;"

# stdout discarded: the dump's own set_config call prints a result row.
docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 -q < "$SNAPSHOT" > /dev/null

docker compose exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT 'projects' AS table, count(*) FROM projects
   UNION ALL SELECT 'estimations', count(*) FROM estimations
   UNION ALL SELECT 'signals', count(*) FROM signals
   UNION ALL SELECT 'evaluation_runs', count(*) FROM evaluation_runs;"
