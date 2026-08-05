'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  getEvaluations,
  runEvaluation,
  runEstimation,
  getEvaluationDetail,
  apiFetch,
  ApiError,
} from '@/lib/api-client';
import type { EvaluationRun, Project, PerProjectEvaluationRow } from '@sce/types';

interface EvaluationDetail extends EvaluationRun {
  perProjectRows: PerProjectEvaluationRow[];
}

function MetricCell({ value, compareValue }: { value: number; compareValue: number }) {
  const better = value < compareValue;
  const worse = value > compareValue;
  const cls = better ? 'text-green-600 dark:text-green-400' : worse ? 'text-red-600 dark:text-red-400' : 'text-foreground';
  return <span className={`font-medium ${cls}`}>{value.toFixed(2)}</span>;
}

function ImprovementBadge({ baseline, hybrid }: { baseline: number; hybrid: number }) {
  const pct = ((baseline - hybrid) / baseline) * 100;
  if (Math.abs(pct) < 0.5) {
    return <span className="rounded px-2 py-0.5 text-xs bg-gray-100 text-gray-600 border border-gray-300 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600">No change</span>;
  }
  const improved = pct > 0;
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium border ${improved ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900 dark:text-green-300 dark:border-green-700' : 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900 dark:text-red-300 dark:border-red-700'}`}>
      {improved ? '▼' : '▲'} {Math.abs(pct).toFixed(1)}% MAPE
    </span>
  );
}

function RunCard({ run, onSelect }: { run: EvaluationRun; onSelect: (id: string) => void }) {
  const date = new Date(run.runAt).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  return (
    <button
      onClick={() => onSelect(run.id)}
      className="w-full text-left rounded-lg border border-border bg-muted px-5 py-4 transition-colors hover:border-accent hover:bg-accent/10 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-foreground">{run.name}</span>
        <ImprovementBadge baseline={run.baselineMape} hybrid={run.hybridMape} />
      </div>
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span>{run.sampleSize} projects</span>
        <span>{date}</span>
        <span>Baseline MAPE: {run.baselineMape.toFixed(1)}%</span>
        <span>Hybrid MAPE: {run.hybridMape.toFixed(1)}%</span>
      </div>
    </button>
  );
}

function DirectionBadge({ predicted, actual }: { predicted: number; actual: number }) {
  const pct = ((predicted - actual) / actual) * 100;
  const over = pct > 0;
  return (
    <span className={`text-xs font-medium ${over ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
      {over ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function exportToCsv(detail: EvaluationDetail) {
  const rows = [
    ['Project', 'Actual (PM)', 'COCOMO (PM)', 'COCOMO Error%', 'Hybrid (PM)', 'Hybrid Error%', 'Winner'],
    ...detail.perProjectRows.map((r) => {
      const basePct = (r.baselineAbsoluteError / r.actualEffortPm * 100).toFixed(1);
      const hybPct  = (r.hybridAbsoluteError  / r.actualEffortPm * 100).toFixed(1);
      const winner  = r.hybridAbsoluteError < r.baselineAbsoluteError ? 'Hybrid' : 'COCOMO';
      return [r.projectName, r.actualEffortPm.toFixed(0), r.baselineEffortPm.toFixed(1), basePct, r.hybridEffortPm.toFixed(1), hybPct, winner];
    }),
    [],
    ['', '', 'MAE', detail.baselineMae.toFixed(2), '', detail.hybridMae.toFixed(2), ''],
    ['', '', 'RMSE', detail.baselineRmse.toFixed(2), '', detail.hybridRmse.toFixed(2), ''],
    ['', '', 'MAPE%', detail.baselineMape.toFixed(2), '', detail.hybridMape.toFixed(2), ''],
  ];
  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${detail.name.replace(/\s+/g, '_')}_evaluation.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function DetailPanel({ detail }: { detail: EvaluationDetail }) {
  const hybridWins = detail.hybridMape < detail.baselineMape;
  const improvement = ((detail.baselineMape - detail.hybridMape) / detail.baselineMape * 100);

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="flex justify-end">
        <button
          onClick={() => exportToCsv(detail)}
          className="rounded-md border border-border bg-muted px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Summary headline */}
      <div className={`rounded-lg border px-5 py-4 flex items-center gap-4 ${hybridWins ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20' : 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20'}`}>
        <span className={`text-2xl font-bold ${hybridWins ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {hybridWins ? '▲' : '▼'}
        </span>
        <div>
          <p className="font-semibold text-foreground">
            {hybridWins
              ? `Hybrid is ${improvement.toFixed(1)}% more accurate (MAPE: ${detail.baselineMape.toFixed(1)}% → ${detail.hybridMape.toFixed(1)}%)`
              : `COCOMO baseline is more accurate (MAPE: ${detail.baselineMape.toFixed(1)}% vs ${detail.hybridMape.toFixed(1)}%)`}
          </p>
          <p className="text-sm text-muted-foreground">{detail.sampleSize} projects evaluated</p>
        </div>
      </div>

      {/* Aggregate metrics table */}
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metric</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">COCOMO Baseline</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hybrid (LLM)</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Δ</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'MAE (PM)', b: detail.baselineMae, h: detail.hybridMae },
              { label: 'RMSE (PM)', b: detail.baselineRmse, h: detail.hybridRmse },
              { label: 'MAPE (%)', b: detail.baselineMape, h: detail.hybridMape },
            ].map(({ label, b, h }) => {
              const delta = h - b;
              const improved = delta < 0;
              return (
                <tr key={label} className="border-t border-border">
                  <td className="px-4 py-3 text-muted-foreground">{label}</td>
                  <td className="px-4 py-3"><MetricCell value={b} compareValue={h} /></td>
                  <td className="px-4 py-3"><MetricCell value={h} compareValue={b} /></td>
                  <td className={`px-4 py-3 text-sm font-medium ${improved ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Per-project breakdown */}
      {detail.perProjectRows.length > 0 && (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Actual</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">COCOMO</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">COCOMO%</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Hybrid</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Hybrid%</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Winner</th>
              </tr>
            </thead>
            <tbody>
              {detail.perProjectRows.map((row) => {
                const basePct = (row.baselineAbsoluteError / row.actualEffortPm) * 100;
                const hybPct  = (row.hybridAbsoluteError  / row.actualEffortPm) * 100;
                const hybridWinsRow = hybPct < basePct;
                return (
                  <tr key={row.projectId} className="border-t border-border">
                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{row.projectName}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.actualEffortPm.toFixed(0)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.baselineEffortPm.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right">
                      <DirectionBadge predicted={row.baselineEffortPm} actual={row.actualEffortPm} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{row.hybridEffortPm.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right">
                      <DirectionBadge predicted={row.hybridEffortPm} actual={row.actualEffortPm} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${hybridWinsRow ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'}`}>
                        {hybridWinsRow ? 'Hybrid' : 'COCOMO'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function EvaluationPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<EvaluationDetail | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [running, setRunning] = useState(false);
  const [runName, setRunName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rerunFirst, setRerunFirst] = useState(true);
  const [rerunProgress, setRerunProgress] = useState<{ done: number; total: number } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const loadPage = useCallback(async () => {
    setLoadingPage(true);
    try {
      const [fetchedProjects, fetchedRuns] = await Promise.all([
        apiFetch<{ data: Project[] }>('/projects?limit=100').then((r) => r.data),
        getEvaluations(),
      ]);
      setProjects(fetchedProjects.filter((p) => p.actualEffortPm != null));
      setRuns(fetchedRuns);
    } finally {
      setLoadingPage(false);
    }
  }, []);

  useEffect(() => { loadPage(); }, [loadPage]);

  async function handleSelectRun(id: string) {
    setLoadingDetail(true);
    setSelectedDetail(null);
    try {
      const detail = await getEvaluationDetail(id) as EvaluationDetail;
      setSelectedDetail(detail);
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleRunEvaluation(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!runName.trim()) { setFormError('Run name is required'); return; }
    if (selectedIds.size < 2) { setFormError('Select at least 2 projects'); return; }
    setRunning(true);
    setRerunProgress(null);
    try {
      const ids = Array.from(selectedIds);

      if (rerunFirst) {
        setRerunProgress({ done: 0, total: ids.length });
        for (let i = 0; i < ids.length; i++) {
          await runEstimation(ids[i]);
          setRerunProgress({ done: i + 1, total: ids.length });
        }
      }

      const result = await runEvaluation(runName.trim(), ids) as EvaluationDetail;
      setRuns((prev) => [result, ...prev]);
      setSelectedDetail(result);
      setRunName('');
      setSelectedIds(new Set());
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Evaluation failed. Please try again.');
    } finally {
      setRunning(false);
      setRerunProgress(null);
    }
  }

  function toggleProject(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (loadingPage) {
    return (
      <main className="min-h-screen px-6 py-16">
        <div className="mx-auto max-w-4xl space-y-6 animate-pulse">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-32 rounded bg-muted" />
          <div className="h-64 rounded bg-muted" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-4xl space-y-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Evaluation Dashboard</h1>
          <Link href="/dataset" className="text-sm text-muted-foreground transition-opacity hover:opacity-80">
            Import Dataset &rarr;
          </Link>
        </div>

        <section aria-labelledby="new-run-heading">
          <h2 id="new-run-heading" className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            New Evaluation Run
          </h2>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No projects with actual effort recorded. Add <code>actualEffortPm</code> to projects or{' '}
              <Link href="/dataset" className="underline">import a dataset</Link>.
            </p>
          ) : (
            <form onSubmit={handleRunEvaluation} className="space-y-4">
              <input
                type="text"
                placeholder="Run name (e.g. Phase 17 — 21 projects)"
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
                className="w-full max-w-sm rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set(projects.map((p) => p.id)))}
                  className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                >
                  Select all ({projects.length})
                </button>
                <span className="text-muted-foreground text-xs">·</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
                >
                  Deselect all
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((p) => (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors ${
                      selectedIds.has(p.id)
                        ? 'border-accent bg-accent/10 text-foreground'
                        : 'border-border bg-muted text-muted-foreground hover:border-accent/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => toggleProject(p.id)}
                      className="mt-0.5 accent-accent"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.sizeKloc} KLOC · actual: {p.actualEffortPm?.toFixed(1)} PM
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              {/* Re-run toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={rerunFirst}
                  onChange={(e) => setRerunFirst(e.target.checked)}
                  className="accent-accent"
                  disabled={running}
                />
                <span className="text-sm text-muted-foreground">
                  Re-run fresh estimations before evaluating
                  <span className="ml-1 text-xs text-muted-foreground/60">(uses latest prompt)</span>
                </span>
              </label>

              {/* Progress bar */}
              {rerunProgress && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Running estimations… {rerunProgress.done}/{rerunProgress.total}
                  </p>
                  <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-300"
                      style={{ width: `${(rerunProgress.done / rerunProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {formError && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{formError}</p>}
              <button
                type="submit"
                disabled={running}
                className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running
                  ? rerunProgress
                    ? `Estimating ${rerunProgress.done}/${rerunProgress.total}…`
                    : 'Evaluating…'
                  : `Run Evaluation (${selectedIds.size} projects)`}
              </button>
            </form>
          )}
        </section>

        {selectedDetail && (
          <section aria-labelledby="detail-heading">
            <h2 id="detail-heading" className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {selectedDetail.name} — Results
            </h2>
            <DetailPanel detail={selectedDetail} />
          </section>
        )}

        {loadingDetail && (
          <div className="space-y-2 animate-pulse">
            <div className="h-32 rounded bg-muted" />
            <div className="h-48 rounded bg-muted" />
          </div>
        )}

        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Previous Runs
          </h2>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No evaluation runs yet.</p>
          ) : (
            <ul className="space-y-2">
              {runs.map((run) => (
                <li key={run.id}>
                  <RunCard run={run} onSelect={handleSelectRun} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
