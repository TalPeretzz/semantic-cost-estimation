'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  getEvaluations,
  runEvaluation,
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

function DetailPanel({ detail }: { detail: EvaluationDetail }) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Metric</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Baseline</th>
              <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hybrid</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'MAE (person-months)', b: detail.baselineMae, h: detail.hybridMae },
              { label: 'RMSE (person-months)', b: detail.baselineRmse, h: detail.hybridRmse },
              { label: 'MAPE (%)', b: detail.baselineMape, h: detail.hybridMape },
            ].map(({ label, b, h }) => (
              <tr key={label} className="border-t border-border">
                <td className="px-4 py-3 text-muted-foreground">{label}</td>
                <td className="px-4 py-3"><MetricCell value={b} compareValue={h} /></td>
                <td className="px-4 py-3"><MetricCell value={h} compareValue={b} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail.perProjectRows.length > 0 && (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actual</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Baseline</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hybrid</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Baseline Err</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hybrid Err</th>
              </tr>
            </thead>
            <tbody>
              {detail.perProjectRows.map((row) => (
                <tr key={row.projectId} className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-foreground">{row.projectName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.actualEffortPm.toFixed(1)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.baselineEffortPm.toFixed(1)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.hybridEffortPm.toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <MetricCell value={row.baselineAbsoluteError} compareValue={row.hybridAbsoluteError} />
                  </td>
                  <td className="px-4 py-3">
                    <MetricCell value={row.hybridAbsoluteError} compareValue={row.baselineAbsoluteError} />
                  </td>
                </tr>
              ))}
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
    try {
      const result = await runEvaluation(runName.trim(), Array.from(selectedIds)) as EvaluationDetail;
      setRuns((prev) => [result, ...prev]);
      setSelectedDetail(result);
      setRunName('');
      setSelectedIds(new Set());
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Evaluation failed. Please try again.');
    } finally {
      setRunning(false);
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
                placeholder="Run name (e.g. Experiment 1)"
                value={runName}
                onChange={(e) => setRunName(e.target.value)}
                className="w-full max-w-sm rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
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
              {formError && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{formError}</p>}
              <button
                type="submit"
                disabled={running}
                className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running ? 'Running...' : `Run Evaluation (${selectedIds.size} projects)`}
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
