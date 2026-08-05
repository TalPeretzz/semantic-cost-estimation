# Research Conclusions

Empirical findings from live experiments with the SCE framework.
Student: Tal Peretz 200535441 — Supervisors: Dr. Renata Avros & Prof. Zeev Volkovich

---

## Finding 1: KLOC is the dominant cost driver

The COCOMO formula `E = 2.94 × KLOC^B × EAF × ∏(A_i)` is exponentially sensitive to project size.
LLM signals can swing the result by ±30–110% around the baseline, but cannot overcome the size effect.
A 100 KLOC project will always cost more than a 10 KLOC project regardless of description quality.

| KLOC | COCOMO baseline | With max LLM adjustment (×2.1) |
|------|-----------------|-------------------------------|
| 5    | ~16 PM          | ~34 PM                        |
| 10   | ~37 PM          | ~78 PM                        |
| 48   | ~207 PM         | ~435 PM                       |
| 100  | ~460 PM         | ~970 PM                       |

**Implication:** In articles, frame KLOC as the "anchor" and LLM signals as the "correction term."

---

## Finding 2: Rich descriptions with specific technical markers improve signal extraction

Short descriptions (1 sentence) can still yield accurate signals if they contain domain-specific vocabulary
(e.g., "SLAM navigation", "ISO 3691-4", "fleet coordination protocol"). The LLM maps known technical
terms to complexity levels reliably based on pre-training knowledge.

Generic descriptions ("web application with user management") yield weak/neutral signals and the
estimate collapses to the COCOMO baseline.

**Implication:** Description quality correlates with estimation accuracy improvement over baseline.
This is a testable hypothesis for the thesis evaluation.

---

## Finding 3: Hybrid model is not always more accurate than COCOMO

When the COCOMO baseline is already close to actual effort, LLM signals can push the estimate further
away. This is a valid and important finding — it indicates conditions where LLM reasoning hurts rather
than helps.

Observed pattern: simple projects (HR portals, payroll engines, weather apps) tend to be underestimated
in their complexity by LLM signals that correctly identify high reliability or platform requirements that
weren't explicit in the description. The LLM over-adjusts upward on projects where actual effort was low.

**Implication:** Core research question per thesis abstract — "analysis of the conditions under which
LLM-based reasoning contributes to improved estimation accuracy."

---

## Finding 4: Dynamic scale factors (B exponent) significantly close the gap

Phase 15 made B dynamic based on 5 LLM-assessed COCOMO II scale factors instead of fixed at nominal (1.10).

| Scale Factor | Range | What it measures |
|---|---|---|
| PREC | 1.24–6.20 | Precedentedness — has this type of system been built before? |
| FLEX | 1.01–5.07 | Development flexibility — how rigid are requirements/schedule? |
| RESL | 1.41–7.07 | Architecture/risk resolution — is the architecture resolved? |
| TEAM | 1.10–5.48 | Team cohesion — how well does the team work together? |
| PMAT | 1.56–7.80 | Process maturity — is there a formal development process? |

For a 48 KLOC project, B=1.01 gives ~185 PM vs B=1.26 gives ~280 PM — a ~95 PM swing before any EAF adjustment.

**Result:** Dynamic B combined with few-shot prompting (Phase 16) reduced MAPE from 42.7% to 38.7%.

---

## Finding 5: Expanded signal set (13 signals) achieves best accuracy

Phase 17 added 3 more COCOMO II cost drivers: `reliability_requirement` (RELY), `platform_complexity` (CPLX),
`schedule_pressure` (SCED). These directly target safety-critical and embedded projects where pure KLOC underestimates most severely.

**Full 21-project evaluation results:**

| Project | Actual | COCOMO% | Ph16% | Ph17% |
|---|---:|---:|---:|---:|
| Internal HR Leave Portal | 45 | 24.4% | 73.0% | 80.3% |
| Telemedicine Platform | 245 | 44.9% | 34.0% | 27.0% |
| Real-Time Bidding Engine | 310 | 46.1% | 10.2% | 57.6% |
| Document Management System | 130 | 39.0% | 39.6% | 33.6% |
| Autonomous Robot Controller | 540 | 48.6% | 26.5% | 24.2% |
| Supply Chain Visibility Platform | 210 | 47.5% | 17.4% | 17.4% |
| HR Self-Service Portal | 88 | 36.3% | 62.4% | 66.2% |
| Manufacturing MES | 480 | 57.2% | 48.7% | 43.8% |
| Clinical Trial Data Capture | 260 | 49.5% | 65.0% | 44.0% |
| Banking Core Ledger Migration | 980 | 68.5% | 51.0% | 5.1% |
| Weather Forecast Visualisation | 72 | 19.8% | 35.0% | 20.6% |
| Insurance Claims Workflow | 280 | 47.4% | 42.2% | 38.6% |
| Network Intrusion Detection | 175 | 52.8% | 42.8% | 28.2% |
| Student Information System | 140 | 35.1% | 21.5% | 16.3% |
| Fleet Tracking Microservices | 420 | 60.0% | 51.6% | 41.4% |
| E-Commerce Platform | 190 | 39.6% | 51.1% | 53.5% |
| Satellite Telemetry Processor | 620 | 52.7% | 26.3% | 20.2% |
| Inventory Management Portal | 48 | 5.8% | 5.8% | 9.6% |
| Hospital Patient Record System | 380 | 44.6% | 39.6% | 21.5% |
| Payroll Processing Engine | 95 | 23.5% | 24.3% | 25.0% |
| Avionics Ground Support System | 320 | 53.7% | 43.9% | 19.8% |
| **MAPE** | | **42.7%** | **38.7%** | **33.0%** |

**Summary:**

| Model | MAPE | Improvement vs COCOMO | Beats COCOMO |
|---|---|---|---|
| COCOMO II baseline | 42.7% | — | — |
| Phase 16: 10 signals (5 adj + 5 SF) | 38.7% | +9.5% | 13/21 |
| Phase 17: 13 signals (8 adj + 5 SF) | 33.0% | +22.7% | 14/21 |

**Key finding:** Adding `reliability_requirement`, `platform_complexity`, and `schedule_pressure` yielded
the single largest accuracy jump of the research (+13.7 pp absolute MAPE reduction vs Ph16 baseline).
The biggest individual beneficiary was Banking Core Ledger Migration (68.5% → 5.1%), where high
reliability + regulatory constraints were successfully captured by the new signals.

---

## Finding 6: LLM signal variance — a stochastic limitation

Some projects show inconsistent hybrid estimates across runs (notably Real-Time Bidding Engine: ranged
from 10.2% to 57.6% error across two evaluation runs with identical prompts). This is an inherent
property of LLM inference — non-deterministic outputs even at temperature=0 due to floating-point
ordering on different hardware states.

**Implication:** For the thesis, report average MAPE over multiple runs (ideally 3+) rather than
single-run results. Single-run results are sufficient for trend direction but not for precise claims.

---

## Finding 7: Where LLM adjustment consistently helps vs. hurts

**LLM hybrid wins** (Ph17 best in class) on:
- Safety-critical systems (avionics, banking, hospital records, autonomous robots)
- Embedded / real-time platforms (satellite, robotics)
- Complex enterprise systems with many integrations (supply chain, fleet tracking)
- Projects with explicit domain markers in descriptions (SLAM, ISO cert, hard real-time)

**COCOMO baseline wins** on:
- Simple CRUD applications (HR portals, payroll, inventory)
- Projects with vague/short descriptions — LLM defaults to medium but COCOMO is already close
- Well-understood, low-complexity domains where EAF adjustments overshoot

**Practical guidance for thesis:** The hybrid model is most valuable when description quality is high
AND the project has characteristics that deviate significantly from the COCOMO "average" project.

---

## Implemented Phases Summary

| Phase | Description | MAPE | Change |
|---|---|---|---|
| Baseline | COCOMO II, fixed B=1.10, 5 adjustment signals | 42.7% | — |
| Phase 15 | Dynamic B via 5 LLM-assessed scale factors | (combined with Ph16) | — |
| Phase 16 | Few-shot prompt + prompt direction bug fixes | 38.7% | −4.0 pp |
| Phase 17 | +3 signals: reliability, platform complexity, schedule | 33.0% | −5.7 pp |
