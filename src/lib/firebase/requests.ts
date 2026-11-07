"use client";

export async function requestJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof body.error?.code === "string" ? body.error.code : "REQUEST_FAILED",
    );
  return body as T;
}

export function errorCode(error: unknown): string {
  return error instanceof Error ? error.message : "REQUEST_FAILED";
}
