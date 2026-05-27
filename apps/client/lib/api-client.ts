/**
 * Central HTTP client for all requests to the NestJS backend.
 *
 * Usage:
 *   import { apiFetch } from '@/lib/api-client';
 *   const projects = await apiFetch<Project[]>('/projects');
 *
 * Never use raw fetch() in page or component files — always go through this module.
 */

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

/**
 * Typed fetch wrapper. Throws ApiError on non-2xx responses.
 */
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

/**
 * Triggers a new COCOMO II estimation run for the given project.
 * Returns the newly created Estimation record (status will be 'running' initially).
 */
export async function runEstimation(projectId: string): Promise<Estimation> {
  return apiFetch<Estimation>('/estimations', {
    method: 'POST',
    body: JSON.stringify({ projectId }),
  });
}

/**
 * Fetches all estimation runs associated with a given project, newest first.
 */
export async function getEstimationsByProject(
  projectId: string,
): Promise<Estimation[]> {
  return apiFetch<Estimation[]>(
    `/estimations?projectId=${encodeURIComponent(projectId)}`,
  );
}
