import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "..", "..");
const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? sources(join(dir, entry.name)) : /\.(ts|tsx)$/.test(entry.name) ? [join(dir, entry.name)] : []);

describe("Vercel deployment contents", () => {
  it("does not exclude catalog files the app imports", () => {
    const rules = readFileSync(join(root, ".vercelignore"), "utf8").split(/\r?\n/).map((line) => line.trim());
    const imported = new Set(sources(join(root, "src")).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/research_notes\/catalog\/([a-z0-9-]+\.json)/g)].map((match) => match[1])));
    expect(imported.size).toBeGreaterThan(0);
    // A wildcard exclusion of the catalog folder silently drops new data files from deployments.
    expect(rules).not.toContain("research_notes/catalog/*");
    expect(rules).not.toContain("research_notes/catalog/");
    for (const name of imported) expect(rules).not.toContain(`research_notes/catalog/${name}`);
  });
});
