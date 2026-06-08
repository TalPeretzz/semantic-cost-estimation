# Semantic Cost Estimation

Hybrid software effort estimation combining **COCOMO II Intermediate** parametric modelling with **LLM-extracted qualitative signals** via the Claude API.

Master's thesis research tool — evaluates whether semantic signals improve estimation accuracy over the COCOMO II baseline (MAE / RMSE / MAPE).

---

## Architecture

```
Browser (Next.js 14)
  │ HTTP/JSON REST
  ▼
NestJS API (port 3001)
  ├─ ProjectsModule     — CRUD for software projects
  ├─ EstimationModule   — COCOMO II + LLM pipeline orchestration
  ├─ LlmModule          — Claude API (only module that touches the SDK)
  ├─ SignalsModule       — persist 5 qualitative signals per estimation
  ├─ AdjustmentModule   — compute E_final = E_nom × ∏ A_i
  ├─ EvaluationModule   — MAE / RMSE / MAPE for baseline vs hybrid
  └─ DatasetModule      — bulk CSV import of historical projects
  │ TCP 5434
  ▼
PostgreSQL 16
  │ HTTPS
  ▼ (LlmModule only)
Anthropic Claude API
```

---

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Docker & Docker Compose
- An [Anthropic API key](https://console.anthropic.com/)

---

## Getting started

### 1 — Clone and install

```bash
git clone https://github.com/TalPeretzz/semantic-cost-estimation.git
cd semantic-cost-estimation
pnpm install
```

### 2 — Environment variables

```bash
cp .env.example apps/server/.env
```

Edit `apps/server/.env` and fill in your values:

```env
# PostgreSQL
POSTGRES_USER=sce
POSTGRES_PASSWORD=sce_secret
POSTGRES_DB=sce_dev
POSTGRES_HOST=localhost
POSTGRES_PORT=5434

# Server
SERVER_PORT=3001
NODE_ENV=development

# Anthropic — required for LLM signal extraction
ANTHROPIC_API_KEY=sk-ant-...
```

### 3 — Start PostgreSQL

```bash
docker compose up -d postgres
```

### 4 — Build shared packages

```bash
pnpm --filter @sce/types build
pnpm --filter @sce/constants build
```

### 5 — Start both apps

```bash
pnpm dev
```

| Service | URL |
|---------|-----|
| Next.js client | http://localhost:3000 |
| NestJS API | http://localhost:3001/api/v1 |
| Swagger docs | http://localhost:3001/api/v1/docs |
| pgAdmin | http://localhost:5050 (after `docker compose up -d pgadmin`) |

---

## Seed data

Insert 20 historical projects with known actual effort for thesis evaluation:

```bash
pnpm --filter server seed
```

Then run estimations on all seeded projects and use the **Evaluation Dashboard** (`/evaluation`) to compute MAE / RMSE / MAPE for baseline vs hybrid.

---

## CSV Import format

Upload historical projects via `/dataset` or `POST /api/v1/datasets/import`:

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
| `actual_effort_pm` | no | positive number — required for evaluation |

---

## Running tests

```bash
# Server unit tests with coverage (must be >= 80%)
pnpm --filter server test:cov

# TypeScript check across all workspaces
pnpm typecheck
```

---

## COCOMO II formula

```
B      = 0.91 + 0.01 x sum(SF_i)     (nominal scale factors)
E_nom  = 2.94 x KLOC^B x EAF

Signal ordinal -> A_i factor:
  very_low  -> -3 -> 0.70
  low       -> -1 -> 0.90
  medium    ->  0 -> 1.00
  high      -> +1 -> 1.10
  very_high -> +3 -> 1.30

E_final = E_nom x A_functional x A_architectural x A_integrations x A_stability x A_uncertainty
```

---

## Environment variables reference

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | **Required.** Claude API key |
| `POSTGRES_HOST` | — | PostgreSQL host |
| `POSTGRES_PORT` | `5434` | PostgreSQL port |
| `POSTGRES_USER` | — | PostgreSQL username |
| `POSTGRES_PASSWORD` | — | PostgreSQL password |
| `POSTGRES_DB` | — | PostgreSQL database name |
| `SERVER_PORT` | `3001` | NestJS listen port |
| `NODE_ENV` | `development` | `development` \| `production` \| `test` |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` | Client API base URL |
