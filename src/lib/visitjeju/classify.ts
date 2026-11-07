import type { Region } from "@/lib/types";

/** Checked through the public UI on 2026-11-08; no authenticated API call. */
export const visitJejuClassificationEvidence = {
  checkedAt: "2026-11-08",
  guideUrl: "https://api.visitjeju.net/file/bbsattachment/filepath/202606/15/2f62f5a7-9d71-4d0c-a43c-54321cd4b06b.pdf",
  foodUrl: "https://www.visitjeju.net/kr/detail/list?menuId=DOM_000001719000000000&cate1cd=cate0000000005",
  cafeUrl: "https://www.visitjeju.net/kr/detail/list?menuId=DOM_000001719000000000&cate1cd=cate0000000005#p1&tag=%EC%B9%B4%ED%8E%98",
  stayUrl: "https://www.visitjeju.net/kr/detail/list?menuId=DOM_000001707000000000&cate1cd=cate0000000004",
  attractionUrl: "https://www.visitjeju.net/kr/detail/list?menuId=DOM_000001718000000000&cate1cd=cate0000000002",
} as const;

export type VisitJejuClassificationCode =
  | "VISITJEJU_CATEGORY_UNMAPPED"
  | "VISITJEJU_REGION_UNMAPPED"
  | "VISITJEJU_CLASSIFICATION_CONFLICT"
  | "VISITJEJU_INVALID_CLASSIFICATION";

export class VisitJejuClassificationError extends Error {
  constructor(public readonly code: VisitJejuClassificationCode) {
    super(code);
    this.name = "VisitJejuClassificationError";
  }
}

interface CodeLabel {
  value: string;
  label: string;
  refId: string;
}
interface ReviewedRegion {
  parent: string;
  parentLabel: string;
  label: string;
  region: Region;
}

// Numeric values and labels are the official page's visible radio controls.
// east/west/south/north are this app's editorial geography, not API values.
const regions: Readonly<Record<string, ReviewedRegion>> = {
  "11": { parent: "region1", parentLabel: "제주시", label: "제주시내", region: "north" },
  "12": { parent: "region1", parentLabel: "제주시", label: "애월", region: "west" },
  "13": { parent: "region1", parentLabel: "제주시", label: "한림", region: "west" },
  "14": { parent: "region1", parentLabel: "제주시", label: "한경", region: "west" },
  "15": { parent: "region1", parentLabel: "제주시", label: "조천", region: "east" },
  "16": { parent: "region1", parentLabel: "제주시", label: "구좌", region: "east" },
  "17": { parent: "region2", parentLabel: "서귀포시", label: "성산", region: "east" },
  "21": { parent: "region2", parentLabel: "서귀포시", label: "서귀포시내", region: "south" },
  "22": { parent: "region2", parentLabel: "서귀포시", label: "대정", region: "west" },
  "23": { parent: "region2", parentLabel: "서귀포시", label: "안덕", region: "south" },
  "24": { parent: "region2", parentLabel: "서귀포시", label: "중문", region: "south" },
  "25": { parent: "region2", parentLabel: "서귀포시", label: "남원", region: "south" },
  "26": { parent: "region2", parentLabel: "서귀포시", label: "표선", region: "east" },
  "31": { parent: "region3", parentLabel: "섬 속의 섬", label: "우도", region: "east" },
};

export type VisitJejuClassification =
  | { ok: true; region: Region; type: "restaurant" | "cafe" | "stay" | "attraction"; categoryBasis: "official-label" | "official-label-and-cafe-tag"; regionCode: string }
  | { ok: false; reason: VisitJejuClassificationCode };

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function codeLabel(value: unknown): CodeLabel | null {
  const candidate = object(value);
  if (!candidate || typeof candidate.value !== "string" || typeof candidate.label !== "string" || typeof candidate.refId !== "string") return null;
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(candidate.value) || !candidate.label || candidate.label.length > 80 || candidate.label !== candidate.label.trim()) return null;
  return { value: candidate.value, label: candidate.label, refId: candidate.refId };
}

/** Only exact official tag tokens participate; a venue name never classifies it. */
function hasCafeTag(source: Record<string, unknown>): boolean {
  return [source.tag, source.alltag].some(value => typeof value === "string"
    && value.split(/[,，#]/u).some(tag => tag.trim() === "카페"));
}

/** Unknown codes/labels are quarantined, never guessed from coordinates or names. */
export function classifyVisitJejuRecord(raw: unknown): VisitJejuClassification {
  const source = object(raw);
  if (!source) return { ok: false, reason: "VISITJEJU_INVALID_CLASSIFICATION" };
  const category = codeLabel(source.contentscd);
  if (!category) return { ok: false, reason: "VISITJEJU_INVALID_CLASSIFICATION" };
  if (category.refId !== `contentscd>${category.value}`) return { ok: false, reason: "VISITJEJU_CLASSIFICATION_CONFLICT" };
  // V1.1 documents c1 = 관광지 only. Do not invent c4/c5 from web cate1cd values.
  if (category.value === "c1" && category.label !== "관광지") return { ok: false, reason: "VISITJEJU_CLASSIFICATION_CONFLICT" };
  const attraction = category.value === "c1" && category.label === "관광지";
  if (!attraction && category.label !== "음식점" && category.label !== "숙박") return { ok: false, reason: "VISITJEJU_CATEGORY_UNMAPPED" };

  const parent = codeLabel(source.region1cd);
  const district = codeLabel(source.region2cd);
  if (!parent || !district) return { ok: false, reason: "VISITJEJU_INVALID_CLASSIFICATION" };
  const reviewed = regions[district.value];
  if (!reviewed) return { ok: false, reason: "VISITJEJU_REGION_UNMAPPED" };
  if (parent.refId !== `region>${parent.value}` || district.refId !== `${parent.value}>${district.value}`
    || parent.value !== reviewed.parent || parent.label !== reviewed.parentLabel || district.label !== reviewed.label) {
    return { ok: false, reason: "VISITJEJU_CLASSIFICATION_CONFLICT" };
  }
  const cafe = category.label === "음식점" && hasCafeTag(source);
  return { ok: true, region: reviewed.region, type: attraction ? "attraction" : category.label === "숙박" ? "stay" : cafe ? "cafe" : "restaurant", categoryBasis: cafe ? "official-label-and-cafe-tag" : "official-label", regionCode: district.value };
}
