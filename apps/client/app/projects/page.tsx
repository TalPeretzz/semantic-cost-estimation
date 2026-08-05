'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { apiFetch, createProject, runEstimation, ApiError, type CreateProjectPayload } from '@/lib/api-client';
import { EstimationLoaderModal } from '@/components/EstimationLoaderModal';
import type { Project, DomainType, ExperienceLevel } from '@sce/types';

interface PaginatedProjects {
  data: Project[];
  total: number;
  page: number;
  limit: number;
}

// ── Quick defaults ────────────────────────────────────────────────────────────
const QUICK_DEFAULTS = {
  inputType: 'freetext'  as const,
  domain:    'semi-detached' as DomainType,
  sizeKloc:  10,
  teamSize:  5,
  experienceLevel: 'nominal' as ExperienceLevel,
};

// ── Sub-components ────────────────────────────────────────────────────────────
function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-lg border border-border bg-muted px-5 py-4 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <p className="truncate font-semibold text-foreground">{project.name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {project.domain} &middot; {project.sizeKloc} KLOC &middot; team {project.teamSize}
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{project.inputType}</span>
      </div>
    </Link>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-medium text-foreground mb-1">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent ${props.className ?? ''}`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent ${props.className ?? ''}`}
    />
  );
}

// ── New Project Modal ─────────────────────────────────────────────────────────
interface NewProjectModalProps {
  onClose: () => void;
  onCreated: (project: Project) => void;
  onQuickEstimate: (project: Project) => void;
}

function NewProjectModal({ onClose, onCreated, onQuickEstimate }: NewProjectModalProps) {
  const [tab, setTab] = useState<'quick' | 'advanced'>('quick');

  // Quick fields
  const [qName, setQName]   = useState('');
  const [qDesc, setQDesc]   = useState('');
  const [qError, setQError] = useState<string | null>(null);
  const [qBusy, setQBusy]   = useState(false);

  // Advanced fields
  const [aName, setAName]   = useState('');
  const [aDesc, setADesc]   = useState('');
  const [aDomain, setADomain]   = useState<DomainType>('semi-detached');
  const [aSize, setASize]       = useState('10');
  const [aTeam, setATeam]       = useState('5');
  const [aExp, setAExp]         = useState<ExperienceLevel>('nominal');
  const [aActual, setAActual]   = useState('');
  const [aError, setAError]     = useState<string | null>(null);
  const [aBusy, setABusy]       = useState(false);

  async function handleQuickSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qName.trim()) { setQError('Name is required'); return; }
    if (!qDesc.trim()) { setQError('Description is required'); return; }
    setQError(null);
    setQBusy(true);
    try {
      const project = await createProject({
        ...QUICK_DEFAULTS,
        name: qName.trim(),
        descriptionText: qDesc.trim(),
      });
      onQuickEstimate(project);
    } catch (err) {
      setQError(err instanceof ApiError ? err.message : 'Failed to create project.');
      setQBusy(false);
    }
  }

  async function handleAdvancedSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aName.trim()) { setAError('Name is required'); return; }
    if (!aDesc.trim()) { setAError('Description is required'); return; }
    const sizeNum = parseFloat(aSize);
    const teamNum = parseInt(aTeam, 10);
    if (isNaN(sizeNum) || sizeNum <= 0) { setAError('Size must be a positive number'); return; }
    if (isNaN(teamNum) || teamNum < 1 || teamNum > 500) { setAError('Team size must be between 1 and 500'); return; }
    setAError(null);
    setABusy(true);
    const payload: CreateProjectPayload = {
      name: aName.trim(),
      inputType: 'freetext',
      descriptionText: aDesc.trim(),
      domain: aDomain,
      sizeKloc: sizeNum,
      teamSize: teamNum,
      experienceLevel: aExp,
      actualEffortPm: aActual ? parseFloat(aActual) : null,
    };
    try {
      const project = await createProject(payload);
      onCreated(project);
    } catch (err) {
      setAError(err instanceof ApiError ? err.message : 'Failed to create project.');
      setABusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative mx-4 w-full max-w-lg rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="font-semibold text-foreground">New Project</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['quick', 'advanced'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'border-b-2 border-accent text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'quick' ? 'Quick Estimate' : 'Advanced'}
            </button>
          ))}
        </div>

        {/* Quick form */}
        {tab === 'quick' && (
          <form onSubmit={handleQuickSubmit} className="space-y-4 px-6 py-5">
            <p className="text-sm text-muted-foreground">
              Describe your project in plain text — COCOMO parameters use sensible defaults.
            </p>
            <div>
              <Label>Project name</Label>
              <Input
                placeholder="e.g. Real-Time Bidding Engine"
                value={qName}
                onChange={(e) => setQName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                placeholder="Describe the system, domain, key challenges, and any known constraints…"
                value={qDesc}
                onChange={(e) => setQDesc(e.target.value)}
                rows={5}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Defaults: semi-detached · 10 KLOC · team 5 · nominal experience
            </p>
            {qError && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{qError}</p>}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={qBusy}
                className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {qBusy ? 'Creating…' : 'Create & Estimate'}
              </button>
              <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Advanced form */}
        {tab === 'advanced' && (
          <form onSubmit={handleAdvancedSubmit} className="space-y-4 px-6 py-5 max-h-[70vh] overflow-y-auto">
            <div>
              <Label>Project name</Label>
              <Input placeholder="e.g. Hospital Patient Record System" value={aName} onChange={(e) => setAName(e.target.value)} autoFocus />
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                placeholder="Describe the system…"
                value={aDesc}
                onChange={(e) => setADesc(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Domain</Label>
                <Select value={aDomain} onChange={(e) => setADomain(e.target.value as DomainType)}>
                  <option value="organic">Organic</option>
                  <option value="semi-detached">Semi-detached</option>
                  <option value="embedded">Embedded</option>
                </Select>
              </div>
              <div>
                <Label>Size (KLOC)</Label>
                <Input type="number" min="0.1" step="0.1" value={aSize} onChange={(e) => setASize(e.target.value)} />
              </div>
              <div>
                <Label>Team size</Label>
                <Input type="number" min="1" max="500" value={aTeam} onChange={(e) => setATeam(e.target.value)} />
              </div>
              <div>
                <Label>Experience level</Label>
                <Select value={aExp} onChange={(e) => setAExp(e.target.value as ExperienceLevel)}>
                  <option value="very_low">Very Low</option>
                  <option value="low">Low</option>
                  <option value="nominal">Nominal</option>
                  <option value="high">High</option>
                  <option value="very_high">Very High</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>Actual effort in PM <span className="text-muted-foreground font-normal">(optional — for evaluation)</span></Label>
              <Input type="number" min="0.1" step="0.1" placeholder="e.g. 310" value={aActual} onChange={(e) => setAActual(e.target.value)} />
            </div>
            {aError && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{aError}</p>}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={aBusy}
                className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {aBusy ? 'Creating…' : 'Create Project'}
              </button>
              <button type="button" onClick={onClose} className="rounded-md border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects]         = useState<Project[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [showModal, setShowModal]       = useState(false);
  const [estimating, setEstimating]     = useState(false);
  const [estimationError, setEstimationError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<PaginatedProjects>('/projects');
      setProjects(result.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load projects. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  // Advanced create: just navigate to the new project
  function handleCreated(project: Project) {
    setShowModal(false);
    router.push(`/projects/${project.id}`);
  }

  // Quick create: auto-trigger estimation and show loader
  async function handleQuickEstimate(project: Project) {
    setShowModal(false);
    setEstimationError(null);
    setEstimating(true);
    try {
      const estimation = await runEstimation(project.id);
      router.push(`/estimation/${estimation.id}`);
    } catch (err) {
      setEstimationError(err instanceof ApiError ? err.message : 'Estimation failed. Please try again.');
      setEstimating(false);
      // Add project to list even if estimation failed
      setProjects((prev) => [project, ...prev]);
    }
  }

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
            <p className="text-sm text-muted-foreground">Select a project to view details and run estimations.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-80"
          >
            + New Project
          </button>
        </div>

        {loading && (
          <ul className="space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => <li key={i} className="h-16 rounded-lg bg-muted" />)}
          </ul>
        )}

        {!loading && error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
        )}

        {!loading && !error && projects.length === 0 && (
          <div className="rounded-lg border border-border bg-muted px-6 py-10 text-center space-y-3">
            <p className="text-muted-foreground">No projects yet.</p>
            <button
              onClick={() => setShowModal(true)}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-80"
            >
              Create your first project
            </button>
          </div>
        )}

        {!loading && !error && projects.length > 0 && (
          <ul className="space-y-3">
            {projects.map((project) => (
              <li key={project.id}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
          onQuickEstimate={handleQuickEstimate}
        />
      )}

      <EstimationLoaderModal
        isOpen={estimating}
        error={estimationError}
        onDismissError={() => { setEstimating(false); setEstimationError(null); }}
      />
    </main>
  );
}
