import {
  createUnknownFacts,
  type Locale,
  type LocalizedText,
  type Place,
  type PlaceType,
  type Region,
} from "@/lib/types";

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

/** Region/type must be supplied by a reviewed mapping, never guessed from a tag. */
export function normalizeVisitJejuRecord(
  raw: unknown,
  options: { region: Region; type: PlaceType; retrievedAt: string },
): VisitJejuDraft {
  const source = object(raw);
  const sourceId = plainText(source.contentsid, 100);
  const title = plainText(source.title, 120);
  const lat =
    typeof source.latitude === "number"
      ? source.latitude
      : Number(source.latitude);
  const lng =
    typeof source.longitude === "number"
      ? source.longitude
      : Number(source.longitude);
  if (
    !/^[a-zA-Z0-9_-]{1,100}$/.test(sourceId) ||
    !title ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < 32 ||
    lat > 35 ||
    lng < 125 ||
    lng > 128
  ) {
    throw new Error("VISITJEJU_INVALID_RECORD");
  }
  if (!Number.isFinite(Date.parse(options.retrievedAt)))
    throw new Error("INVALID_RETRIEVAL_DATE");
  const photo = object(object(source.repPhoto).photoid);
  const sourceUrl = `https://www.visitjeju.net/kr/detail/view?contentsid=${encodeURIComponent(sourceId)}`;
  return {
    place: {
      id: `vj-${sourceId}`.slice(0, 100),
      slug: `vj-${sourceId.toLowerCase().replace(/_/g, "-")}`.slice(0, 120),
      name: localizedOriginal(title),
      summary: localizedOriginal(plainText(source.introduction)),
      address: localizedOriginal(
        plainText(source.roadaddress || source.address, 300),
      ),
      district: localizedOriginal(
        plainText(object(source.region2cd).label, 80),
      ),
      region: options.region,
      type: options.type,
      lat,
      lng,
      image: "/assets/icons/map-pin.svg",
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
      durationMinutes: 0,
      facts: createUnknownFacts(),
      sourceId,
      sourceUrl,
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
    ],
  };
}

export const visitJejuLocale: Record<Locale, string> = {
  ko: "kr",
  en: "en",
  zh: "cn",
  ja: "jp",
};
