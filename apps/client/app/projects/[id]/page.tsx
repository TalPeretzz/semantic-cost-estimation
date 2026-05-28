'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { apiFetch, runEstimation, getEstimationsByProject, ApiError } from '@/lib/api-client';
import type { Estimation, EstimationStatus, Project } from '@sce/types';

interface PageProps {
  params: { id: string };
}

const STATUS_STYLES: Record<EstimationStatus, string> = {
  completed: 'bg-green-900 text-green-300 border border-green-700',
  running:   'bg-yellow-900 text-yellow-300 border border-yellow-700',
  failed:    'bg-red-900   text-red-300   border border-red-700',
  pending:   'bg-gray-800  text-gray-400  border border-gray-600',
};

function StatusBadge({ status }: { status: EstimationStatus }) {
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

function EstimationRow({ estimation }: { estimation: Estimation }) {
  const runDate = new Date(estimation.runAt).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <li className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted px-4 py-3 text-sm">
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground">{runDate}</span>
        {estimation.status === 'failed' && estimation.errorMessage && (
          <span className="text-red-400 text-xs">{estimation.errorMessage}</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {estimation.status === 'completed' && estimation.nominalEffortPm != null && (
          <span className="font-medium text-foreground">
            {estimation.nominalEffortPm.toFixed(1)}{' '}
            <span className="text-muted-foreground font-normal">person-months</span>
          </span>
        )}
        <StatusBadge status={estimation.status} />
      </div>
    </li>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { id } = params;

  const [project, setProject]         = useState<Project | null>(null);
  const [estimations, setEstimations] = useState<Estimation[]>([]);
  const [loadingPage, setLoadingPage] = useState(true);
  const [pageError, setPageError]     = useState<string | null>(null);
  const [running, setRunning]         = useState(false);
  const [runError, setRunError]       = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoadingPage(true);
    setPageError(null);
    try {
      const [fetchedProject, fetchedEstimations] = await Promise.all([
        apiFetch<Project>(`/projects/${id}`),
        getEstimationsByProject(id),
      ]);
      setProject(fetchedProject);
      setEstimations(fetchedEstimations);
    } catch (err) {
      setPageError(
        err instanceof ApiError && err.status === 404
          ? 'Project not found.'
          : 'Failed to load project data. Please try again.',
      );
    } finally {
      setLoadingPage(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleRunEstimation() {
    setRunning(true);
    setRunError(null);
    try {
      await runEstimation(id);
      setEstimations(await getEstimationsByProject(id));
    } catch (err) {
      setRunError(
        err instanceof ApiError
          ? err.message
          : 'Failed to start estimation. Please try again.',
      );
    } finally {
      setRunning(false);
    }
  }

  if (loadingPage) {
    return (
      <main className="min-h-screen px-6 py-16">
        <div className="mx-auto max-w-3xl space-y-6 animate-pulse">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded bg-muted" />)}
          </div>
          <div className="h-10 w-36 rounded bg-muted" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded bg-muted" />)}
          </div>
        </div>
      </main>
    );
  }

  if (pageError) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
        <div className="w-full max-w-md space-y-4 text-center">
          <p className="text-4xl font-bold text-muted-foreground">Error</p>
          <p className="text-muted-foreground">{pageError}</p>
          <Link href="/projects" className="inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-80">
            Back to Projects
          </Link>
        </div>
      </main>
    );
  }

  if (!project) return null;

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-10">
        <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-opacity hover:opacity-80">
          <span aria-hidden="true">&#8592;</span> All Projects
        </Link>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{project.name}</h1>
          <p className="text-sm text-muted-foreground">Project ID: {project.id}</p>
        </div>

        <section aria-labelledby="project-details-heading">
          <h2 id="project-details-heading" className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Project Details
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 rounded-lg border border-border bg-muted px-5 py-4 sm:grid-cols-3">
            <Field label="Domain"      value={project.domain} />
            <Field label="Size"        value={`${project.sizeKloc} KLOC`} />
            <Field label="Team Size"   value={project.teamSize} />
            <Field label="Experience"  value={project.experienceLevel.replace(/_/g, ' ')} />
            <Field label="Input Type"  value={project.inputType} />
            {project.actualEffortPm != null && (
              <Field label="Actual Effort" value={`${project.actualEffortPm.toFixed(1)} person-months`} />
            )}
          </div>
        </section>

        <section aria-labelledby="run-estimation-heading">
          <h2 id="run-estimation-heading" className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Estimation
          </h2>
          <button
            type="button"
            onClick={handleRunEstimation}
            disabled={running}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? 'Running...' : 'Run Estimation'}
          </button>
          {runError && <p className="mt-3 text-sm text-red-400" role="alert">{runError}</p>}
        </section>

        <section aria-labelledby="estimation-history-heading">
          <h2 id="estimation-history-heading" className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Estimation History
          </h2>
          {estimations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No estimations yet. Run one above to get started.</p>
          ) : (
            <ul className="space-y-2">
              {estimations.map((estimation) => (
                <EstimationRow key={estimation.id} estimation={estimation} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
