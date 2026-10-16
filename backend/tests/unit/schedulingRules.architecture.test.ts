import fs from "node:fs";
import path from "node:path";

// The files in src/domain/scheduling are shared by events, availability and bookings
// *because* they depend on nothing. If one of them ever gains a database call, a side
// effect, or an import from another domain, the three domains can form a dependency
// cycle again — so this test fails the build instead of letting that happen quietly.

const RULES_DIR = path.resolve(__dirname, "../../src/domain/scheduling");

const ALLOWED_IMPORTS = new Set([
  "@prisma/client", // enums and types only
  "http-status-codes",
  "../../shared/error/errorhandler",
  "../../shared/constants/interactionType",
]);

const ruleFiles = fs.readdirSync(RULES_DIR).filter((f) => f.endsWith(".ts"));

const importSpecifiers = (source: string): string[] =>
  [...source.matchAll(/^\s*import[\s\S]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);

describe("scheduling rules stay pure", () => {
  it("finds the rules files", () => {
    expect(ruleFiles.sort()).toEqual(["bookingRules.ts", "conflictRules.ts", "eventRules.ts"]);
  });

  describe.each(ruleFiles)("%s", (file) => {
    const source = fs.readFileSync(path.join(RULES_DIR, file), "utf8");

    it("imports only from the allow-list (no database, notifications or other domains)", () => {
      const disallowed = importSpecifiers(source).filter((s) => !ALLOWED_IMPORTS.has(s));
      expect(disallowed).toEqual([]);
    });

    it("does no I/O: no database access, no async work", () => {
      // A usage of the Prisma client — not the harmless "@prisma/client" package name.
      expect(source).not.toMatch(/(?<![@\w])prisma\b/);
      expect(source).not.toMatch(/\$transaction|\$queryRaw|\$executeRaw/);
      expect(source).not.toMatch(/\basync\b|\bawait\b|\bPromise\b/);
    });
  });
});
