"use client";

import type { ApiError } from "./generated";
import createClient from "openapi-fetch";
import type { paths } from "./openapi";

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
const openapiBaseUrl = baseUrl.endsWith("/api/v1")
  ? baseUrl.slice(0, -7)
  : baseUrl;
export const openapiClient = createClient<paths>({
  baseUrl: openapiBaseUrl,
  credentials: "include",
});
let csrfToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly payload: ApiError,
  ) {
    super(payload.message);
  }
}

async function csrf() {
  if (csrfToken) return csrfToken;
  const response = await fetch(`${baseUrl}/auth/csrf`, {
    credentials: "include",
  });
  if (!response.ok)
    throw new Error("Não foi possível iniciar uma sessão segura.");
  csrfToken = ((await response.json()) as { csrfToken: string }).csrfToken;
  return csrfToken;
}

async function refresh() {
  refreshPromise ??= (async () => {
    const token = await csrf();
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "x-csrf-token": token },
    });
    return response.ok;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const method = init.method?.toUpperCase() ?? "GET";
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData))
    headers.set("content-type", "application/json");
  if (!["GET", "HEAD", "OPTIONS"].includes(method))
    headers.set("x-csrf-token", await csrf());
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  if (
    response.status === 401 &&
    retry &&
    path !== "/auth/login" &&
    (await refresh())
  )
    return api<T>(path, init, false);
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({
      code: "HTTP_ERROR",
      message: "Não foi possível concluir a solicitação.",
      statusCode: response.status,
      timestamp: new Date().toISOString(),
    }))) as ApiError;
    throw new ApiClientError(response.status, payload);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function download(path: string) {
  const response = await fetch(`${baseUrl}${path}`, { credentials: "include" });
  if (!response.ok) throw new Error("Não foi possível exportar o relatório.");
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition");
  const filename = disposition?.match(/filename="([^"]+)"/)?.[1] ?? "relatorio";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const resetCsrf = () => {
  csrfToken = null;
};
