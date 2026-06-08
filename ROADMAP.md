# ROADMAP — LLM Framework for Software Project Cost Estimation
# Master's Final Project — Technical Plan

---

## Phase 1: System Understanding

This project builds a hybrid software cost estimation system that combines the classical COCOMO II parametric model with semantic signals extracted by a large language model (Claude API). Traditional estimation models capture measurable structural attributes (lines of code, complexity scale factors) but miss qualitative signals that experienced engineers read from a project description — things like unstable requirements, unusual integration risk, or deep architectural uncertainty.

The pipeline works as follows: a project is described both numerically (size, team, domain parameters) and textually (a free-form description). The textual description is normalized and sent to Claude, which extracts exactly five qualitative signals — functional complexity, architectural complexity, external integrations, requirement stability, and uncertainty. Each signal is mapped to an ordinal value on a five-point scale. Those ordinals are converted to multiplicative adjustment factors that scale the COCOMO II nominal effort up or down. The final effort estimate is compared against both the pure COCOMO baseline and, where available, the actual historical effort to compute MAE, RMSE, and MAPE.

The system is a full-stack web application with no authentication — it is a single-researcher tool. A NestJS API handles data persistence, estimation computation, and LLM orchestration; a Next.js frontend lets users create projects, run estimates, inspect signal breakdowns, and view evaluation dashboards. The backend and frontend are co-located in a pnpm monorepo with shared TypeScript types.

The academic contribution is a reproducible evaluation framework: given a dataset of historical projects with known actual effort, the system computes error metrics for both models, demonstrating whether LLM-derived semantic signals improve estimation accuracy.

---

## Phase 2: Full Technical Architecture Plan

### Architectural Style
Three-tier: browser client → REST API server → PostgreSQL database, with one external dependency (Anthropic Claude API).

### Technology Choices

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Next.js 14 (App Router) | SSR, React ecosystem, TypeScript-first |
| Backend | NestJS 10 | Decorator-based modules, built-in DI, strong TypeScript support |
| ORM | TypeORM | Native NestJS integration, migration system, JSONB column support |
| Database | PostgreSQL 16 | Relational constraints; JSONB for LLM signal payloads |
| API Style | REST | Straightforward for a master's project; easier to document and test |
| LLM | Claude API (claude-3-5-sonnet) | Reliable JSON output; prompt caching available |
| Monorepo | pnpm workspaces | Shared packages/types and packages/constants; single lock file |
| Validation | class-validator + class-transformer (backend); Zod (frontend) | Industry-standard for NestJS |
| Auth | None | Academic single-researcher tool — no login needed |
| Testing | Jest (backend); Vitest + React Testing Library (frontend) | Standard ecosystem choices |

### Data Flow

```
Browser (Next.js)
  │  HTTP/JSON REST
  ▼
NestJS API Server
  ├── ProjectsModule    → project CRUD
  ├── EstimationModule  → orchestrate pipeline
  ├── LlmModule         → Claude API (only module that touches SDK)
  ├── SignalsModule      → persist signal records
  ├── AdjustmentModule  → compute E_final (pure math)
  ├── EvaluationModule  → MAE / RMSE / MAPE
  └── DatasetModule     → bulk CSV import
         │  TCP/5432
         ▼
    PostgreSQL 16
         │
  (LlmModule only)
         │  HTTPS
         ▼
    Anthropic Claude API
```

### Security
- Claude API key in server-side env only — never exposed to client.
- class-validator whitelist mode on all DTOs.
- Rate limiting on LLM endpoints to control API cost.

### Local Dev
- `pnpm dev` at root starts both apps via concurrently.
- PostgreSQL via Docker Compose.
- `.env` files per app, never committed.

---

## Phase 3: Monorepo Folder Structure

```
semantic-cost-estimation/
├── package.json                  # workspace root — scripts only
├── pnpm-workspace.yaml           # declares apps/* and packages/*
├── tsconfig.base.json            # shared compiler options + path aliases
├── .env.example                  # template for all env vars
├── docker-compose.yml            # PostgreSQL + pgAdmin
│
├── apps/
│   ├── server/                   # NestJS backend
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/           # ConfigModule, typed env schema
│   │   │   ├── common/           # guards, interceptors, filters, decorators
│   │   │   ├── database/         # TypeORM DataSource, migrations/
│   │   │   └── modules/
│   │   │       ├── projects/
│   │   │       ├── estimation/
│   │   │       ├── llm/
│   │   │       ├── signals/
│   │   │       ├── adjustment/
│   │   │       ├── evaluation/
│   │   │       └── dataset/
│   │   ├── test/                 # e2e tests (supertest)
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── client/                   # Next.js frontend
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── projects/
│       │   ├── estimation/
│       │   └── evaluation/
│       ├── components/
│       │   ├── ui/               # Button, Card, Badge primitives
│       │   ├── forms/
│       │   ├── charts/
│       │   └── layout/           # Navbar, PageShell
│       ├── lib/                  # api-client.ts, Zod schemas, utils
│       ├── hooks/
│       ├── tsconfig.json
│       └── package.json
│
└── packages/
    ├── types/                    # Shared TS interfaces (api + web)
    │   └── src/
    │       ├── project.types.ts
    │       ├── estimation.types.ts
    │       ├── signals.types.ts
    │       └── index.ts
    └── constants/                # COCOMO II values, ordinal map
        └── src/
            ├── cocomo.constants.ts
            ├── signals.constants.ts
            └── index.ts
```

### Folder Responsibilities

| Folder | Responsibility |
|--------|---------------|
| `apps/server/src/modules/` | One subfolder per NestJS module; self-contained with entity, service, controller, DTOs |
| `apps/server/src/common/` | Cross-cutting: HTTP exception filter, logging interceptor, validation pipe |
| `apps/server/src/database/` | TypeORM DataSource singleton; all migration files; seed scripts |
| `apps/server/src/config/` | Typed config service; validates env vars at startup |
| `apps/client/app/` | Next.js App Router route segments and layouts |
| `apps/client/components/ui/` | Presentational primitives — no business logic |
| `apps/client/lib/` | Typed fetch wrapper; Zod schemas mirroring backend DTOs |
| `packages/types/` | Single source of truth for domain interfaces |
| `packages/constants/` | COCOMO II numerical constants and signal ordinal map |

---

## Phase 4: NestJS Backend Module Design

### Module 1: ProjectsModule

**Responsibility:** CRUD for software projects holding COCOMO II parameters and free-text description.

**Entity: Project**
- `id: uuid`, `name: string`
- `inputType: enum` (freetext | structured) — which description format was submitted
- `descriptionText: string | null` — used when `inputType = freetext`
- `descriptionJson: jsonb | null` — used when `inputType = structured`; arbitrary key→freetext-value pairs (e.g. `{ "overview": "...", "tech_stack": "...", "challenges": "..." }`)
- `domain: enum` (organic | semi-detached | embedded)
- `sizeKloc: number`, `teamSize: number`, `experienceLevel: enum`
- `actualEffortPm: number | null`
- `createdAt: Date`, `updatedAt: Date`

**DTOs:**
- `CreateProjectDto` — includes `inputType`; exactly one of `descriptionText` or `descriptionJson` must be present (superRefine cross-field check)
- `UpdateProjectDto` — Partial of CreateProjectDto; same cross-field rule
- `ProjectResponseDto` — full entity + `hasActual: boolean`

**Services:** `ProjectsService` — `create()`, `findAll()`, `findOne(id)`, `update()`, `remove()`

**Controller:** `ProjectsController` (prefix `/projects`)
- `POST /projects`, `GET /projects`, `GET /projects/:id`, `PATCH /projects/:id`, `DELETE /projects/:id`

**Main Methods:**
- `findAll()` — returns all projects, paginated
- `findOne()` — throws 404 if not found

---

### Module 2: EstimationModule

**Responsibility:** Orchestrate the full pipeline — COCOMO II computation, LLM call, signal mapping, adjustment, persistence.

**Entity: Estimation**
- `id: uuid`, `projectId: uuid` (FK), `runAt: Date`
- `cocomoInputs: jsonb`, `nominalEffortPm: number`, `hybridEffortPm: number`
- `status: enum` (pending | running | completed | failed)
- `errorMessage: string | null`

**DTOs:**
- `RunEstimationDto` — `projectId: uuid`
- `EstimationResponseDto` — entity with nested signals and adjustment breakdown

**Services:**
- `EstimationService` — `runEstimation(projectId)`, `findByProject()`, `findOne(id)`
- `CocomoService` — `computeNominalEffort(params): number`

**Controller:** `EstimationController` (prefix `/estimations`)
- `POST /estimations`, `GET /estimations?projectId=`, `GET /estimations/:id`

**Main Methods:**
- `EstimationService.runEstimation()` — loads project → calls CocomoService → calls LlmModule → calls AdjustmentModule → persists → returns full DTO
- `CocomoService.computeNominalEffort()` — implements `E = A × Size^B × EAF` using constants from packages/constants

**COCOMO II Formula:**
```
B = 0.91 + 0.01 × Σ(SF_i)   // scale exponent from 5 scale factors
E_nom = A × Size^B × EAF     // A=2.94, EAF = product of effort multipliers
```

---

### Module 3: LlmModule

**Responsibility:** All interaction with the Anthropic Claude API. No other module touches the SDK.

**No persistent entity** — signals stored by SignalsModule.

**DTOs:**
- `LlmRequestDto` — `normalizedText: string`
- `LlmSignalsDto` — validated five-signal object

**Services:**
- `LlmService` — `extractSignals(text: string): Promise<LlmSignalsDto>`
- `TextNormalizerService` — `normalize(raw: string): string`
- `LlmPromptBuilder` — `buildPrompt(text: string): string`

**Main Methods:**
- `LlmService.extractSignals()` — build prompt → call Claude JSON mode → parse → validate Zod schema → retry up to 3× on failure
- `TextNormalizerService.normalize()` — lowercase, strip URLs/special chars, truncate to ~1500 tokens
- Retry: exponential backoff 1s / 2s / 4s; throws `LlmUnavailableException` after 3 failures

---

### Module 4: SignalsModule

**Responsibility:** Persist LLM-extracted signals and ordinal mappings. One set of five per estimation run.

**Entity: Signal**
- `id: uuid`, `estimationId: uuid` (FK)
- `signalName: enum` (functional_complexity | architectural_complexity | external_integrations | requirement_stability | uncertainty)
- `rawLevel: enum` (very_low | low | medium | high | very_high)
- `ordinal: number` (-3 | -1 | 0 | 1 | 3)
- `llmRationale: string`, `createdAt: Date`

**Services:**
- `SignalsService` — `createBulk(estimationId, signals[])`, `findByEstimation(estimationId)`
- `OrdinalMappingService` — `toOrdinal(level): number`, `toFactor(ordinal): number`

**Main Methods:**
- `OrdinalMappingService.toFactor()` — implements `A_i = 1 + (ordinal × 0.1)`
- `createBulk()` — inserts all five signals in a single transaction

---

### Module 5: AdjustmentModule

**Responsibility:** Compute E_final from nominal effort and five adjustment factors. Pure computation — no database entity.

**DTOs:**
- `AdjustmentInputDto` — `nominalEffortPm`, `signals: SignalResponseDto[]`
- `AdjustmentResultDto` — `productOfFactors`, `hybridEffortPm`, `perSignalBreakdown[]`

**Services:** `AdjustmentService` — `compute(input): AdjustmentResultDto`

**Main Methods:**
- `compute()` — implements `E_final = E_nom × ∏ A_i`; returns product and per-signal breakdown for frontend display

---

### Module 6: EvaluationModule

**Responsibility:** Given projects with known actual effort, compute MAE / RMSE / MAPE comparing baseline vs hybrid.

**Entity: EvaluationRun**
- `id: uuid`, `name: string`, `runAt: Date`
- `projectIds: uuid[]`, `sampleSize: number`
- `baselineMae: number`, `baselineRmse: number`, `baselineMape: number`
- `hybridMae: number`, `hybridRmse: number`, `hybridMape: number`

**Services:**
- `EvaluationService` — `runEvaluation(dto)`, `findAll()`, `findOne(id)`
- `MetricsService` — `computeMAE()`, `computeRMSE()`, `computeMAPE()`

**Controller:** `EvaluationController` (prefix `/evaluations`)
- `POST /evaluations`, `GET /evaluations`, `GET /evaluations/:id`

**Main Methods:**
- `MetricsService.computeMAPE()` — `mean(|actual - predicted| / actual) × 100`
- `runEvaluation()` — validates all projects have `actualEffortPm` and a completed estimation, delegates to MetricsService, persists EvaluationRun

---

### Module 7: DatasetModule

**Responsibility:** Bulk CSV import of historical projects for evaluation experiments.

**No persistent entity** — imports into Project table via ProjectsService.

**DTOs:**
- `ImportDatasetDto` — `file: Express.Multer.File`, `datasetName: string`
- `ImportResultDto` — `imported: number`, `skipped: number`, `errors: string[]`

**Services:** `DatasetService` — `importFromCsv(file)`, `validateRow(row): boolean`

**Controller:** `DatasetController` (prefix `/datasets`)
- `POST /datasets/import` — multipart/form-data

**Main Methods:**
- `importFromCsv()` — stream-parse CSV, validate each row, bulk-insert valid projects, collect errors for invalid rows

---

## Phase 5: Next.js Frontend Page Design

### Page 1: Project List (`/projects`)

**Purpose:** Dashboard of all projects.
**Components:** `ProjectCard`, `ProjectGrid`, `CreateProjectButton`, `EmptyState`, `Pagination`
**Data needed:** `GET /projects` → paginated list
**User flow:** Click card → `/projects/:id` | Click "New Project" → `/projects/new`

---

### Page 2: Project Detail (`/projects/:id`)

**Purpose:** Project attributes, estimation history, trigger new estimation.
**Components:** `ProjectHeader`, `ProjectAttributes`, `DescriptionViewer`, `EstimationHistory`, `RunEstimationButton`, `EstimationResultCard`
**Data needed:** `GET /projects/:id`, `GET /estimations?projectId=`
**User flow:** View details → click "Run Estimation" → `POST /estimations` → result card appears
**Note:** `DescriptionViewer` renders a plain paragraph for `freetext` projects and a labeled key–value list for `structured` projects.

---

### Page 3: Estimation Detail (`/estimation/:id`)

**Purpose:** Deep-dive into a single estimation run — signals, factors, formula trace.
**Components:** `EffortComparisonBar`, `SignalRadarChart`, `SignalBreakdownTable`, `FormulaTrace`, `AdjustmentFactorPill`
**Data needed:** `GET /estimations/:id`
**User flow:** All data loaded at once. Expand signal rows for LLM rationale. Color coding: factor < 1 = green, > 1 = red.

---

### Page 4: Evaluation Dashboard (`/evaluation`)

**Purpose:** Run and view evaluation experiments — aggregate error metrics.
**Components:** `EvaluationForm`, `MetricsComparisonTable`, `PerProjectErrorChart`, `EvaluationRunList`, `ImprovementBadge`
**Data needed:** `GET /projects`, `POST /evaluations`, `GET /evaluations/:id`, `GET /evaluations`
**User flow:** Select projects with `actualEffortPm` → submit → view MAE/RMSE/MAPE table and per-project chart

---

### Page 5: Dataset Import (`/dataset`)

**Purpose:** Upload a CSV of historical projects for bulk import.
**Components:** `CsvDropzone`, `ColumnMappingForm`, `ImportProgress`, `ImportErrorList`
**Data needed:** `POST /datasets/import` (multipart)
**User flow:** Drop file → preview first 5 rows → confirm mapping → submit → view import summary

---

## Phase 6: Domain Model — TypeScript Interfaces

```typescript
// packages/types/src/project.types.ts
export type DomainType = 'organic' | 'semi-detached' | 'embedded';
export type ExperienceLevel = 'very_low' | 'low' | 'nominal' | 'high' | 'very_high';
export type InputType = 'freetext' | 'structured';

export interface Project {
  id: string;
  name: string;
  inputType: InputType;
  descriptionText: string | null;      // populated when inputType = 'freetext'
  descriptionJson: Record<string, string> | null; // populated when inputType = 'structured'
  domain: DomainType;
  sizeKloc: number;
  teamSize: number;
  experienceLevel: ExperienceLevel;
  actualEffortPm: number | null;
  createdAt: string;
  updatedAt: string;
}

// Discriminated union keeps the two input modes mutually exclusive
export type CreateProjectInput = {
  name: string;
  domain: DomainType;
  sizeKloc: number;
  teamSize: number;
  experienceLevel: ExperienceLevel;
  actualEffortPm?: number;
} & (
  | { inputType: 'freetext';    descriptionText: string; descriptionJson?: never }
  | { inputType: 'structured';  descriptionJson: Record<string, string>; descriptionText?: never }
);

// packages/types/src/estimation.types.ts
export type EstimationStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface CocomoInputs {
  scaleFactors: Record<string, number>;
  effortMultipliers: Record<string, number>;
  sizeKloc: number;
  eaf: number;
}

export interface Estimation {
  id: string;
  projectId: string;
  runAt: string;
  status: EstimationStatus;
  cocomoInputs: CocomoInputs;
  nominalEffortPm: number;
  hybridEffortPm: number;
  errorMessage: string | null;
  signals: Signal[];
  adjustmentResult: AdjustmentResult;
}

export interface AdjustmentResult {
  productOfFactors: number;
  hybridEffortPm: number;
  perSignalBreakdown: Array<{
    signalName: SignalName;
    ordinal: number;
    factor: number;
  }>;
}

// packages/types/src/signals.types.ts
export type SignalName =
  | 'functional_complexity'
  | 'architectural_complexity'
  | 'external_integrations'
  | 'requirement_stability'
  | 'uncertainty';

export type SignalLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
export type OrdinalValue = -3 | -1 | 0 | 1 | 3;

export interface Signal {
  id: string;
  estimationId: string;
  signalName: SignalName;
  rawLevel: SignalLevel;
  ordinal: OrdinalValue;
  llmRationale: string;
  adjustmentFactor: number; // 1 + (ordinal × 0.1)
  createdAt: string;
}

export interface LlmSignalPayload {
  functional_complexity: { level: SignalLevel; rationale: string };
  architectural_complexity: { level: SignalLevel; rationale: string };
  external_integrations: { level: SignalLevel; rationale: string };
  requirement_stability: { level: SignalLevel; rationale: string };
  uncertainty: { level: SignalLevel; rationale: string };
}

// packages/types/src/evaluation.types.ts
export interface EvaluationRun {
  id: string;
  name: string;
  runAt: string;
  sampleSize: number;
  projectIds: string[];
  baseline: ErrorMetrics;
  hybrid: ErrorMetrics;
}

export interface ErrorMetrics {
  mae: number;
  rmse: number;
  mape: number;
}

export interface PerProjectEvaluationRow {
  projectId: string;
  projectName: string;
  actualEffortPm: number;
  baselineEffortPm: number;
  hybridEffortPm: number;
  baselineAbsoluteError: number;
  hybridAbsoluteError: number;
}

// packages/types/src/dataset.types.ts
export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}
```

---

## Phase 7: REST API Design

**Base URL:** `/api/v1`
**Auth:** None — open API, single-researcher tool
**Response envelope:** `{ data: T, meta?: PaginationMeta }`
**Error envelope:** `{ statusCode, message, error }`

### Projects

| Method | Path | Description |
|--------|------|-------------|
| POST | `/projects` | Create project. Validates sizeKloc > 0, teamSize 1–500, domain enum. Requires exactly one of descriptionText or descriptionJson. |
| GET | `/projects?page&limit` | List all projects, paginated. |
| GET | `/projects/:id` | Get one. 404 if not found. |
| PATCH | `/projects/:id` | Partial update. Same validations as create. |
| DELETE | `/projects/:id` | Delete. Cascades to estimations and signals. 204 no body. |

### Estimations

| Method | Path | Description |
|--------|------|-------------|
| POST | `/estimations` | Trigger pipeline for `{ projectId }`. Returns Estimation (status: running). |
| GET | `/estimations?projectId=` | List by project. `projectId` is required. |
| GET | `/estimations/:id` | Detail with nested signals and adjustmentResult. |

### Evaluations

| Method | Path | Description |
|--------|------|-------------|
| POST | `/evaluations` | `{ name, projectIds[] }`. All projects must have actualEffortPm and a completed estimation. |
| GET | `/evaluations` | List user's evaluation runs. |
| GET | `/evaluations/:id` | Result with per-project rows. |

### Dataset

| Method | Path | Description |
|--------|------|-------------|
| POST | `/datasets/import` | Multipart CSV. Max 10 MB. Required columns: name, description, domain, size_kloc, team_size, experience_level. |

---

## Phase 8: LLM Integration Design

### Abstraction

`LlmModule` is the only place that imports the Anthropic SDK. All other modules call `LlmService.extractSignals(normalizedText)` and receive a typed `LlmSignalsDto`. Swapping to a different provider means changing only `LlmModule`.

### Text Normalization

`TextNormalizerService.normalize(input: { inputType, descriptionText?, descriptionJson? }): string`

Two input paths, one normalized string output:

1. **freetext path** — `descriptionText` is used directly.
2. **structured path** — `descriptionJson` keys and values are serialized to labeled prose: `"overview: <value>\ntech_stack: <value>\n..."`. Key order is preserved.

Both paths then apply the same cleaning steps:
1. Lowercase
2. Remove URLs, emails, special characters
3. Collapse whitespace
4. Truncate to ~6000 characters (~1500 tokens)

### Prompt Structure

```
SYSTEM (cached prefix):
You are a software engineering expert specializing in cost estimation.
Evaluate the project on exactly five qualitative signals.
Return ONLY valid JSON matching the schema. Do not include effort estimates.

Signal definitions:
- functional_complexity: complexity of core business logic and features
- architectural_complexity: system design complexity (microservices, distributed state)
- external_integrations: count and complexity of third-party APIs and data sources
- requirement_stability: how stable are requirements (High = stable = lower effort)
- uncertainty: overall uncertainty about scope, technology, or team

Levels: very_low | low | medium | high | very_high

Output schema (strict JSON, no other text):
{
  "functional_complexity":    { "level": "<level>", "rationale": "<one sentence>" },
  "architectural_complexity": { "level": "<level>", "rationale": "<one sentence>" },
  "external_integrations":    { "level": "<level>", "rationale": "<one sentence>" },
  "requirement_stability":    { "level": "<level>", "rationale": "<one sentence>" },
  "uncertainty":              { "level": "<level>", "rationale": "<one sentence>" }
}

USER:
Project description:
<normalized_text>
```

### JSON Output Validation (Zod)

```typescript
const levelSchema = z.enum(['very_low', 'low', 'medium', 'high', 'very_high']);
const entrySchema = z.object({ level: levelSchema, rationale: z.string().min(5).max(200) });

const llmOutputSchema = z.object({
  functional_complexity:    entrySchema,
  architectural_complexity: entrySchema,
  external_integrations:    entrySchema,
  requirement_stability:    entrySchema,
  uncertainty:              entrySchema,
});
```

### Retry Strategy

```
attempt 1 → call Claude → parse JSON → validate Zod
  fail? → wait 1000ms
attempt 2 → call Claude → parse JSON → validate Zod
  fail? → wait 2000ms
attempt 3 → call Claude → parse JSON → validate Zod
  fail? → throw LlmUnavailableException (503)
```

Both JSON parse failures and schema validation failures trigger retry — LLM non-determinism means a clean retry often succeeds.

### Cost Control

- System prompt uses Anthropic prompt caching (prefix caching on system turn)
- Input truncated to ~1500 tokens
- Estimated cost: ~$0.002 per estimation run at Sonnet pricing

---

## Phase 9: Testing Strategy

### Unit Tests — Backend (Jest)

**CocomoService:** Verify formula with known inputs from COCOMO II published examples. Cover organic / semi-detached / embedded project types. Edge cases: minimum KLOC, maximum EAF.

**OrdinalMappingService:** All five levels → ordinal. All ordinals → A_i factor. Pure math, 100% coverage expected.

**AdjustmentService.compute():** Known signal arrays → verify product and per-signal breakdown.

**MetricsService:** Hand-computed MAE, RMSE, MAPE for 5-row fixture. Empty array edge case. Single-element array.

**TextNormalizerService:** URL stripping, whitespace collapse, truncation at boundary.

### Unit Tests — Frontend (Vitest)

**FormulaTrace component:** Snapshot test with known inputs.

**SignalBreakdownTable:** Render test with mock signal data.

**MetricsComparisonTable:** Green badge when hybrid better; red when worse.

### Integration Tests — Backend (Jest)

**EstimationService.runEstimation():** Mock `LlmService` to return fixed signals. Verify end-to-end: project loaded → COCOMO computed → signals mapped → adjustment applied → result persisted.

**ProjectsService CRUD:** Test PostgreSQL container. Full CRUD round-trip — create, read, update, delete.

**DatasetService.importFromCsv():** Known CSV fixture; assert import counts match.

### API / E2E Tests (Supertest)

Full HTTP stack for each endpoint:
- Create Project → Run Estimation → Fetch Estimation (happy path)
- 404 on missing project
- 422 on evaluation with projects missing actual effort
- 422 on project payload with both or neither description fields

Dedicated test database (`TEST_DATABASE_URL`). Reset between suites via TypeORM `dropSchema` + `synchronize`.

### Evaluation Correctness Tests

Academic validation — run with a real Claude API call (flagged separately, only in CI):
1. Load 5 hand-crafted projects with known actual effort
2. Run full pipeline
3. Assert hybrid MAPE < baseline MAPE (thesis claim)
4. Assert hybrid MAE within ±20% of baseline (sanity bound)

---

## Phase 10: Roadmap — 7 Milestones

---

### Milestone 1: Project Bootstrap

**Goal:** Working monorepo with both apps running and connected to PostgreSQL.

**Tasks:**
- Initialize pnpm workspace (`pnpm-workspace.yaml`)
- Scaffold NestJS with `@nestjs/cli`, Next.js with `create-next-app`
- Create `packages/types` and `packages/constants`
- Set up `tsconfig.base.json` with path aliases
- Docker Compose — PostgreSQL + pgAdmin
- TypeORM DataSource, `@nestjs/config` typed env schema
- ESLint + Prettier across all workspaces
- Root `dev` script via `concurrently`

**Expected Output:** `pnpm dev` starts both apps. `GET /api/v1/health` returns 200. Next.js renders placeholder page.

**Risks:** pnpm path alias resolution between workspaces can be tricky — allocate extra time for tsconfig linking.

**Acceptance Criteria:**
- Both apps compile — zero TypeScript errors
- API connects to PostgreSQL
- `packages/types` importable from both `api` and `web`

---

### Milestone 2: Project Management

**Goal:** Full CRUD for projects with frontend forms.

**Tasks:**
- `Project` entity + migration
- `ProjectsService`
- `ProjectsController` (5 endpoints)
- `CreateProjectDto` with class-validator decorators
- Project List page (`/projects`)
- Project Detail page — static view only
- Create/Edit project form

**Expected Output:** User can create projects with COCOMO parameters and description (freetext or structured).

**Risks:** Keep COCOMO parameter exposure in the UI minimal — only what the formula requires.

**Acceptance Criteria:**
- Full CRUD via API; 404 on missing project
- Project list shows all projects
- Frontend form validates required fields client-side
- Form includes an `inputType` toggle: "Free Text" shows a textarea; "Structured" shows a dynamic key–value field builder where users add labeled text fields (e.g. overview, tech stack, challenges)
- API rejects payload with both or neither description fields (422)

---

### Milestone 3: COCOMO II Baseline

**Goal:** Implement COCOMO II Intermediate model and produce a nominal effort estimate.

**Tasks:**
- COCOMO II constants (A, B, SF, EM) in `packages/constants`
- `CocomoService.computeNominalEffort()`
- Unit tests using published COCOMO II handbook examples
- `Estimation` entity + migration
- `EstimationService.runEstimation()` — COCOMO only, no LLM yet
- `EstimationController`
- "Run Estimation" button on Project Detail
- Display baseline estimate on Project Detail

**Expected Output:** Clicking "Run Estimation" produces a COCOMO II nominal effort in person-months.

**Risks:** Scope clearly to COCOMO II Intermediate — do not drift into Post-Architecture variant.

**Acceptance Criteria:**
- Unit test: organic project, 10 KLOC, nominal EAF → matches handbook E_nom
- API: `POST /estimations` returns `nominalEffortPm > 0`
- Frontend displays baseline estimate

---

### Milestone 4: LLM Signal Extraction

**Goal:** Integrate Claude API and extract the five qualitative signals.

**Tasks:**
- Add `@anthropic-ai/sdk` to `api`
- `TextNormalizerService`
- `LlmPromptBuilder`
- `LlmService.extractSignals()` with retry logic
- Zod schema validation of Claude output
- `Signal` entity + migration
- `SignalsService.createBulk()`
- `OrdinalMappingService`
- Wire LLM into `EstimationService.runEstimation()`
- Unit tests: mock Claude, test retry, test schema validation failure

**Expected Output:** After running estimation, five Signal records exist in the database.

**Risks:** Claude occasionally adds commentary around JSON — the prompt must be strict and retry logic must handle parse failures gracefully.

**Acceptance Criteria:**
- Unit test: `LlmService.extractSignals()` returns valid `LlmSignalsDto` with correct mock
- Unit test: retries 3× on invalid JSON then throws
- Integration test: five Signal records in DB after `runEstimation()` with mocked LLM

---

### Milestone 5: Hybrid Estimation and Detail View

**Goal:** Compute E_final and display full signal breakdown in the UI.

**Tasks:**
- `AdjustmentService.compute()`
- Wire adjustment into `runEstimation()` to produce `hybridEffortPm`
- Estimation Detail page (`/estimation/:id`)
- `EffortComparisonBar`, `SignalRadarChart`, `SignalBreakdownTable`, `FormulaTrace` components
- Signal-level color coding

**Expected Output:** Full pipeline runs end-to-end. Detail page shows COCOMO baseline, five signals with rationale, A_i factors, and E_final.

**Risks:** Radar chart without a library requires CSS/canvas work — budget extra time.

**Acceptance Criteria:**
- Create project → run estimation → detail page shows both estimates and all five signals
- `AdjustmentService` unit test: known ordinals → correct E_final
- Factors color-coded (< 1 green, > 1 red, = 1 neutral)

---

### Milestone 6: Evaluation Framework

**Goal:** MAE / RMSE / MAPE for baseline vs hybrid over a project set.

**Tasks:**
- `MetricsService`
- `EvaluationService.runEvaluation()`
- `EvaluationRun` entity + migration
- `EvaluationController`
- Evaluation Dashboard page (`/evaluation`)
- `MetricsComparisonTable`, `PerProjectErrorChart`, `ImprovementBadge`
- Dataset Import page (`/dataset`)
- `DatasetService.importFromCsv()`
- `DatasetController`

**Expected Output:** User can upload CSV, run evaluation, view aggregate error metrics for both models.

**Risks:** CSV format inconsistencies from real datasets (ISBSG, PROMISE) — add flexible column mapping in the import UI.

**Acceptance Criteria:**
- `MetricsService` unit tests match hand-computed values for 5-row fixture
- `POST /evaluations` returns all six metric values
- Frontend metrics table renders improvement/regression correctly
- `POST /datasets/import` successfully imports a 10-row test CSV

---

### Milestone 7: Thesis Evaluation and Polish

**Goal:** Run real evaluation, fix discovered issues, polish UI and documentation.

**Tasks:**
- Source or generate 20–50 historical projects with known actual effort
- Run full pipeline on all projects (real Claude API calls)
- Record hybrid vs baseline MAE/RMSE/MAPE
- Analyze per-signal contribution
- Improve loading and empty states
- Write README with setup instructions and env variable documentation
- Add OpenAPI/Swagger via `@nestjs/swagger`
- Final code review — remove debug logs, verify no secrets committed
- `tsc --noEmit` passes in all workspaces

**Expected Output:** Complete demo-ready application with real evaluation results.

**Risks:** If hybrid MAPE is not consistently better, the thesis must address why. Plan a fallback analysis section discussing when LLM signals help vs. hurt.

**Acceptance Criteria:**
- Evaluation runs on 20+ projects without errors
- Hybrid and baseline MAPE both reported with commentary
- `GET /api/v1/health` and `GET /api/v1/docs` return 200
- Zero TypeScript errors across all workspaces
- README enables a new developer to run the project in under 10 minutes

---

---

## Milestone 8: UX Enhancements

**Goal:** Make the application easier and more transparent to use — quick project creation, clear estimation feedback, insight into the LLM pipeline, and a theme toggle.

---

### Phase 11: Dark / Light Mode Toggle

**Scope:** Client only — `feature/client-theme-toggle`

**Problem:** The app has no theme switching. Users working in dark environments have no way to toggle.

**Tasks:**
- Install `next-themes` in `apps/client`
- Set `darkMode: 'class'` in `apps/client/tailwind.config.ts`
- Wrap root layout in `<ThemeProvider attribute="class" defaultTheme="system">` in `apps/client/app/layout.tsx`
- Create `apps/client/components/ThemeToggle.tsx` — a sun/moon icon button that calls `useTheme().setTheme()`
- Add `<ThemeToggle />` to the existing sticky navbar in `apps/client/app/layout.tsx`
- Verify all existing Tailwind CSS-variable classes (`text-foreground`, `bg-muted`, `border-border`, etc.) respond correctly under the `dark` class

**Files touched:**
- `apps/client/package.json` — add `next-themes`
- `apps/client/tailwind.config.ts` — `darkMode: 'class'`
- `apps/client/app/layout.tsx` — `ThemeProvider` wrapper + `ThemeToggle` in nav
- `apps/client/components/ThemeToggle.tsx` (new)

**Acceptance Criteria:**
- Sun icon shown in dark mode, moon icon in light mode
- Theme persists across page reloads (localStorage via `next-themes`)
- No flash of wrong theme on load (`suppressHydrationWarning` on `<html>`)
- All existing pages look correct in both themes

---

### Phase 12: Animated Estimation Loader Modal

**Scope:** Client only — `feature/client-estimation-loader`

**Problem:** Clicking "Run Estimation" gives no feedback — the POST /estimations call blocks for several seconds (COCOMO + LLM call) with no UI response.

**Tasks:**
- Create `apps/client/components/EstimationLoaderModal.tsx` — a full-screen modal overlay with a 3-step animated pipeline:
  - Step 1 "Computing COCOMO baseline" — gear SVG with CSS spin animation (2 s)
  - Step 2 "Extracting semantic signals via Claude" — sparkle/brain SVG with CSS pulse animation (3 s)
  - Step 3 "Computing hybrid estimate" — bar-chart SVG with CSS draw-in animation (1 s)
  - Steps auto-advance on a timer since the POST is one blocking call with no streaming events
- Show modal immediately on "Run Estimation" button click; close when `runEstimation()` resolves (success or error)
- On error, replace the loader with an inline error state inside the modal (red icon + message + close button) rather than closing silently
- All SVG animations use Tailwind `animate-spin`, `animate-pulse`, or custom `@keyframes` in `globals.css` — no external animation library

**Files touched:**
- `apps/client/components/EstimationLoaderModal.tsx` (new)
- `apps/client/app/projects/[id]/page.tsx` — import and show/hide the modal around `runEstimation()`
- `apps/client/app/globals.css` — add `@keyframes` for the bar-chart draw-in if needed

**Acceptance Criteria:**
- Modal appears instantly on button click
- Steps advance on the correct timer (2 s / 3 s / 1 s)
- Modal closes and user is redirected to `/estimation/:id` on success
- Error state shown inside modal instead of silent close on failure
- No layout shift when modal opens (use `fixed inset-0` overlay)

---

### Phase 13: Free-Text Quick Create

**Scope:** Client only — `feature/client-quick-create`

**Problem:** The project creation form requires filling in `domain`, `sizeKloc`, `teamSize`, and `experienceLevel` even when the user just wants to paste a description and immediately get an estimate. The structured fields are necessary for COCOMO II but they raise the barrier for first-time use.

**Tasks:**
- Redesign the create-project form into two modes accessible via a tab or toggle:
  - **Quick** tab — fields: `name` (required) + `description` textarea (required) + optional `actualEffortPm`; COCOMO parameters hidden with sensible defaults (`domain: "semi-detached"`, `sizeKloc: 10`, `teamSize: 5`, `experienceLevel: "nominal"`, `inputType: "freetext"`)
  - **Advanced** tab — all current fields visible (same form as today)
- After a Quick create, immediately call `runEstimation(projectId)` and show the loader modal (Phase 12) without requiring the user to navigate to the project detail page first
- On estimation completion, redirect directly to `/estimation/:id`
- Backend contract is unchanged — all required fields are still sent, Quick mode just pre-fills the COCOMO defaults client-side

**Files touched:**
- `apps/client/app/projects/page.tsx` — new Quick/Advanced tab UI in the create modal/form
- `apps/client/lib/api-client.ts` — add `createProjectAndEstimate(payload)` helper that chains `createProject` + `runEstimation`

**Acceptance Criteria:**
- Quick tab: user fills name + description, clicks "Estimate" — one action creates the project and starts the estimation
- Advanced tab: all current fields available and unchanged
- Default COCOMO values are visible in Advanced tab after a Quick create so the user can inspect them
- Switching tabs preserves already-entered values

---

### Phase 14: LLM Prompt Transparency Panel

**Scope:** Server + Client — two separate branches/PRs

#### Phase 14a — Server: Store Normalized Text (`feature/server-normalized-text`)

**Problem:** The estimation result page shows signals and adjustments but there is no record of what text was actually sent to Claude.

**Tasks:**
- Add `normalizedText: string | null` column to the `Estimation` entity (`apps/server/src/modules/estimation/entities/estimation.entity.ts`)
- In `EstimationService.runEstimation()`, capture the string returned by `TextNormalizerService.normalize()` and persist it on the estimation record
- Expose `normalizedText` in the `GET /estimations/:id` response
- Add `normalizedText: string | null` to the shared `Estimation` interface in `packages/types/src/estimation.types.ts`

**Files touched:**
- `apps/server/src/modules/estimation/entities/estimation.entity.ts`
- `apps/server/src/modules/estimation/estimation.service.ts`
- `packages/types/src/estimation.types.ts`

**Acceptance Criteria:**
- New `normalized_text` column exists after TypeORM sync
- `GET /estimations/:id` response includes `normalizedText` (non-null for completed estimations, null for legacy rows)
- Existing estimations unaffected (column nullable, no migration required beyond `synchronize: true`)

#### Phase 14b — Client: Transparency Accordion (`feature/client-llm-transparency`)

**Depends on:** Phase 14a merged and server restarted.

**Tasks:**
- Add a collapsible "What was sent to Claude" accordion at the bottom of `apps/client/app/estimation/[id]/page.tsx`
- Three tabs inside the accordion:
  - **Normalized text** — the `normalizedText` value from the API, rendered in a `<pre>` monospace block with a "Copy" button
  - **System prompt** — the hardcoded LLM system prompt (static string, no API call), shown in a `<pre>` block
  - **Raw LLM output** — reconstruct the JSON from the existing signal records and display it in a `<pre>` block
- Accordion is collapsed by default; opens on click
- Show a tooltip on the accordion header: "See exactly what was sent to the AI and what it returned"

**Files touched:**
- `apps/client/app/estimation/[id]/page.tsx`

**Acceptance Criteria:**
- Accordion visible on all completed estimation detail pages
- "Normalized text" tab shows the actual text sent (truncated at 6000 chars)
- "System prompt" tab shows the exact prompt template
- "Raw LLM output" tab shows valid JSON with all 5 signal entries
- "Copy" button copies content to clipboard
- Accordion hidden (or shows "not available") for failed/pending estimations

---

### Milestone 8 — Implementation Order

| Phase | Branch | Scope | Depends on |
|-------|--------|-------|------------|
| 11 — Dark/light toggle | `feature/client-theme-toggle` | client | — |
| 12 — Estimation loader modal | `feature/client-estimation-loader` | client | — |
| 13 — Quick create | `feature/client-quick-create` | client | Phase 12 (loader modal) |
| 14a — Store normalized text | `feature/server-normalized-text` | server | — |
| 14b — Transparency accordion | `feature/client-llm-transparency` | client | Phase 14a merged |

Phases 11, 12, and 14a can be worked in parallel. Phase 13 reuses the loader modal from Phase 12. Phase 14b depends on the server column added in Phase 14a.

---

## Appendix A: COCOMO II Constants Reference

```
A = 2.94

Scale Factors (SF):
  PREC: VL=6.20, L=4.96, N=3.72, H=2.48, VH=1.24, XH=0.00
  FLEX: VL=5.07, L=4.05, N=3.04, H=2.03, VH=1.01, XH=0.00
  RESL: VL=7.07, L=5.65, N=4.24, H=2.83, VH=1.41, XH=0.00
  TEAM: VL=5.48, L=4.38, N=3.29, H=2.19, VH=1.10, XH=0.00
  PMAT: VL=7.80, L=6.24, N=4.68, H=3.12, VH=1.56, XH=0.00

B = 0.91 + 0.01 × Σ(SF_i)
EAF = product of selected effort multiplier values
E_nom = A × Size^B × EAF
```

## Appendix B: Signal Ordinal Mapping

| Level | Ordinal | A_i Factor |
|-------|---------|------------|
| Very Low | -3 | 0.70 |
| Low | -1 | 0.90 |
| Medium | 0 | 1.00 |
| High | +1 | 1.10 |
| Very High | +3 | 1.30 |

```
E_final = E_nom × A_functional × A_architectural × A_integrations × A_stability × A_uncertainty

Range:
  All Very Low  → 0.70^5 ≈ 0.17× baseline
  All Very High → 1.30^5 ≈ 3.71× baseline
```
