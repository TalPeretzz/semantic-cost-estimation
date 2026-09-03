import type { Estimation, EvaluationRun, ImportResult, Project, DomainType, ExperienceLevel } from '@sce/types';

export interface CreateProjectPayload {
  name: string;
  inputType: 'freetext' | 'structured';
  descriptionText?: string;
  descriptionJson?: Record<string, string>;
  domain: DomainType;
  sizeKloc: number;
  teamSize: number;
  experienceLevel: ExperienceLevel;
  actualEffortPm?: number | null;
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${API_BASE}${path}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status} ${response.statusText}`;

    try {
      const body = (await response.json()) as { message?: string };
      if (typeof body.message === 'string') {
        message = body.message;
      }
    } catch {
      // Body was not JSON — keep the default message.
    }

    throw new ApiError(response.status, message);
  }

  // 204 No Content — return undefined cast to T
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function runEstimation(projectId: string): Promise<Estimation> {
  return apiFetch<Estimation>('/estimations', {
    method: 'POST',
    body: JSON.stringify({ projectId }),
  });
}

export async function getEstimationsByProject(
  projectId: string,
): Promise<Estimation[]> {
  return apiFetch<Estimation[]>(
    `/estimations?projectId=${encodeURIComponent(projectId)}`,
  );
}

export async function getAllEstimations(): Promise<Estimation[]> {
  return apiFetch<Estimation[]>('/estimations');
}

export async function getEstimationDetail(id: string): Promise<Estimation> {
  return apiFetch<Estimation>(`/estimations/${encodeURIComponent(id)}`);
}

export async function runEvaluation(
  name: string,
  projectIds: string[],
): Promise<EvaluationRun> {
  return apiFetch<EvaluationRun>('/evaluations', {
    method: 'POST',
    body: JSON.stringify({ name, projectIds }),
  });
}

export async function getEvaluations(): Promise<EvaluationRun[]> {
  return apiFetch<EvaluationRun[]>('/evaluations');
}

export async function getEvaluationDetail(id: string): Promise<EvaluationRun> {
  return apiFetch<EvaluationRun>(`/evaluations/${encodeURIComponent(id)}`);
}

export async function getProjects(): Promise<{ data: Project[] }> {
  return apiFetch<{ data: Project[] }>('/projects');
}

export interface EstimationStats {
  totalEstimations: number;
  validationStats: {
    totalValidated: number;
    avgAgreementRate: number | null;
    perSignalDivergence: { signalName: string; divergenceRate: number }[];
  };
  signalDistribution: { signalName: string; level: string; count: number }[];
}

export async function getEstimationStats(): Promise<EstimationStats> {
  return apiFetch<EstimationStats>('/estimations/stats');
}

export async function importDataset(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const url = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/datasets/import`;
  const response = await fetch(url, { method: 'POST', body: formData });
  if (!response.ok) {
    let message = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (typeof body.message === 'string') message = body.message;
    } catch { /* keep default */ }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<ImportResult>;
}
