#!/usr/bin/env node
// Offline transform: VisitJeju API snapshot (research_notes/ingestion) -> catalog files.
// Reads only local files; never calls the API. Re-run after a new snapshot lands:
//   node scripts/build-visitjeju-attractions.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const INGEST = join(ROOT, "research_notes", "ingestion");
const CATALOG = join(ROOT, "research_notes", "catalog");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const REGION = {
  11: ["제주시내", "north"], 12: ["애월", "west"], 13: ["한림", "west"], 14: ["한경", "west"],
  15: ["조천", "east"], 16: ["구좌", "east"], 17: ["성산", "east"], 21: ["서귀포시내", "south"],
  22: ["대정", "west"], 23: ["안덕", "south"], 24: ["중문", "south"], 25: ["남원", "south"],
  26: ["표선", "east"], 31: ["우도", "east"],
};
const DURATION = { "1시간 미만": 45, "1~2시간": 90, "2~3시간": 150, "3시간 이상": 210 };
const NOISE_TAGS = new Set(["visitjeju", "비짓제주", ""]);

function plain(value, max) {
  if (typeof value !== "string") return "";
  return value
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
const split = (value) => plain(value, 6400).split(/[,，#]/u).map((t) => t.trim()).filter(Boolean);
const urlFor = (id) => `https://www.visitjeju.net/kr/detail/view?contentsid=${encodeURIComponent(id)}`;

function loadSnapshot() {
  const items = new Map();
  let retrievedAt = "";
  for (const file of readdirSync(INGEST).filter((name) => /^visitjeju-ko-pages-.*\.json$/.test(name))) {
    const snapshot = readJson(join(INGEST, file));
    retrievedAt = retrievedAt > snapshot.retrievedAt ? retrievedAt : snapshot.retrievedAt;
    for (const item of snapshot.items) items.set(item.contentsid, item);
  }
  return { items, checkedAt: retrievedAt.slice(0, 10) };
}

function idFromRecord(record) {
  if (record.sourceId) return record.sourceId;
  try { return new URL(record.sourceUrl).searchParams.get("contentsid"); } catch { return null; }
}

function existingIds() {
  const ids = new Set();
  for (const name of ["restaurants", "cafes", "stays", "attractions", "companion-spots", "researched-outings", "mommom-spots", "public-source-spots"]) {
    for (const record of readJson(join(CATALOG, `${name}.json`))) {
      const id = idFromRecord(record);
      if (id) ids.add(id);
    }
  }
  return ids;
}
function photographedIds() {
  const ids = new Map();
  for (const name of ["photos", "companion-photos", "mommom-photos", "public-source-photos"]) {
    for (const record of readJson(join(CATALOG, `${name}.json`))) ids.set(record.sourceId, record.photoUrl);
  }
  return ids;
}

const FACILITY = [
  ["parking", ["공용주차장", "주차장", "전용주차장", "주차"]],
  ["toilet", ["화장실"]],
  ["stepFree", ["단독접근가능", "단차없음"]],
  ["accessibleToilet", ["장애인 화장실"]],
  ["accessibleParking", ["장애인 전용 주차장", "장애인 주차"]],
  ["elevator", ["엘리베이터", "승강기"]],
  ["wheelchairRental", ["수동 휠체어 대여 가능", "전동 휠체어 대여 가능"]],
  ["nursingRoom", ["수유실", "수유실 완비"]],
  ["highChair", ["유아의자"]],
  ["kidsTableware", ["유아식기", "유아 식기", "유아용식기류"]],
  ["babyBed", ["유아침대"]],
];

function amenityMap(tokens, tagTokens, url, day) {
  const set = new Set(tokens);
  const found = {};
  const evidence = (matched) => ({
    value: "yes", source: "official", verifiedAt: day, sourceUrl: url,
    quote: `비짓제주 공식 태그: ${matched.join(", ")}`.slice(0, 160),
  });
  for (const [key, names] of FACILITY) {
    const matched = names.filter((name) => set.has(name));
    if (matched.length) found[key] = evidence(matched);
  }
  const play = tokens.filter((t) => /(놀이|키즈)/.test(t) && !/메뉴/.test(t));
  if (play.length) found.kidsPlay = evidence(play.slice(0, 3));
  const stroller = tokens.filter((t) => t.includes("유모차 대여"));
  if (stroller.length) found.strollerRental = evidence(stroller);
  const pet = tagTokens.filter((t) => t.startsWith("반려동물동반"));
  if (pet.length) found.petWelcome = evidence(pet.slice(0, 3));
  return found;
}

function admissionMap(tokens, tagTokens, url, day) {
  const set = new Set(tokens);
  const quote = `비짓제주 공식 태그: ${tokens.filter((t) => ["단독접근가능", "단차없음", "어린이 출입가능", "어린이 출입불가"].includes(t)).join(", ")}`.slice(0, 160);
  const base = { sourceUrl: url, verifiedAt: day, quote };
  const admissions = {};
  if (set.has("어린이 출입가능")) admissions.kids = { value: "yes", ...base };
  else if (set.has("어린이 출입불가")) admissions.kids = { value: "no", ...base };
  if (set.has("단독접근가능") || set.has("단차없음")) admissions.senior = { value: "yes", ...base };
  if (tagTokens.some((t) => t.startsWith("반려동물동반"))) {
    admissions.pet = {
      value: "outdoor", sourceUrl: url, verifiedAt: day,
      quote: `비짓제주 공식 태그: ${tagTokens.filter((t) => t.startsWith("반려동물동반")).slice(0, 2).join(", ")}`.slice(0, 160),
    };
  }
  return admissions;
}

function placeType(tagTokens) {
  return tagTokens.some((t) => ["산책로", "올레길", "둘레길", "트레킹", "숲길", "오름"].includes(t)) ? "walk" : "attraction";
}

function buildPatch(item, url, checkedAt) {
  const tagSet = new Set(split(item.tag));
  const tagTokens = [...new Set(split(item.tag))].filter((t) => !NOISE_TAGS.has(t.toLowerCase()));
  const extraTokens = [...new Set(split(item.alltag))].filter((t) => !tagSet.has(t) && !NOISE_TAGS.has(t.toLowerCase()));
  const observations = [];
  const push = (field, value) => { const text = plain(value, 1000); if (text) observations.push({ field, value: text, sourceUrl: url, verifiedAt: checkedAt }); };
  push("visitJejuIntro", item.introduction);
  const phone = plain(item.phoneno, 60);
  // Personal mobile numbers are not published without the owner's consent.
  if (phone && phone !== "*" && !/^010/.test(phone.replace(/[s-]/g, ""))) push("visitJejuPhone", phone);
  push("roadAddress", item.roadaddress);
  if (item.address && item.address !== item.roadaddress) push("jibunAddress", item.address);
  push("amenities", extraTokens.join(", "));
  const amenities = amenityMap(extraTokens, tagTokens, url, checkedAt);
  const admissions = admissionMap(extraTokens, tagTokens, url, checkedAt);
  return {
    sourceId: item.contentsid, observations,
    ...(Object.keys(amenities).length ? { amenities } : {}),
    ...(Object.keys(admissions).length ? { admissions } : {}),
  };
}

const { items, checkedAt } = loadSnapshot();
const known = existingIds();
const photographed = photographedIds();
const coordinates = {};
const spots = [], photos = [], enrichment = [], backfill = [], existingPatches = [], thumbs = {};
let skippedIdentity = 0;

for (const item of items.values()) {
  const id = item.contentsid;
  const photo = item.repPhoto?.photoid ?? {};
  const cdn = (value) => typeof value === "string" && value.startsWith("https://api.cdn.visitjeju.net/photomng/") ? value : null;
  const imgpath = cdn(photo.imgpath), thumbpath = cdn(photo.thumbnailpath);
  const title = plain(item.title, 120);
  const url = urlFor(id);

  if (known.has(id)) {
    existingPatches.push(buildPatch(item, url, checkedAt));
    if (typeof item.latitude === "number" && typeof item.longitude === "number" && item.latitude >= 32 && item.latitude <= 35 && item.longitude >= 125 && item.longitude <= 128) coordinates[id] = [item.latitude, item.longitude];
    if (!imgpath) continue;
    if (!photographed.has(id)) backfill.push({ sourceId: id, sourceUrl: url, photoUrl: imgpath, ...(thumbpath ? { thumbUrl: thumbpath } : {}), alt: `${title} 대표 사진`, observedAt: checkedAt, sourceName: "비짓제주" });
    else if (photographed.get(id) === imgpath && thumbpath) thumbs[id] = thumbpath;
    continue;
  }
  if (item.contentscd?.value !== "c1" || !/^[A-Z0-9_]{1,95}$/.test(id) || !title) { skippedIdentity += 1; continue; }
  const region = REGION[Number(item.region2cd?.value)];
  const address = plain(item.roadaddress || item.address, 300);
  if (!region || !address) { skippedIdentity += 1; continue; }
  const lat = typeof item.latitude === "number" ? item.latitude : null;
  const lng = typeof item.longitude === "number" ? item.longitude : null;
  const located = lat !== null && lng !== null && lat >= 32 && lat <= 35 && lng >= 125 && lng <= 128;
  const tagTokens = [...new Set(split(item.tag))].filter((t) => !NOISE_TAGS.has(t.toLowerCase()));
  const tagSet = new Set(split(item.tag));
  const extraTokens = [...new Set(split(item.alltag))].filter((t) => !tagSet.has(t));
  const duration = extraTokens.map((t) => DURATION[t]).find(Boolean) ?? null;

  spots.push({
    name: title, address, summary: plain(item.introduction, 1200) || title, district: region[0], region: region[1],
    type: placeType(tagTokens), sourceUrl: url, sourceId: id, sourceName: "VisitJeju",
    sourceTags: tagTokens.map((t) => t.slice(0, 80)).slice(0, 40),
    retrievedAt: checkedAt, basicSourceCheckedAt: checkedAt,
    ...(located ? { lat, lng } : {}),
    ...(duration ? { durationMinutes: duration } : {}),
  });
  if (imgpath) photos.push({ sourceId: id, sourceUrl: url, photoUrl: imgpath, ...(thumbpath ? { thumbUrl: thumbpath } : {}), alt: `${title} 대표 사진`, observedAt: checkedAt, sourceName: "비짓제주" });
  enrichment.push(buildPatch(item, url, checkedAt));
}

const write = (name, value) => writeFileSync(join(CATALOG, name), `${JSON.stringify(value)}
`);
write("visitjeju-attraction-spots.json", spots);
write("visitjeju-attraction-photos.json", photos);
write("visitjeju-attraction-enrichment.json", enrichment);
write("visitjeju-photo-backfill.json", backfill);
write("visitjeju-thumbs.json", thumbs);
write("visitjeju-existing-patches.json", existingPatches);
write("visitjeju-coordinates.json", coordinates);
console.log(JSON.stringify({ snapshotItems: items.size, checkedAt, newAttractions: spots.length, newPhotos: photos.length, enrichment: enrichment.length, photoBackfill: backfill.length, thumbs: Object.keys(thumbs).length, existingPatches: existingPatches.length, skippedIdentity, walk: spots.filter((s) => s.type === "walk").length, withCoords: spots.filter((s) => s.lat !== undefined).length }));
