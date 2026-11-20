# Semantic Cost Estimation

Hybrid software effort estimation combining the **COCOMO II Post-Architecture** parametric model with **LLM-extracted qualitative signals**.

Master's thesis research tool. Claude reads a natural-language project description and rates fifteen qualitative signals; those ratings drive the COCOMO II exponent and effort multipliers, and the arithmetic stays deterministic and inspectable. GPT-4o-mini re-rates the same description as an independent cross-model check. Accuracy against the baseline is reported as MAE / RMSE / MAPE.

---

## Architecture

```
Browser (Next.js 14, port 3000)
  │ HTTP/JSON REST  →  /api/v1
  ▼
NestJS API (port 3001)
  ├─ ProjectsModule     — CRUD for software projects
  ├─ EstimationModule   — COCOMO II + LLM pipeline orchestration
  ├─ LlmModule          — Claude (signal extraction) and GPT-4o-mini (cross-model check)
  ├─ SignalsModule      — persist the 15 signal ratings and rationales per estimation
  ├─ AdjustmentModule   — compute B from the scale factors and E_final = E_nom × ∏ A_i
  ├─ EvaluationModule   — MAE / RMSE / MAPE for baseline vs hybrid
  ├─ DatasetModule      — bulk CSV import of project records
  └─ HealthModule       — liveness probe
  │ TCP 5434
  ▼
PostgreSQL 16
  │ HTTPS  (LlmModule only)
  ├─▶ Anthropic Claude API
  └─▶ OpenAI API (gpt-4o-mini)
```

---

## Running it end to end

Everything below is a fresh clone to a working estimate. It takes about five minutes, most of it `pnpm install`.

### Prerequisites

| Tool | Version | Check with |
|------|---------|------------|
| Node.js | ≥ 20 | `node -v` |
| pnpm | ≥ 9 | `pnpm -v` — install via `npm i -g pnpm` |
| Docker + Compose | any current | `docker compose version` |
| Anthropic API key | — | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI API key | — | [platform.openai.com](https://platform.openai.com/api-keys) |

Both API keys are **required**. The server resolves them while constructing its
providers, so it will refuse to start if either is missing.

### 1 — Clone and install

```bash
git clone https://github.com/TalPeretzz/semantic-cost-estimation.git
cd semantic-cost-estimation
pnpm install
```

### 2 — Configure the server

```bash
cp .env.example apps/server/.env
```

Open `apps/server/.env` and paste in your two API keys. The PostgreSQL values
already match `docker-compose.yml`, so leave them alone unless you change the
compose file too.

### 3 — Configure the client

```bash
cp apps/client/.env.example apps/client/.env.local
```

One variable, `NEXT_PUBLIC_API_URL`, and the default is correct for local work.
Skip this step only if you are happy with that default — the client falls back
to the same value in code.

### 4 — Start PostgreSQL

```bash
docker compose up -d postgres
```

Port **5434** on the host, not 5432, so it will not collide with a PostgreSQL
you already run. Confirm it is up:

```bash
docker compose ps
```

### 5 — Build the shared packages

The server and client both import `@sce/types` and `@sce/constants` from `dist/`,
so these must be built once before anything else will compile:

```bash
pnpm --filter @sce/types build
pnpm --filter @sce/constants build
```

### 6 — Start both apps

```bash
pnpm dev
```

This runs the API and the client together. Tables are created automatically on
first boot via TypeORM synchronise.

| Service | URL |
|---------|-----|
| Next.js client | http://localhost:3000 |
| NestJS API | http://localhost:3001/api/v1 |
| Swagger docs | http://localhost:3001/api/v1/docs |
| Health probe | http://localhost:3001/api/v1/health |
| pgAdmin | http://localhost:5050 (after `docker compose up -d pgadmin`) |

### 7 — Load the data

Two ways in, depending on what you want.

**The recorded research data** — every estimation behind the thesis:

```bash
pnpm db:restore
```

Loads `db/snapshot.sql`: 22 project scenarios, 139 estimation runs, 1,061
signal ratings and one evaluation run. The analytics and evaluation screens
have something to show immediately, and the numbers reported in the thesis can
be traced back to the rows that produced them. See
[The committed snapshot](#the-committed-snapshot) for what is in it.

The restore truncates the four tables first, so it is repeatable. It needs the
tables to exist — start the API once (step 6) and TypeORM creates them.

**A clean start** — scenarios only, no estimations:

```bash
pnpm --filter server seed
```

Inserts 20 constructed project scenarios, each with a description, a size in
KLOC, and an assigned reference effort value used as the comparison target. The
script is idempotent — rerunning it skips scenarios already present. Choose
this if you want to generate your own runs; the analytics screens stay empty
until you do.

### 8 — Run an estimation

Open http://localhost:3000/projects, pick a scenario, and press **Run
Estimation**. A run takes roughly 20 seconds; most of it is the two LLM calls.
The result screen shows the baseline, the hybrid estimate, the error against the
reference value, every signal with the model's stated reason for it, and the
full formula trace.

From there:

- **`/analytics`** — predicted vs actual across all runs, per-project run
  history, signal level distribution, and cross-model divergence per signal.
- **`/evaluation`** — MAE / RMSE / MAPE for baseline vs hybrid over every
  scenario with a reference value.
- **`/dataset`** — bulk CSV import.

### If something does not work

| Symptom | Cause |
|---------|-------|
| Server exits with `Environment validation failed` | A variable is missing from `apps/server/.env` — the message names it |
| Every page shows a fetch error | The API is not running, or `NEXT_PUBLIC_API_URL` lacks the `/api/v1` suffix |
| `Cannot find module '@sce/types'` | Step 5 was skipped, or a package changed and needs rebuilding |
| `ECONNREFUSED ... 5434` | The postgres container is not up — `docker compose up -d postgres` |
| `pnpm db:restore` says the schema is not ready | The API has not booted yet, so TypeORM has not created the tables. Run step 6 once |
| Estimation starts but no cross-model check appears | The OpenAI call failed; the run still completes. Check the server log for `GPT validation failed` |

---

## CSV import format

Upload project records via `/dataset` or `POST /api/v1/datasets/import`:

```csv
name,description,domain,size_kloc,team_size,experience_level,actual_effort_pm
Project A,A payment gateway system.,organic,15,6,nominal,120
Project B,An analytics pipeline.,semi-detached,30,10,high,
```

| Column | Required | Values |
|--------|----------|--------|
| `name` | yes | any string |
| `description` | yes | free text |
| `domain` | yes | `organic` \| `semi-detached` \| `embedded` |
| `size_kloc` | yes | positive number |
| `team_size` | yes | integer 1–500 |
| `experience_level` | yes | `very_low` \| `low` \| `nominal` \| `high` \| `very_high` |
| `actual_effort_pm` | no | positive number — required for a record to count in the evaluation |

---

## The committed snapshot

`db/snapshot.sql` is the project's actual working database, committed so the
results are inspectable rather than merely described.

| Table | Rows |
|-------|------|
| `projects` | 22 |
| `estimations` | 139 — 137 completed, 1 failed, 1 interrupted mid-run |
| `signals` | 1,061 |
| `evaluation_runs` | 1 |

Data only. The schema belongs to TypeORM's synchronise, so dumping it here
would duplicate it and drift from the entities. Written with
`--column-inserts`, so the restore does not depend on column order and each row
is its own line in a diff.

Worth knowing before you read it:

- **These are all the runs, not a curated subset.** The framework changed over
  the course of the research — prompts, the signal set, the calculation — so
  the table spans several configurations and shows a wider spread than the
  figures reported in the thesis, which come from one of them.
- **22 projects, while `seed.ts` holds 20.** Two were added directly through
  the UI and never made it back into the seed script: *Internal HR Leave
  Management Portal* and *Predictive Maintenance Platform for Industrial IoT*,
  the latter without a reference effort value.
- **The scenarios are constructed, not observed.** Descriptions and reference
  effort values were authored together, which carries a circularity risk — the
  thesis states this directly in its limitations.
- No credentials are stored. `normalizedText` holds the project description and
  the `jsonb` columns hold computed values; LLM requests are rebuilt at render
  time rather than persisted.

To refresh it after generating new runs:

```bash
pnpm db:snapshot
```

---

## Running tests

```bash
# Server unit tests
pnpm --filter server test

# With coverage — thresholds are enforced at 80% across the board
pnpm --filter server test:cov

# TypeScript check across every workspace
pnpm typecheck
```

Tests need `@sce/types` and `@sce/constants` built (step 5) — Jest maps those
imports straight to `dist/`.

---

## The estimation model

```
Scale factors (5, LLM-rated) → exponent
  B = 0.91 + 0.01 × Σ SF_i
  SF_i ∈ { PREC, FLEX, RESL, TEAM, PMAT }        B ranges 0.91…1.23

Nominal effort
  E_nom = 2.94 × KLOC^B × EAF

Effort multipliers (10, LLM-rated) → adjustment
  ordinal: very_low −3 | low −1 | medium 0 | high +1 | very_high +3
  A_i = 1 + (ordinal × 0.1)
     →  0.70 | 0.90 | 1.00 | 1.10 | 1.30

  A_i ∈ { functional_complexity, architectural_complexity, external_integrations,
          requirement_stability, uncertainty, reliability_requirement,
          platform_complexity, schedule_pressure, data_complexity,
          team_experience_gap }

Final estimate
  E_final = E_nom × ∏ A_i
```

Every rating carries the model's written rationale, and the result screen prints
the whole trace, so an estimate can be read back line by line.

---

## Environment variables

### Server — `apps/server/.env`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | yes | — | Claude API key — extracts the signals |
| `OPENAI_API_KEY` | yes | — | OpenAI API key — gpt-4o-mini cross-model check |
| `POSTGRES_HOST` | yes | — | PostgreSQL host |
| `POSTGRES_PORT` | yes | — | PostgreSQL port (`5434` in the compose file) |
| `POSTGRES_USER` | yes | — | PostgreSQL username |
| `POSTGRES_PASSWORD` | yes | — | PostgreSQL password |
| `POSTGRES_DB` | yes | — | PostgreSQL database name |
| `SERVER_PORT` | no | `3001` | NestJS listen port |
| `NODE_ENV` | no | `development` | `development` \| `production` \| `test` |
| `CORS_ORIGIN` | no | `http://localhost:3000` in development, CORS disabled in production | Allowed CORS origin |

Required variables are enforced at startup by `config/env.validation.ts`; a
missing one names itself in the error.

### Client — `apps/client/.env.local`

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | no | `http://localhost:3001/api/v1` | API base URL, including the `/api/v1` prefix |

### pgAdmin — only for `docker compose up -d pgadmin`

| Variable | Default |
|----------|---------|
| `PGADMIN_EMAIL` | `admin@sce.local` |
| `PGADMIN_PASSWORD` | `admin` |
