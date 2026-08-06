'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, ScatterChart, Scatter, LineChart, Line,
  ReferenceLine, Label,
} from 'recharts';
import { getProjects, getEstimationStats, getAllEstimations, EstimationStats } from '@/lib/api-client';
import type { Project, Estimation } from '@sce/types';

const SIGNAL_LABELS: Record<string, string> = {
  functional_complexity:    'Func. Complexity',
  architectural_complexity: 'Arch. Complexity',
  external_integrations:    'Ext. Integrations',
  requirement_stability:    'Req. Stability',
  uncertainty:              'Uncertainty',
  reliability_requirement:  'Reliability',
  platform_complexity:      'Platform Complexity',
  schedule_pressure:        'Schedule Pressure',
  data_complexity:          'Data Complexity',
  team_experience_gap:      'Experience Gap',
  precedentedness:          'Precedentedness',
  development_flexibility:  'Dev. Flexibility',
  architecture_risk:        'Arch. Risk',
  team_cohesion:            'Team Cohesion',
  process_maturity:         'Process Maturity',
};

const LEVEL_ORDER = ['very_low', 'low', 'medium', 'high', 'very_high'];
const LEVEL_COLORS: Record<string, string> = {
  very_low:  '#3b82f6',
  low:       '#22c55e',
  medium:    '#a3a3a3',
  high:      '#f97316',
  very_high: '#ef4444',
};

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-5 py-4 space-y-1">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold tabular-nums text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
      {children}
    </h2>
  );
}

interface ScatterPoint {
  actual: number;
  predicted: number;
  name: string;
}

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: { payload: ScatterPoint }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const error = Math.abs(d.predicted - d.actual) / d.actual * 100;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-md space-y-1">
      <p className="font-semibold text-foreground">{d.name}</p>
      <p className="text-muted-foreground">Actual: <span className="text-foreground tabular-nums">{d.actual.toFixed(1)} PM</span></p>
      <p className="text-muted-foreground">Predicted: <span className="text-foreground tabular-nums">{d.predicted.toFixed(1)} PM</span></p>
      <p className="text-muted-foreground">Error: <span className={`tabular-nums font-medium ${error > 50 ? 'text-red-500' : error > 25 ? 'text-orange-500' : 'text-green-500'}`}>{error.toFixed(1)}%</span></p>
    </div>
  );
}

function HistoryTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-md space-y-1">
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="tabular-nums">{Number(p.value).toFixed(1)} PM</span>
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats]           = useState<EstimationStats | null>(null);
  const [projects, setProjects]     = useState<Project[]>([]);
  const [allEstimations, setAll]    = useState<Estimation[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    async function load() {
      const [statsData, projectsData, estimationsData] = await Promise.all([
        getEstimationStats(),
        getProjects(),
        getAllEstimations(),
      ]);
      const projs = projectsData.data;
      setStats(statsData);
      setProjects(projs);
      setAll(estimationsData);
      // Default: pick first project that has multiple completed estimations
      const byProject: Record<string, Estimation[]> = {};
      for (const e of estimationsData) {
        if (e.status === 'completed') {
          if (!byProject[e.projectId]) byProject[e.projectId] = [];
          byProject[e.projectId].push(e);
        }
      }
      const best = projs.find((p) => (byProject[p.id]?.length ?? 0) > 1) ?? projs[0];
      if (best) setSelectedProjectId(best.id);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, []);

  // ── Scatter data ──────────────────────────────────────────────────────────
  const { cocomoPoints, hybridPoints, scatterMax } = useMemo(() => {
    const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));
    const seen = new Set<string>();
    const coco: ScatterPoint[] = [];
    const hybr: ScatterPoint[] = [];

    for (const e of allEstimations) {
      if (seen.has(e.projectId)) continue;
      if (e.status !== 'completed' || !e.nominalEffortPm || !e.hybridEffortPm) continue;
      const project = projectMap[e.projectId];
      if (!project?.actualEffortPm) continue;
      const actual = project.actualEffortPm;
      const shortName = project.name.length > 24 ? project.name.slice(0, 22) + '…' : project.name;
      coco.push({ actual, predicted: e.nominalEffortPm, name: shortName });
      hybr.push({ actual, predicted: e.hybridEffortPm,  name: shortName });
      seen.add(e.projectId);
    }

    const allVals = [...coco, ...hybr].flatMap((p) => [p.actual, p.predicted]);
    const max = Math.ceil(Math.max(...allVals, 0) * 1.1 / 100) * 100;
    return { cocomoPoints: coco, hybridPoints: hybr, scatterMax: max };
  }, [projects, allEstimations]);

  // ── History data ──────────────────────────────────────────────────────────
  const historyData = useMemo(() => {
    if (!selectedProjectId) return [];
    const project = projects.find((p) => p.id === selectedProjectId);
    const actualPm = project?.actualEffortPm ?? null;
    return allEstimations
      .filter((e) => e.projectId === selectedProjectId && e.status === 'completed' && e.nominalEffortPm)
      .sort((a, b) => new Date(a.runAt).getTime() - new Date(b.runAt).getTime())
      .map((e, i) => ({
        run: `Run ${i + 1}`,
        date: new Date(e.runAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        cocomo: Number(e.nominalEffortPm!.toFixed(1)),
        hybrid: Number((e.hybridEffortPm ?? e.nominalEffortPm)!.toFixed(1)),
        ...(actualPm != null ? { actual: actualPm } : {}),
      }));
  }, [selectedProjectId, allEstimations, projects]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // ── Signal distribution ───────────────────────────────────────────────────
  const distributionData = useMemo(() => {
    if (!stats) return [];
    const signalMap: Record<string, Record<string, number>> = {};
    for (const { signalName, level, count } of stats.signalDistribution) {
      if (!signalMap[signalName]) signalMap[signalName] = {};
      signalMap[signalName][level] = count;
    }
    return Object.entries(signalMap).map(([name, levels]) => ({
      name: SIGNAL_LABELS[name] ?? name,
      ...Object.fromEntries(LEVEL_ORDER.map((l) => [l, levels[l] ?? 0])),
    }));
  }, [stats]);

  // ── Divergence ────────────────────────────────────────────────────────────
  const divergenceData = useMemo(() => {
    if (!stats) return [];
    return stats.validationStats.perSignalDivergence
      .filter((d) => d.divergenceRate > 0)
      .slice(0, 10)
      .map((d) => ({
        name: SIGNAL_LABELS[d.signalName] ?? d.signalName,
        divergence: Math.round(d.divergenceRate * 100),
      }));
  }, [stats]);

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-16">
        <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map((i) => <div key={i} className="h-24 rounded bg-muted" />)}
          </div>
          {[1,2,3,4].map((i) => <div key={i} className="h-72 rounded bg-muted" />)}
        </div>
      </main>
    );
  }

  if (!stats) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Failed to load analytics.</p>
      </main>
    );
  }

  const avgAgreement = stats.validationStats.avgAgreementRate;

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-5xl space-y-12">

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Aggregated statistics across all estimations</p>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KpiCard label="Estimations" value={String(stats.totalEstimations)} sub="completed runs" />
          <KpiCard label="GPT Validated" value={String(stats.validationStats.totalValidated)} sub="cross-LLM checks" />
          <KpiCard
            label="Avg Agreement"
            value={avgAgreement != null ? `${Math.round(avgAgreement * 100)}%` : '—'}
            sub="Claude vs GPT-4o-mini"
          />
          <KpiCard label="Projects w/ Actuals" value={String(cocomoPoints.length)} sub="ground truth available" />
        </div>

        {/* ── Scatter: Predicted vs Actual ── */}
        {cocomoPoints.length > 0 && (
          <section>
            <SectionHeading>Predicted vs Actual Effort (person-months)</SectionHeading>
            <p className="text-xs text-muted-foreground mb-4">
              Points on the diagonal line = perfect prediction. Above = overestimate, below = underestimate.
            </p>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <ResponsiveContainer width="100%" height={380}>
                <ScatterChart margin={{ top: 16, right: 24, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis type="number" dataKey="actual" domain={[0, scatterMax]} name="Actual" unit=" PM" tick={{ fontSize: 11 }}>
                    <Label value="Actual Effort (PM)" position="insideBottom" offset={-16} style={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  </XAxis>
                  <YAxis type="number" dataKey="predicted" domain={[0, scatterMax]} name="Predicted" unit=" PM" tick={{ fontSize: 11 }}>
                    <Label value="Predicted (PM)" angle={-90} position="insideLeft" offset={16} style={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  </YAxis>
                  {/* Perfect prediction diagonal */}
                  <ReferenceLine
                    segment={[{ x: 0, y: 0 }, { x: scatterMax, y: scatterMax }]}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="6 3"
                    strokeWidth={1}
                  />
                  <Tooltip content={<ScatterTooltip />} />
                  <Legend />
                  <Scatter name="COCOMO Baseline" data={cocomoPoints} fill="#3b82f6" opacity={0.85} legendType="square" />
                  <Scatter name="Hybrid (LLM)"    data={hybridPoints}  fill="#22c55e" opacity={0.85} legendType="square" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── History per project ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <SectionHeading>Estimation History per Project</SectionHeading>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {historyData.length === 0 ? (
            <div className="rounded-lg border border-border px-5 py-8 text-center text-sm text-muted-foreground">
              No completed estimations for this project yet.
            </div>
          ) : historyData.length === 1 ? (
            <div className="rounded-lg border border-border px-5 py-8 text-center text-sm text-muted-foreground">
              Only one estimation run — re-run the estimation a few times to see variance over runs.
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={historyData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} unit=" PM" />
                  <Tooltip content={<HistoryTooltip />} />
                  <Legend />
                  <Line type="monotone" dataKey="cocomo"  name="COCOMO Baseline" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="hybrid"  name="Hybrid (LLM)"    stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="actual"  name="Actual Effort"   stroke="#eab308" strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-2 px-1">
                {historyData.length} estimation run{historyData.length > 1 ? 's' : ''} —
                COCOMO variance shows KLOC sensitivity; Hybrid variance shows LLM output variance.
              </p>
            </div>
          )}
        </section>

        {/* ── Signal Distribution ── */}
        {distributionData.length > 0 && (
          <section>
            <SectionHeading>Signal Level Distribution (across all estimations)</SectionHeading>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={distributionData} layout="vertical" margin={{ top: 4, right: 16, left: 120, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={116} />
                  <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }} />
                  <Legend />
                  {LEVEL_ORDER.map((level) => (
                    <Bar key={level} dataKey={level} name={level.replace('_', ' ')} stackId="a" fill={LEVEL_COLORS[level]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── GPT Divergence ── */}
        {stats.validationStats.totalValidated > 0 && (
          <section>
            <SectionHeading>
              GPT-4o-mini Divergence by Signal
              <span className="ml-2 normal-case font-normal text-muted-foreground">
                ({stats.validationStats.totalValidated} estimation{stats.validationStats.totalValidated > 1 ? 's' : ''} validated)
              </span>
            </SectionHeading>
            {divergenceData.length === 0 ? (
              <p className="text-sm text-muted-foreground">Claude and GPT-4o-mini agreed on all signals.</p>
            ) : (
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <ResponsiveContainer width="100%" height={Math.max(160, divergenceData.length * 44)}>
                  <BarChart data={divergenceData} layout="vertical" margin={{ top: 4, right: 32, left: 120, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={116} />
                    <Tooltip
                      contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }}
                      formatter={(v) => [`${Number(v)}%`, 'Divergence rate']}
                    />
                    <Bar dataKey="divergence" name="Divergence %" radius={[0,4,4,0]}>
                      {divergenceData.map((entry) => (
                        <Cell key={entry.name} fill={entry.divergence > 50 ? '#ef4444' : entry.divergence > 25 ? '#f97316' : '#a3a3a3'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>
        )}

        {stats.validationStats.totalValidated === 0 && (
          <div className="rounded-lg border border-border px-5 py-4 text-sm text-muted-foreground">
            No GPT validation data yet — run a new estimation to trigger cross-LLM comparison.
          </div>
        )}

      </div>
    </main>
  );
}
