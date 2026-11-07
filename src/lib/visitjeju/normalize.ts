import {
  createUnknownFacts,
  type Locale,
  type LocalizedText,
  type Place,
  type PlaceType,
  type Region,
} from "@/lib/types";
import { classifyVisitJejuRecord, VisitJejuClassificationError } from "./classify";

export interface VisitJejuDraft {
  place: Place;
  status: "draft";
  reviewWarnings: string[];
  /** An upstream image is a review candidate, never automatically published. */
  candidatePhotoUrl: string | null;
}

export function plainText(value: unknown, maxLength = 1200): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function safePhotoUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      value.length > 2048 ||
      !["api.cdn.visitjeju.net", "api.visitjeju.net"].includes(url.hostname)
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function localizedOriginal(value: string): LocalizedText {
  // Keep proper names unchanged until an official translation is available.
  return { ko: value, en: value, zh: value, ja: value };
}

/** Source tags are search metadata, never verified companion facts. */
export function normalizeVisitJejuTags(source: Record<string, unknown>): string[] {
  return [...new Set([source.alltag, source.tag].flatMap(value =>
    plainText(value, 6400).split(/[,，#]/u).map(tag => tag.trim().slice(0, 80)).filter(Boolean)
  ))].slice(0, 40);
}

export function isVisitJejuNormalizationError(error: unknown): error is Error {
  return error instanceof VisitJejuClassificationError
    || (error instanceof Error && ["VISITJEJU_INVALID_RECORD", "INVALID_RETRIEVAL_DATE"].includes(error.message));
}

/** Automatic sync entry point; manual imports may retain their reviewed mapping. */
export function normalizeClassifiedVisitJejuRecord(
  raw: unknown,
  options: { retrievedAt: string },
): VisitJejuDraft {
  const classification = classifyVisitJejuRecord(raw);
  if (!classification.ok) throw new VisitJejuClassificationError(classification.reason);
  return normalizeVisitJejuRecord(raw, { ...options, region: classification.region, type: classification.type });
}

/** Region/type must be supplied by a reviewed mapping, never guessed from a tag. */
export function normalizeVisitJejuRecord(
  raw: unknown,
  options: { region: Region; type: PlaceType; retrievedAt: string },
): VisitJejuDraft {
  const source = object(raw);
  // Never strip HTML or truncate identity; either could alias another place.
  const sourceId = typeof source.contentsid === "string" ? source.contentsid : "";
  const title = plainText(source.title, 120);
  const numericCoordinate = (value: unknown): number | null => {
    if (value === null || value === undefined || (typeof value === "string" && value.trim() === "")) return null;
    if (typeof value === "number") return value;
    return typeof value === "string" && /^-?\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : Number.NaN;
  };
  const latitude = numericCoordinate(source.latitude);
  const longitude = numericCoordinate(source.longitude);
  if (
    !/^[A-Z0-9_]{1,95}$/.test(sourceId) ||
    !title ||
    (latitude !== null && (!Number.isFinite(latitude) || latitude < 32 || latitude > 35)) ||
    (longitude !== null && (!Number.isFinite(longitude) || longitude < 125 || longitude > 128))
  ) {
    throw new Error("VISITJEJU_INVALID_RECORD");
  }
  if (!Number.isFinite(Date.parse(options.retrievedAt)))
    throw new Error("INVALID_RETRIEVAL_DATE");
  const basicSourceCheckedAt = new Date(Date.parse(options.retrievedAt) + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const photo = object(object(source.repPhoto).photoid);
  const sourceUrl = `https://www.visitjeju.net/kr/detail/view?contentsid=${encodeURIComponent(sourceId)}`;
  return {
    place: {
      id: `vj-${sourceId}`,
      slug: `vj-${sourceId.toLowerCase().replace(/_/g, "-")}`,
      name: localizedOriginal(title),
      summary: localizedOriginal(plainText(source.introduction, 240)),
      address: localizedOriginal(
        plainText(source.roadaddress || source.address, 300),
      ),
      district: localizedOriginal(
        plainText(object(source.region2cd).label, 80),
      ),
      region: options.region,
      type: options.type,
      lat: latitude !== null && longitude !== null ? latitude : null,
      lng: latitude !== null && longitude !== null ? longitude : null,
      image: "/assets/icons/map-pin.svg",
      imageKind: "placeholder",
      price: {
        amount: null,
        unit:
          options.type === "stay"
            ? "night"
            : options.type === "cafe"
              ? "drink"
              : "person",
        petExtra: null,
      },
      durationMinutes: null,
      facts: createUnknownFacts(),
      sourceId,
      sourceUrl,
      sourceName: "VisitJeju",
      sourceTags: normalizeVisitJejuTags(source),
      basicSourceCheckedAt,
      // V1.1 has no source-modification date. Retrieval must not fabricate one.
      sourceUpdatedAt: null,
      retrievedAt: options.retrievedAt,
      verifiedAt: null,
      dataMode: "live",
    },
    status: "draft",
    candidatePhotoUrl: safePhotoUrl(photo.imgpath),
    reviewWarnings: [
      "COMPANION_FACTS_UNVERIFIED",
      "PRICE_UNVERIFIED",
      "IMAGE_RIGHTS_UNVERIFIED",
      "TRANSLATIONS_UNREVIEWED",
      "DURATION_UNVERIFIED",
      "SOURCE_UPDATE_DATE_UNAVAILABLE",
    ],
  };
}

export const visitJejuLocale: Record<Locale, string> = {
  ko: "kr",
  en: "en",
  zh: "cn",
  ja: "jp",
};
