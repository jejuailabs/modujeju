import type { Fact, Locale, LocalizedText, Place, PlaceFacts } from "./types";
import { locales } from "./types";
import { getFactFreshness } from "./verdict/evaluate";
import { ageLimitMessage, weightLimitMessage } from "@/messages/conditions";
import { featureDetailMessages, featureMessages, featureSearchAliases } from "@/messages/features";

export const featureKeys = ["kids", "pet", "senior", "highChair", "stroller", "stepFree", "floorSeating", "tableSeating", "groundFloor", "parking", "toilet", "shortWalk"] as const;
export type FeatureKey = typeof featureKeys[number];
export type FeatureStatus = "yes" | "no" | "conditional" | "unknown";
export interface FeatureEvidence {
  source: "fact" | "observation" | "address";
  factKey?: keyof PlaceFacts;
  field?: string;
  sourceUrl?: string;
  checkedAt: string | null;
}
export interface PlaceFeature {
  key: FeatureKey;
  status: FeatureStatus;
  label: LocalizedText;
  description: LocalizedText;
  evidence: FeatureEvidence[];
}
export interface FeatureOptions { now?: Date; includeConditional?: boolean }

type FactReading = { value: unknown; evidence: FeatureEvidence; note?: LocalizedText };
type ObservationResult = { status: FeatureStatus; evidence: FeatureEvidence[] };
const physicalCycle = 365;

function joinText(...parts: (LocalizedText | undefined)[]): LocalizedText {
  return Object.fromEntries(locales.map(locale => [locale, parts.map(part => part?.[locale]).filter(Boolean).join(" ")])) as LocalizedText;
}

function readFact(place: Place, key: keyof PlaceFacts, now: Date, days = physicalCycle): FactReading | undefined {
  const fact: Fact<unknown> = place.facts[key];
  if (place.dataMode === "demo" && fact.source === "demo") {
    return { value: fact.value, evidence: { source: "fact", factKey: key, checkedAt: null }, note: fact.note };
  }
  if (!["official", "phone", "onsite"].includes(fact.source)) return undefined;
  // An explicit unknown can carry a useful restriction note, but never matches.
  const freshness = getFactFreshness({ ...fact, value: true }, now, days);
  if (freshness !== "fresh" && freshness !== "dueSoon") return undefined;
  return { value: fact.value, evidence: { source: "fact", factKey: key, checkedAt: fact.verifiedAt, ...(fact.sourceUrl ? { sourceUrl: fact.sourceUrl } : {}) }, note: fact.note };
}

function sourceEvidence(place: Place, sourceUrl: string | undefined, now: Date, verifiedAt: string | null = place.basicSourceCheckedAt ?? null): boolean {
  if (place.dataMode !== "live" || !place.sourceUrl || !sourceUrl) return false;
  if (!verifiedAt || verifiedAt < "2025-01-01") return false;
  const freshness = getFactFreshness({ value: true, source: "official", verifiedAt }, now, physicalCycle);
  if (freshness !== "fresh" && freshness !== "dueSoon") return false;
  try {
    const listing = new URL(place.sourceUrl), evidence = new URL(sourceUrl);
    if (listing.protocol !== "https:" || evidence.protocol !== "https:" || listing.username || listing.password || evidence.username || evidence.password || listing.port || evidence.port || listing.hostname !== evidence.hostname || listing.pathname !== evidence.pathname) return false;
    const sourceId = listing.searchParams.get("contentsid");
    return sourceId ? evidence.searchParams.get("contentsid") === sourceId && (!place.sourceId || place.sourceId === sourceId) : listing.search === evidence.search;
  } catch { return false; }
}

function observations(place: Place, fields: readonly string[], match: (value: string) => FeatureStatus | null, now: Date): ObservationResult | undefined {
  const matches = (place.sourceObservations ?? []).flatMap(observation => {
    const checkedAt = observation.verifiedAt === undefined ? place.basicSourceCheckedAt ?? null : observation.verifiedAt;
    if (!fields.includes(observation.field) || !sourceEvidence(place, observation.sourceUrl, now, checkedAt)) return [];
    const status = match(observation.value.trim());
    return status ? [{ status, evidence: { source: "observation" as const, field: observation.field, sourceUrl: observation.sourceUrl, checkedAt } }] : [];
  });
  if (!matches.length) return undefined;
  return { status: new Set(matches.map(match => match.status)).size === 1 ? matches[0].status : "unknown", evidence: matches.map(match => match.evidence) };
}

const amenityFields = ["amenities", "편의시설", "infantFacilities", "유아시설", "highChair"];
const seatFields = ["seating", "seatingType", "seatingArrangement", "좌석", "좌석형태", "좌석 형태"];
const floorFields = ["floor", "floorInfo", "floorInformation", "층수", "이용층", "영업층", "본문", "시설안내"];
const floorOnly = ["좌식", "좌식 좌석", "전 좌석 좌식", "좌식만", "좌식만 운영", "의자 없음"];
const chairOnly = ["입식", "입식 좌석", "의자 좌석", "테이블 좌석", "전 좌석 입식"];
const mixedSeats = ["좌식·입식 혼합", "입식·좌식 혼합", "좌식과 입식", "입식과 좌식", "좌식,입식", "입식,좌식"];

function token(value: string, candidates: readonly string[]): boolean {
  return value.split(/[,，]/u).some(value => candidates.includes(value.trim()));
}

function observedFeature(place: Place, key: FeatureKey, now: Date): ObservationResult | undefined {
  if (key === "highChair") return observations(place, amenityFields, value => {
    if (["유아의자 없음", "유아 의자 없음", "아기 의자 없음"].includes(value)) return "no";
    return token(value, ["유아의자", "유아 의자", "아기의자", "아기 의자"]) ? "yes" : null;
  }, now);
  if (key === "floorSeating" || key === "tableSeating") return observations(place, seatFields, value => {
    if (mixedSeats.includes(value)) return "conditional";
    if (floorOnly.includes(value)) return key === "floorSeating" ? "yes" : "no";
    if (chairOnly.includes(value)) return key === "tableSeating" ? "yes" : "no";
    return null;
  }, now);
  if (key === "groundFloor") {
    const observed = observations(place, floorFields, value => {
      if (["1층", "지상 1층", "1층 단독", "전 좌석 1층", "매장 전체가 1층입니다.", "매장은 1층에 있습니다.", "1층에 위치"].includes(value)) return "yes";
      if (/^(?:지상 )?(?:[2-9]|[1-9]\d+)층(?: 단독)?$/.test(value) || /^지하 ?\d+층(?: 단독)?$/.test(value)) return "no";
      return null;
    }, now);
    // A standalone floor suffix is source address evidence, not a step-free claim.
    // Multiple floors, basement, unit numbers and narrative prose are excluded.
    const address = place.address.ko.trim();
    const floorMentions = address.match(/(?:지하\s*)?\d+\s*층/g) ?? [];
    const addressFirstFloor = sourceEvidence(place, place.sourceUrl, now)
      && floorMentions.length === 1
      && /(?:^|[\s,])1층$/.test(address)
      && !/(?:지하|[~～\/·-]|및|부터|에서)\s*1층$/.test(address);
    const addressEvidence: FeatureEvidence = { source: "address", field: "address.ko", sourceUrl: place.sourceUrl, checkedAt: place.basicSourceCheckedAt ?? null };
    if (!addressFirstFloor) return observed;
    if (observed && observed.status !== "yes") return { status: "unknown", evidence: [...observed.evidence, addressEvidence] };
    return { status: "yes", evidence: [...(observed?.evidence ?? []), addressEvidence] };
  }
  if (key === "parking") return observations(place, ["amenities", "편의시설", "parking"], value => {
    if (["주차장 없음", "주차 불가"].includes(value)) return "no";
    if (token(value, ["매장 주차장", "전용 주차장", "매장 전용 주차장"])) return "yes";
    if (token(value, ["공용주차장", "공용 주차장", "공영주차장", "공영 주차장", "병문천 공영주차장"])) return "conditional";
    return null;
  }, now);
  if (key === "toilet") return observations(place, ["amenities", "편의시설", "toilet"], value => {
    if (["화장실 없음", "화장실 이용 불가"].includes(value)) return "no";
    if (value === "외부 화장실") return "conditional";
    return token(value, ["화장실", "실내 화장실"]) ? "yes" : null;
  }, now);
  return undefined;
}

/** Evidence-derived facilities, not a replacement for the whole-party verdict. */
export function getPlaceFeatures(place: Place, options: FeatureOptions = {}): PlaceFeature[] {
  const now = options.now ?? new Date();
  return featureKeys.map(key => {
    let status: FeatureStatus = "unknown";
    let reading: FactReading | undefined;
    const details: (LocalizedText | undefined)[] = [];
    const additionalEvidence: FeatureEvidence[] = [];
    if (key === "kids") {
      reading = readFact(place, "kidsEntry", now, 90);
      if (["yes", "no", "conditional"].includes(String(reading?.value))) status = reading!.value as FeatureStatus;
      const age = readFact(place, "minAge", now, 90);
      if (status === "yes" && typeof age?.value === "number" && age.value > 0) {
        status = "conditional"; details.push(ageLimitMessage(age.value)); additionalEvidence.push(age.evidence);
      }
    } else if (key === "pet") {
      reading = readFact(place, "petEntry", now, 90);
      if (reading?.value === "no") status = "no";
      if (reading?.value === "unknown" && reading.note) {
        const weight = readFact(place, "dogMaxWeight", now, 90), boundary = readFact(place, "dogWeightInclusive", now, 90);
        // A reviewed designated-room offer can be described conditionally. It
        // does not change petEntry, indoor access or the whole-party verdict.
        const roomPolicy = (place.sourceObservations ?? []).find(observation => {
          const checkedAt = observation.verifiedAt === undefined ? place.basicSourceCheckedAt ?? null : observation.verifiedAt;
          if (observation.field !== "petPolicyDisplayed" || !sourceEvidence(place, observation.sourceUrl, now, checkedAt)) return false;
          const policy = observation.value.match(/^반려동물 동반가능으로 안내됩니다\. 대상: (?:펫프렌들리룸|펫 동반 스위트·패밀리 객실)\. 반려견 (\d+(?:\.\d+)?)kg (미만|이하)\./);
          return policy && typeof weight?.value === "number" && weight.value === Number(policy[1]) && boundary?.value === (policy[2] === "이하");
        });
        if (roomPolicy && weight && boundary) {
          status = "conditional";
          details.push(weightLimitMessage(weight.value as number, boundary.value as boolean));
          additionalEvidence.push(weight.evidence, boundary.evidence, { source: "observation", field: roomPolicy.field, sourceUrl: roomPolicy.sourceUrl, checkedAt: roomPolicy.verifiedAt === undefined ? place.basicSourceCheckedAt ?? null : roomPolicy.verifiedAt });
        }
      }
      if (reading?.value === "indoor" || reading?.value === "outdoor") {
        const weight = readFact(place, "dogMaxWeight", now, 90), boundary = readFact(place, "dogWeightInclusive", now, 90), carrier = readFact(place, "carrierRequired", now, 90);
        status = reading.value === "indoor" && weight?.value === null && carrier?.value === false ? "yes" : "conditional";
        details.push(reading.value === "indoor" ? featureDetailMessages.indoor : featureDetailMessages.outdoor);
        if (typeof weight?.value === "number") {
          details.push(weightLimitMessage(weight.value, typeof boundary?.value === "boolean" ? boundary.value : "unknown"));
          additionalEvidence.push(weight.evidence); if (boundary) additionalEvidence.push(boundary.evidence);
        }
        if (carrier?.value === true) details.push(featureDetailMessages.carrier);
        if (!weight || weight.value === "unknown" || !carrier || carrier.value === "unknown") details.push(featureDetailMessages.petRulesUnknown);
        if (carrier) additionalEvidence.push(carrier.evidence);
      }
    } else if (["senior", "stepFree", "stroller"].includes(key)) {
      reading = readFact(place, key === "stroller" ? "stroller" : "stepFree", now);
      if (["yes", "no", "conditional"].includes(String(reading?.value))) status = reading!.value as FeatureStatus;
    } else if (key === "highChair") {
      reading = readFact(place, "highChair", now);
      if (typeof reading?.value === "boolean") status = reading.value ? "yes" : "no";
    } else if (key === "floorSeating" || key === "tableSeating") {
      reading = readFact(place, "seating", now);
      if (reading?.value === "mixed") status = "conditional";
      if (reading?.value === "floor") status = key === "floorSeating" ? "yes" : "no";
      if (reading?.value === "table") status = key === "tableSeating" ? "yes" : "no";
    } else if (key === "parking") {
      reading = readFact(place, "parking", now);
      if (reading?.value === "onsite") status = "yes";
      if (reading?.value === "nearby") status = "conditional";
      if (reading?.value === "none") status = "no";
    } else if (key === "toilet") {
      reading = readFact(place, "toilet", now);
      if (reading?.value === "inside") status = "yes";
      if (reading?.value === "outside") status = "conditional";
      if (reading?.value === "none") status = "no";
    } else if (key === "shortWalk") {
      reading = readFact(place, "walkingMinutes", now);
      if (typeof reading?.value === "number" && Number.isFinite(reading.value) && reading.value >= 0) status = reading.value <= 30 ? "yes" : "no";
    }
    let evidence = reading ? [reading.evidence, ...additionalEvidence] : additionalEvidence;
    // Curated facts outrank raw source observations; absence in a list is not no.
    if (status === "unknown" && !reading) {
      const observed = observedFeature(place, key, now);
      if (observed) { status = observed.status; evidence = observed.evidence; if (status === "unknown") details.push(featureDetailMessages.conflict); }
    }
    return { key, status, label: featureMessages[key].label, description: joinText(featureMessages[key][status], ...details, reading?.note), evidence };
  });
}

/** Every selected feature must be positively established. Unknown is not false. */
export function matchesPlaceFeatures(place: Place, selected: readonly FeatureKey[], options: FeatureOptions = {}): boolean {
  if (!selected.length) return true;
  const features = getPlaceFeatures(place, options);
  return selected.every(key => {
    const status = features.find(feature => feature.key === key)?.status;
    return status === "yes" || (options.includeConditional === true && status === "conditional");
  });
}

function searchToken(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\s·_-]+/gu, "").trim();
}

/** Exact aliases bypass ordinary tag/name matching, preventing false positives. */
export function getFeatureSearchKeys(query: string, locale: Locale = "ko"): FeatureKey[] {
  const parts = query.split(/[,，+]/u).map(searchToken).filter(Boolean);
  if (!parts.length) return [];
  const languageOrder = [locale, ...locales.filter(language => language !== locale)];
  const keys = parts.map(part => featureKeys.find(key => languageOrder.some(language =>
    [featureMessages[key].label[language], ...featureSearchAliases[key][language]].some(alias => searchToken(alias) === part)
  )));
  return keys.every((key): key is FeatureKey => key !== undefined) ? [...new Set(keys)] : [];
}

export function matchesFeatureSearch(place: Place, query: string, locale: Locale = "ko", options: FeatureOptions = {}): boolean {
  const keys = getFeatureSearchKeys(query, locale);
  return keys.length > 0 && matchesPlaceFeatures(place, keys, options);
}
