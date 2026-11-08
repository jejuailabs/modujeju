#!/usr/bin/env node
// Stamp the operator approval date on researched companion evidence.
// Evidence without verifiedAt is never shown or used in a verdict.
//
//   node scripts/approve-companion-spots.mjs --list
//   node scripts/approve-companion-spots.mjs --all
//   node scripts/approve-companion-spots.mjs CNTS_000000000012345 CNTS_...
//   node scripts/approve-companion-spots.mjs --date 2026-11-08 --all
//   node scripts/approve-companion-spots.mjs --revoke CNTS_...   (clears approval)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(new URL("../research_notes/catalog/companion-spots.json", import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const dateIndex = args.indexOf("--date");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
const date = dateIndex >= 0 ? args[dateIndex + 1] : today;
if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) throw new Error("--date must be YYYY-MM-DD");
const ids = args.filter((arg, index) => /^CNTS_\d+$/.test(arg) && args[index - 1] !== "--date");

const records = JSON.parse(readFileSync(file, "utf8"));
const evidenceOf = (record) => [
  ...Object.values(record.amenities ?? {}),
  ...Object.values(record.admissions ?? {}),
];

if (flag("--list") || (!flag("--all") && !ids.length)) {
  for (const record of records) {
    const items = evidenceOf(record);
    const approved = items.filter((item) => item.verifiedAt).length;
    console.log(`${record.sourceId}\t${approved}/${items.length} approved\t${record.name}`);
  }
  if (!flag("--list")) console.log("\nPass --all or one or more CNTS_ ids to approve.");
  process.exit(0);
}

const revoke = flag("--revoke");
let changed = 0;
for (const record of records) {
  if (!flag("--all") && !ids.includes(record.sourceId)) continue;
  for (const item of evidenceOf(record)) {
    const next = revoke ? null : date;
    if (revoke ? item.verifiedAt !== null : item.verifiedAt === null) {
      item.verifiedAt = next;
      changed += 1;
    }
  }
}
const missing = ids.filter((id) => !records.some((record) => record.sourceId === id));
if (missing.length) console.warn(`Not found: ${missing.join(", ")}`);
writeFileSync(file, `${JSON.stringify(records, null, 2)}\n`);
console.log(`${revoke ? "Revoked" : `Approved (${date})`}: ${changed} evidence item(s).`);
