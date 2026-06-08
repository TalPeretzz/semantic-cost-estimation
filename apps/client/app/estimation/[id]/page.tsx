'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getEstimationDetail, ApiError } from '@/lib/api-client';
import type { Estimation, Signal } from '@sce/types';

interface PageProps {
  params: { id: string };
}

const SIGNAL_LABELS: Record<string, string> = {
  functional_complexity:    'Functional Complexity',
  architectural_complexity: 'Architectural Complexity',
  external_integrations:    'External Integrations',
  requirement_stability:    'Requirement Stability',
  uncertainty:              'Uncertainty',
};

const LEVEL_LABELS: Record<string, string> = {
  very_low:  'Very Low',
  low:       'Low',
  medium:    'Medium',
  high:      'High',
  very_high: 'Very High',
};

function factorStyle(factor: number): string {
  if (factor < 1) return 'text-green-400';
  if (factor > 1) return 'text-red-400';
  return 'text-muted-foreground';
}

function factorBadgeStyle(factor: number): string {
  if (factor < 1) return 'bg-green-900 text-green-300 border border-green-700';
  if (factor > 1) return 'bg-red-900 text-red-300 border border-red-700';
  return 'bg-gray-800 text-gray-400 border border-gray-600';
}

function EffortBar({ nominal, hybrid }: { nominal: number; hybrid: number }) {
  const max = Math.max(nominal, hybrid) * 1.15;
  const nominalPct = (nominal / max) * 100;
  const hybridPct = (hybrid / max) * 100;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">COCOMO Baseline</span>
          <span className="font-medium text-foreground">{nominal.toFixed(1)} PM</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{ width: `${nominalPct}%` }}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Hybrid (LLM-adjusted)</span>
          <span className={`font-medium ${factorStyle(hybrid / nominal)}`}>
            {hybrid.toFixed(1)} PM
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all duration-500 ${hybrid <= nominal ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${hybridPct}%` }}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {hybrid < nominal
          ? `LLM signals reduce effort by ${((1 - hybrid / nominal) * 100).toFixed(1)}%`
          : hybrid > nominal
          ? `LLM signals increase effort by ${((hybrid / nominal - 1) * 100).toFixed(1)}%`
          : 'LLM signals have no net effect on effort'}
      </p>
    </div>
  );
}

function SignalRow({ signal }: { signal: Signal }) {
  return (
    <tr className="border-t border-border">
      <td className="py-3 pr-4 text-sm font-medium text-foreground">
        {SIGNAL_LABELS[signal.signalName] ?? signal.signalName}
      </td>
      <td className="py-3 pr-4 text-sm text-muted-foreground">
        {LEVEL_LABELS[signal.rawLevel] ?? signal.rawLevel}
      </td>
      <td className="py-3 pr-4 text-sm text-center text-muted-foreground">
        {signal.ordinal > 0 ? `+${signal.ordinal}` : signal.ordinal}
      </td>
      <td className="py-3 pr-4 text-sm text-center">
        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${factorBadgeStyle(signal.adjustmentFactor)}`}>
          {signal.adjustmentFactor > 1 ? '+' : ''}{((signal.adjustmentFactor - 1) * 100).toFixed(0)}%
        </span>
      </td>
      <td className="py-3 text-xs text-muted-foreground">{signal.llmRationale}</td>
    </tr>
  );
}

function FormulaTrace({ estimation }: { estimation: Estimation }) {
  const { nominalEffortPm, hybridEffortPm, adjustmentResult } = estimation;
  if (!nominalEffortPm || !hybridEffortPm || !adjustmentResult) return null;

  const { perSignalBreakdown, productOfFactors } = adjustmentResult;

  return (
    <div className="rounded-lg border border-border bg-muted px-5 py-4 font-mono text-sm space-y-2">
      <p className="text-muted-foreground text-xs uppercase tracking-wider mb-3">Formula Trace</p>
      <p className="text-foreground">
        E<sub>nom</sub> = <span className="text-blue-400">{nominalEffortPm.toFixed(2)}</span> PM
      </p>
      {perSignalBreakdown.map((s) => (
        <p key={s.signalName} className="text-foreground">
          A<sub>{SIGNAL_LABELS[s.signalName]?.split(' ')[0]}</sub>{' '}
          = 1 + ({s.ordinal > 0 ? `+${s.ordinal}` : s.ordinal} × 0.1){' '}
          = <span className={factorStyle(s.factor)}>{s.factor.toFixed(2)}</span>
        </p>
      ))}
      <p className="text-foreground border-t border-border pt-2 mt-2">
        ∏ A<sub>i</sub> = <span className={factorStyle(productOfFactors)}>{productOfFactors.toFixed(4)}</span>
      </p>
      <p className="text-foreground font-semibold">
        E<sub>final</sub> = {nominalEffortPm.toFixed(2)} × {productOfFactors.toFixed(4)}{' '}
        = <span className={factorStyle(hybridEffortPm / nominalEffortPm)}>{hybridEffortPm.toFixed(2)}</span> PM
      </p>
    </div>
  );
}

export default function EstimationDetailPage({ params }: PageProps) {
  const { id } = params;
  const [estimation, setEstimation] = useState<Estimation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getEstimationDetail(id)
      .then(setEstimation)
      .catch((err) => {
        setError(
          err instanceof ApiError && err.status === 404
            ? 'Estimation not found.'
            : 'Failed to load estimation.',
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen px-6 py-16">
        <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-8 w-64 rounded bg-muted" />
          <div className="h-32 rounded bg-muted" />
          <div className="h-64 rounded bg-muted" />
        </div>
      </main>
    );
  }

  if (error || !estimation) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
        <div className="w-full max-w-md space-y-4 text-center">
          <p className="text-4xl font-bold text-muted-foreground">Error</p>
          <p className="text-muted-foreground">{error ?? 'Estimation not found.'}</p>
          <Link href="/projects" className="inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-80">
            Back to Projects
          </Link>
        </div>
      </main>
    );
  }

  const isCompleted = estimation.status === 'completed';
  const hasSignals = estimation.signals && estimation.signals.length > 0;

  const runDate = new Date(estimation.runAt).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-10">
        <Link
          href={`/projects/${estimation.projectId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-opacity hover:opacity-80"
        >
          <span aria-hidden="true">&#8592;</span> Back to Project
        </Link>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Estimation Detail</h1>
          <p className="text-sm text-muted-foreground">Run on {runDate}</p>
        </div>

        {estimation.status === 'failed' && (
          <div className="rounded-lg border border-red-700 bg-red-900/30 px-5 py-4">
            <p className="text-sm font-medium text-red-300">Estimation failed</p>
            {estimation.errorMessage && (
              <p className="mt-1 text-xs text-red-400">{estimation.errorMessage}</p>
            )}
          </div>
        )}

        {isCompleted && estimation.nominalEffortPm != null && estimation.hybridEffortPm != null && (
          <section aria-labelledby="effort-heading">
            <h2 id="effort-heading" className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Effort Estimate
            </h2>
            <div className="rounded-lg border border-border bg-muted px-5 py-4">
              <EffortBar
                nominal={estimation.nominalEffortPm}
                hybrid={estimation.hybridEffortPm}
              />
            </div>
          </section>
        )}

        {hasSignals && (
          <section aria-labelledby="signals-heading">
            <h2 id="signals-heading" className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              LLM Signal Breakdown
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="py-2.5 pr-4 pl-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Signal</th>
                    <th className="py-2.5 pr-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Level</th>
                    <th className="py-2.5 pr-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ordinal</th>
                    <th className="py-2.5 pr-4 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Factor</th>
                    <th className="py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rationale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border px-4">
                  {estimation.signals.map((signal) => (
                    <tr key={signal.signalName} className="border-t border-border px-4">
                      <td className="py-3 pr-4 pl-4 text-sm font-medium text-foreground">
                        {SIGNAL_LABELS[signal.signalName] ?? signal.signalName}
                      </td>
                      <td className="py-3 pr-4 text-sm text-muted-foreground">
                        {LEVEL_LABELS[signal.rawLevel] ?? signal.rawLevel}
                      </td>
                      <td className="py-3 pr-4 text-sm text-center text-muted-foreground">
                        {signal.ordinal > 0 ? `+${signal.ordinal}` : signal.ordinal}
                      </td>
                      <td className="py-3 pr-4 text-sm text-center">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${factorBadgeStyle(signal.adjustmentFactor)}`}>
                          {signal.adjustmentFactor > 1 ? '+' : ''}{((signal.adjustmentFactor - 1) * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-3 text-xs text-muted-foreground">{signal.llmRationale}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {isCompleted && estimation.adjustmentResult && (
          <section aria-labelledby="formula-heading">
            <h2 id="formula-heading" className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Formula Trace
            </h2>
            <FormulaTrace estimation={estimation} />
          </section>
        )}
      </div>
    </main>
  );
}
