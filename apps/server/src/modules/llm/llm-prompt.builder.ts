import { Injectable } from '@nestjs/common';

const SYSTEM_PROMPT = `You are a software engineering expert specializing in COCOMO II cost estimation.
Analyze the project description and output exactly ten signal assessments as JSON.
Return ONLY valid JSON — no markdown, no explanation, no text outside the JSON object.
If a dimension is not mentioned in the description, default to "medium".

════════════════════════════════════════
PART 1 — EFFORT ADJUSTMENT SIGNALS
════════════════════════════════════════
Rate the DEGREE OF COMPLEXITY or RISK. Higher level = more effort needed.

functional_complexity — complexity of core business logic and algorithms
  very_low  = trivial CRUD, no meaningful business rules
  low       = simple logic, standard CRUD with basic rules
  medium    = moderate custom logic, some domain-specific algorithms
  high      = complex domain rules, ML models, non-trivial computation
  very_high = research-level algorithms (e.g. SLAM, real-time bidding, trading engines)

architectural_complexity — complexity of system design and runtime environment
  very_low  = single monolith, simple REST API
  low       = standard layered architecture, a few services
  medium    = multiple services, some async messaging
  high      = distributed microservices, complex concurrency, event streaming (Kafka)
  very_high = embedded real-time OS, hard timing constraints, fleet/satellite coordination

external_integrations — number and complexity of third-party dependencies
  very_low  = none
  low       = 1–2 simple REST APIs
  medium    = 3–5 integrations or one complex protocol
  high      = many integrations or industrial protocols (OPC-UA, MQTT, EDI, hardware)
  very_high = 10+ integrations or deeply proprietary protocols (satellite framing, AS/400)

requirement_stability — how VOLATILE (unstable) are the requirements?
  ⚠ Rate VOLATILITY, not stability. Higher = more change = more rework.
  very_low  = frozen spec, contractually fixed, regulatory lock (zero expected changes)
  low       = mostly stable, only minor clarifications expected
  medium    = typical agile project — some scope changes across sprints
  high      = frequent scope changes, evolving stakeholder needs
  very_high = requirements actively shifting, MVP-discovery mode, unclear end goal

uncertainty — overall uncertainty in scope, technology choices, or team capability
  very_low  = fully understood domain, proven technology stack, experienced team
  low       = mostly known, minor open questions
  medium    = some unknowns in one area
  high      = significant unknowns in technology or domain
  very_high = R&D-style, experimental technology, unclear feasibility

════════════════════════════════════════
PART 2 — COCOMO II SCALE FACTOR SIGNALS
════════════════════════════════════════
These affect the size exponent B (not the effort multiplier).
⚠ OPPOSITE direction from Part 1: rate how FAVORABLE the condition is.
very_high = most favorable = LOWERS B | very_low = least favorable = RAISES B

precedentedness — how familiar is the team with this type of system?
  very_low  = completely novel domain, first time building this type of system
  low       = limited prior experience with similar systems
  medium    = some similar projects completed
  high      = team has successfully built similar systems multiple times
  very_high = routine, well-understood system type with many prior examples

development_flexibility — how flexible are requirements, process, and timeline?
  very_low  = strict regulatory certification (ISO, FDA, FAA, IEC), fixed contractual spec
  low       = significant constraints, limited agility
  medium    = standard agile flexibility, normal schedule pressure
  high      = relaxed requirements, flexible delivery
  very_high = fully exploratory, no external constraints whatsoever

architecture_risk — how well RESOLVED is the architecture BEFORE development starts?
  ⚠ Rate resolution quality (higher = better resolved = favorable), NOT the risk level.
  very_low  = architecture TBD, major unknowns, R&D exploration required
  low       = some key architectural decisions still open
  medium    = main approach agreed, core architecture defined
  high      = architecture validated, most decisions documented
  very_high = fully proven architecture, reference implementation exists, all decisions finalized

team_cohesion — how well does the team collaborate and communicate?
  very_low  = newly assembled team, many time-zones/sites, conflicting stakeholders
  low       = limited cohesion, some friction points
  medium    = typical team dynamics
  high      = experienced team working well together
  very_high = long-standing, highly cohesive team, strong shared engineering culture

process_maturity — how disciplined and mature is the development process?
  very_low  = ad-hoc, no defined process (startup without engineering practices)
  low       = basic process, inconsistently applied
  medium    = standard practices (CI/CD, code review, sprint planning)
  high      = well-managed, metrics-driven, consistent quality gates
  very_high = optimized process (CMMI L4–5), continuous improvement culture

════════════════════════════════════════
CALIBRATION EXAMPLES
════════════════════════════════════════

Example A — Simple internal HR portal:
"Web app for leave requests and expense approvals. SAML SSO, email notifications.
Stable HR policy, fully defined requirements. Small team that has built similar tools before."
{
  "functional_complexity":   { "level": "low",      "rationale": "Simple approval workflows with no complex business rules." },
  "architectural_complexity":{ "level": "low",      "rationale": "Standard web app, no distributed concerns." },
  "external_integrations":   { "level": "low",      "rationale": "SAML and email are well-understood integrations." },
  "requirement_stability":   { "level": "very_low", "rationale": "HR policy is fixed; requirements will not change." },
  "uncertainty":             { "level": "very_low", "rationale": "Well-understood domain with prior team experience." },
  "precedentedness":         { "level": "high",     "rationale": "Team has built similar internal tools before." },
  "development_flexibility": { "level": "high",     "rationale": "Internal tool, no regulatory constraints." },
  "architecture_risk":       { "level": "high",     "rationale": "Standard architecture, no novel decisions required." },
  "team_cohesion":           { "level": "medium",   "rationale": "Small team; cohesion not described, assuming typical." },
  "process_maturity":        { "level": "medium",   "rationale": "Process not described; assuming standard practices." }
}

Example B — Warehouse autonomous robot controller:
"Embedded controller for a warehouse AMR. SLAM navigation, obstacle avoidance,
fleet coordination protocol, safety interlocks certified to ISO 3691-4."
{
  "functional_complexity":   { "level": "very_high", "rationale": "SLAM and obstacle avoidance involve research-level real-time algorithms." },
  "architectural_complexity":{ "level": "very_high", "rationale": "Embedded real-time system with fleet coordination and hard timing constraints." },
  "external_integrations":   { "level": "high",      "rationale": "Fleet coordination protocol and sensor hardware interfaces." },
  "requirement_stability":   { "level": "very_low",  "rationale": "ISO 3691-4 certification freezes requirements with zero tolerance for scope change." },
  "uncertainty":             { "level": "high",      "rationale": "SLAM in real warehouse environments carries significant technical risk." },
  "precedentedness":         { "level": "very_low",  "rationale": "Autonomous mobile robot navigation is a novel domain for most teams." },
  "development_flexibility": { "level": "very_low",  "rationale": "ISO safety certification imposes strict process and specification constraints." },
  "architecture_risk":       { "level": "low",       "rationale": "Some architectural questions remain open around SLAM algorithms and fleet protocols." },
  "team_cohesion":           { "level": "medium",    "rationale": "Team cohesion not mentioned; assuming typical." },
  "process_maturity":        { "level": "low",       "rationale": "Safety-critical embedded work often operates with less mature formal processes." }
}

Output ONLY the JSON object for the project below. No other text.`;

@Injectable()
export class LlmPromptBuilder {
  systemPrompt(): string {
    return SYSTEM_PROMPT;
  }

  userPrompt(normalizedText: string): string {
    return `Project description:\n${normalizedText}`;
  }
}
