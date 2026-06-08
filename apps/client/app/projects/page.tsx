'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/api-client';
import type { Project } from '@sce/types';

interface PaginatedProjects {
  data: Project[];
  total: number;
  page: number;
  limit: number;
}

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

function ProjectListSkeleton() {
  return (
    <ul className="space-y-3 animate-pulse" aria-busy="true" aria-label="Loading projects">
      {Array.from({ length: 5 }).map((_, i) => (
        <li key={i} className="h-16 rounded-lg bg-muted" />
      ))}
    </ul>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      setLoading(true);
      setError(null);
      try {
        const result = await apiFetch<PaginatedProjects>('/projects');
        setProjects(result.data);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Failed to load projects. Please refresh the page.',
        );
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, []);

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Select a project to view details and run cost estimations.
          </p>
        </div>

        {loading && <ProjectListSkeleton />}

        {!loading && error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
        )}

        {!loading && !error && projects.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No projects found. Create one via the API to get started.
          </p>
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
    </main>
  );
}
