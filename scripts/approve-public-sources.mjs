#!/usr/bin/env node
// Stamp the operator approval date on public-source evidence
// (research_notes/catalog/public-source-enrichment.json and visitjeju-facilities.json):
// VisitJeju API facility tags, 이지제주 accessibility,
// 식품안전나라 pet-entry restaurants and VisitJeju pet tags. Unapproved items
// are never shown or used in a verdict.
//
//   node scripts/approve-public-sources.mjs --list
//   node scripts/approve-public-sources.mjs --all
//   node scripts/approve-public-sources.mjs CNTS_000000000012345 CONT_...
//   node scripts/approve-public-sources.mjs --date 2026-11-11 --all
//   node scripts/approve-public-sources.mjs --revoke CNTS_...
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const files = ["public-source-enrichment.json", "visitjeju-facilities.json"].map((name) =>
  fileURLToPath(new URL(`../research_notes/catalog/${name}`, import.meta.url)));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const dateIndex = args.indexOf("--date");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
const date = dateIndex >= 0 ? args[dateIndex + 1] : today;
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) throw new Error("--date must be YYYY-MM-DD");
const ids = args.filter((arg, index) => /^(CNTS|CONT)_\d+$/.test(arg) && args[index - 1] !== "--date");

const sets = files.map((file) => ({ file, records: JSON.parse(readFileSync(file, "utf8")) }));
const records = sets.flatMap((set) => set.records);
const evidenceOf = (record) => [...Object.values(record.amenities ?? {}), ...Object.values(record.admissions ?? {})];

if (flag("--list") || (!flag("--all") && !ids.length)) {
  for (const record of records) {
    const items = evidenceOf(record);
    console.log(`${record.sourceId}\t${items.filter((item) => item.verifiedAt).length}/${items.length} approved`);
  }
  if (!flag("--list")) console.log("\nPass --all or one or more content ids to approve.");
  process.exit(0);
}

const revoke = flag("--revoke");
let changed = 0;
for (const record of records) {
  if (!flag("--all") && !ids.includes(record.sourceId)) continue;
  for (const item of evidenceOf(record)) {
    if (revoke ? item.verifiedAt !== null : item.verifiedAt === null) {
      item.verifiedAt = revoke ? null : date;
      changed += 1;
    }
  }
}
const missing = ids.filter((id) => !records.some((record) => record.sourceId === id));
if (missing.length) console.warn(`Not found: ${missing.join(", ")}`);
for (const set of sets) writeFileSync(set.file, `${JSON.stringify(set.records, null, 2)}\n`);
console.log(`${revoke ? "Revoked" : `Approved (${date})`}: ${changed} evidence item(s).`);
