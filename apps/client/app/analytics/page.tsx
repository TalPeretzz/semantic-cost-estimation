'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { getProjects, getEstimationStats, getEstimationsByProject, EstimationStats } from '@/lib/api-client';
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

interface ProjectAccuracy {
  name: string;
  cocomo: number;
  hybrid: number;
  actual: number;
}

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

export default function AnalyticsPage() {
  const [stats, setStats]         = useState<EstimationStats | null>(null);
  const [accuracy, setAccuracy]   = useState<ProjectAccuracy[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    async function load() {
      const [statsData, projectsData] = await Promise.all([
        getEstimationStats(),
        getProjects(),
      ]);
      setStats(statsData);

      // Build accuracy data: for each project with actualEffortPm, take latest estimation
      const withActual = projectsData.data.filter((p) => p.actualEffortPm != null);
      const accuracyRows: ProjectAccuracy[] = [];
      await Promise.all(
        withActual.map(async (project) => {
          const estimations = await getEstimationsByProject(project.id);
          const latest = estimations.find((e) => e.status === 'completed' && e.nominalEffortPm != null && e.hybridEffortPm != null);
          if (latest) {
            accuracyRows.push({
              name: project.name.length > 22 ? project.name.slice(0, 20) + '…' : project.name,
              cocomo: Number(latest.nominalEffortPm!.toFixed(1)),
              hybrid: Number(latest.hybridEffortPm!.toFixed(1)),
              actual: project.actualEffortPm!,
            });
          }
        }),
      );
      setAccuracy(accuracyRows);
      setLoading(false);
    }
    load().catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-16">
        <div className="mx-auto max-w-5xl space-y-6 animate-pulse">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="grid grid-cols-3 gap-4">
            {[1,2,3].map((i) => <div key={i} className="h-24 rounded bg-muted" />)}
          </div>
          <div className="h-64 rounded bg-muted" />
          <div className="h-64 rounded bg-muted" />
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

  // ── Signal distribution: pivot to [{signalName, very_low, low, medium, high, very_high}]
  const signalMap: Record<string, Record<string, number>> = {};
  for (const { signalName, level, count } of stats.signalDistribution) {
    if (!signalMap[signalName]) signalMap[signalName] = {};
    signalMap[signalName][level] = count;
  }
  const distributionData = Object.entries(signalMap).map(([name, levels]) => ({
    name: SIGNAL_LABELS[name] ?? name,
    ...Object.fromEntries(LEVEL_ORDER.map((l) => [l, levels[l] ?? 0])),
  }));

  // ── Divergence data (top 10, only signals that appear)
  const divergenceData = stats.validationStats.perSignalDivergence
    .filter((d) => d.divergenceRate > 0)
    .slice(0, 10)
    .map((d) => ({
      name: SIGNAL_LABELS[d.signalName] ?? d.signalName,
      divergence: Math.round(d.divergenceRate * 100),
    }));

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
          <KpiCard label="GPT Validated" value={String(stats.validationStats.totalValidated)} sub="estimations with cross-LLM check" />
          <KpiCard
            label="Avg Agreement"
            value={avgAgreement != null ? `${Math.round(avgAgreement * 100)}%` : '—'}
            sub="Claude vs GPT-4o-mini"
          />
          <KpiCard label="Projects w/ Actuals" value={String(accuracy.length)} sub="ground truth available" />
        </div>

        {/* ── COCOMO vs Hybrid vs Actual ── */}
        {accuracy.length > 0 && (
          <section>
            <SectionHeading>COCOMO vs Hybrid vs Actual (person-months)</SectionHeading>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={accuracy} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} unit=" PM" />
                  <Tooltip
                    contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }}
                    formatter={(v) => [`${Number(v).toFixed(1)} PM`]}
                  />
                  <Legend />
                  <Bar dataKey="cocomo"  name="COCOMO Baseline" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="hybrid"  name="Hybrid (LLM)"    fill="#22c55e" radius={[4,4,0,0]} />
                  <Bar dataKey="actual"  name="Actual"          fill="#eab308" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── Signal Level Distribution ── */}
        {distributionData.length > 0 && (
          <section>
            <SectionHeading>Signal Level Distribution (across all estimations)</SectionHeading>
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={distributionData} layout="vertical" margin={{ top: 4, right: 16, left: 120, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={116} />
                  <Tooltip
                    contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8 }}
                  />
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
