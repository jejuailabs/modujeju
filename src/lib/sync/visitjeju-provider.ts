import "server-only";
import { fetchVisitJejuPage } from "@/lib/visitjeju/client";
import { normalizeClassifiedVisitJejuRecord, isVisitJejuNormalizationError } from "@/lib/visitjeju/normalize";
import { assertSyncEnabled } from "./firestore-store";
import type { SyncProvider } from "./types";

export function createVisitJejuSyncProvider(): SyncProvider {
  assertSyncEnabled();
  return {
    fetchPage(page) { assertSyncEnabled(); return fetchVisitJejuPage({ page, locale: "ko" }); },
    normalize: normalizeClassifiedVisitJejuRecord,
    recordKey(raw) {
      if (!raw || typeof raw !== "object" || !("contentsid" in raw)) return null;
      return typeof raw.contentsid === "string" ? raw.contentsid : null;
    },
    classifyRecordError(error) {
      if (!isVisitJejuNormalizationError(error)) return null;
      return ["VISITJEJU_CATEGORY_UNMAPPED", "VISITJEJU_REGION_UNMAPPED", "VISITJEJU_CLASSIFICATION_CONFLICT", "VISITJEJU_INVALID_CLASSIFICATION"].includes(error.message) ? "SYNC_UNCLASSIFIED_RECORD" : "SYNC_INVALID_RECORD";
    },
  };
}
