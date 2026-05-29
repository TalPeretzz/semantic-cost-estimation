import type { Estimation } from '@sce/types';

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

export async function getEstimationDetail(id: string): Promise<Estimation> {
  return apiFetch<Estimation>(`/estimations/${encodeURIComponent(id)}`);
}
