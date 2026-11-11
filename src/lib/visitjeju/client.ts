import "server-only";
import { assertCloudEnabled, ServiceError } from "@/lib/server/errors";
import { visitJejuLocale } from "./normalize";
import type { Locale } from "@/lib/types";

export interface VisitJejuPage {
  items: unknown[];
  currentPage: number;
  pageCount: number;
  totalCount: number;
}

function responseCount(value: unknown, maximum: number): number {
  const number = typeof value === "number" ? value : typeof value === "string" && /^\d{1,9}$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(number) || number < 0 || number > maximum) throw new ServiceError("VISITJEJU_INVALID_RESPONSE", 502);
  return number;
}

export function assertVisitJejuEnabled(): void {
  assertCloudEnabled();
  if (
    process.env.VISITJEJU_API_ENABLED !== "true" ||
    process.env.VISITJEJU_USAGE_APPROVED !== "true"
  ) {
    throw new ServiceError("VISITJEJU_DISABLED", 503);
  }
}

/** Opt-in only, after the API's billing/use terms and account contract are approved. */
export async function fetchVisitJejuPage(input: {
  page?: number;
  locale?: Locale;
  contentId?: string;
}): Promise<VisitJejuPage> {
  assertVisitJejuEnabled();
  const apiKey = process.env.VISITJEJU_API_KEY;
  const keyName = process.env.VISITJEJU_API_KEY_PARAM;
  if (!apiKey || !["apikey", "apiKey"].includes(keyName || ""))
    throw new ServiceError("VISITJEJU_CONFIGURATION", 503);
  const endpoint = process.env.VISITJEJU_API_URL;
  let url: URL;
  try {
    url = new URL(endpoint || "");
  } catch {
    throw new ServiceError("VISITJEJU_CONFIGURATION", 503);
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "api.visitjeju.net" ||
    url.pathname !== "/vsjApi/contents/searchList" ||
    url.port ||
    url.username ||
    url.password
  ) {
    throw new ServiceError("VISITJEJU_ENDPOINT_DENIED", 503);
  }
  const page = input.page ?? 1;
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    page > 10_000 ||
    (input.contentId && !/^[a-zA-Z0-9_-]{1,100}$/.test(input.contentId))
  )
    throw new ServiceError("INVALID_INPUT", 400);
  url.search = "";
  // Older installations configured "apikey". The provider accepts "apiKey" on the wire.
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("locale", visitJejuLocale[input.locale ?? "ko"]);
  url.searchParams.set("page", String(page));
  if (input.contentId) url.searchParams.set("cid", input.contentId);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new ServiceError("VISITJEJU_UNAVAILABLE", 502);
    const reader = response.body?.getReader();
    if (!reader) throw new ServiceError("VISITJEJU_INVALID_RESPONSE", 502);
    let body = "";
    let size = 0;
    const decoder = new TextDecoder();
    try {
      for (;;) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 2_000_000) {
          await reader.cancel();
          throw new ServiceError("VISITJEJU_RESPONSE_TOO_LARGE", 502);
        }
        body += decoder.decode(part.value, { stream: true });
      }
      body += decoder.decode();
    } finally {
      reader.releaseLock();
    }
    const mediaType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if ((mediaType === "text/html" || mediaType === "application/xhtml+xml") && body.trimStart().startsWith("<"))
      throw new ServiceError("VISITJEJU_HTML_RESPONSE", 502);
    const decoded: unknown = JSON.parse(body);
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) throw new ServiceError("VISITJEJU_INVALID_RESPONSE", 502);
    const payload = decoded as Record<string, unknown>;
    if (
      !["00", "200"].includes(String(payload.result)) ||
      String(payload.resultMessage).toLowerCase() !== "success" ||
      !Array.isArray(payload.items) ||
      payload.items.length > 1000
    )
      throw new ServiceError("VISITJEJU_INVALID_RESPONSE", 502);
    const currentPage = responseCount(payload.currentPage, 10_000),
      pageCount = responseCount(payload.pageCount, 10_000),
      totalCount = responseCount(payload.totalCount, 10_000_000),
      resultCount = responseCount(payload.resultCount, 1000),
      pageSize = responseCount(payload.pageSize, 1000);
    if (
      currentPage !== page || pageSize < 1 || resultCount !== payload.items.length || resultCount > pageSize || totalCount < resultCount ||
      (totalCount === 0 && (resultCount !== 0 || pageCount > 1)) ||
      (totalCount > 0 && (pageCount < 1 || pageCount !== Math.ceil(totalCount / pageSize))) ||
      (!input.contentId && totalCount > 0 && ((currentPage <= pageCount && resultCount !== Math.min(pageSize, totalCount - (currentPage - 1) * pageSize)) || (currentPage > pageCount && resultCount > 0)))
    )
      throw new ServiceError("VISITJEJU_INVALID_RESPONSE", 502);
    // The official cid example can retain the requested currentPage even when
    // its filtered pageCount is 1. The full-catalog path has stricter bounds.
    return { items: payload.items, currentPage, pageCount, totalCount };
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    // fetch exceptions may embed the URL and apiKey; return a fixed redacted error.
    throw new ServiceError("VISITJEJU_UNAVAILABLE", 502);
  }
}
