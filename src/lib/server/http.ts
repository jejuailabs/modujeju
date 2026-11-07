import { NextResponse } from "next/server";
import { z } from "zod";
import { ServiceError } from "./errors";

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  let expected: string;
  try {
    expected = new URL(configured || request.url).origin;
  } catch {
    throw new ServiceError("SERVER_CONFIGURATION", 503);
  }
  if (!origin || origin !== expected)
    throw new ServiceError("ORIGIN_DENIED", 403);
  if (request.headers.get("sec-fetch-site") === "cross-site")
    throw new ServiceError("ORIGIN_DENIED", 403);
}

/** Limit the streamed request body before JSON parsing, not just Content-Length. */
export async function readJson<T>(
  request: Request,
  schema: z.ZodType<T>,
  maxBytes = 32_768,
): Promise<T> {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    throw new ServiceError("CONTENT_TYPE", 415);
  }
  if (Number(request.headers.get("content-length") || 0) > maxBytes)
    throw new ServiceError("BODY_TOO_LARGE", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new ServiceError("INVALID_BODY", 400);
  const chunks: Uint8Array[] = [];
  let count = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      count += next.value.byteLength;
      if (count > maxBytes) {
        await reader.cancel();
        throw new ServiceError("BODY_TOO_LARGE", 413);
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const buffer = new Uint8Array(count);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(buffer));
  } catch {
    throw new ServiceError("INVALID_JSON", 400);
  }
  const result = schema.safeParse(value);
  if (!result.success)
    throw new ServiceError("INVALID_INPUT", 400, "Check the submitted fields.");
  return result.data;
}

export function errorResponse(error: unknown): NextResponse {
  // Never serialize Firebase error objects, request URLs, tokens or private keys.
  const known = error instanceof ServiceError;
  return NextResponse.json(
    {
      error: {
        code: known ? error.code : "REQUEST_FAILED",
        message: known ? error.message : "The request could not be completed.",
      },
    },
    {
      status: known ? error.status : 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

export function privateJson(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
