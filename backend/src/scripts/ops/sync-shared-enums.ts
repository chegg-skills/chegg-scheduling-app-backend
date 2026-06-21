/**
 * Generates `frontend/src/types/generated/enums.ts` from the Prisma schema.
 *
 * Run with: `npm run sync:enums` (from /backend).
 *
 * The Prisma schema is the single source of truth for these enums. The
 * frontend imports the generated file via `frontend/src/types/index.ts`,
 * so the hand-typed string unions can't drift out of sync silently.
 *
 * To share a new enum: add its name to SHARED_ENUMS below and re-run.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

const SHARED_ENUMS = [
  "UserRole",
  "AssignmentStrategy",
  "EventLocationType",
  "EventBookingMode",
  "BookingStatus",
  "SessionLeadershipStrategy",
  "InteractionType",
  "MeetingLinkSource",
] as const;

const SCHEMA_PATH = resolve(__dirname, "../../prisma/schema.prisma");
const OUTPUT_PATH = resolve(__dirname, "../../../frontend/src/types/generated/enums.ts");

const parseEnums = (schema: string): Map<string, string[]> => {
  const enums = new Map<string, string[]>();
  // Match `enum Name { value1 value2 ... }` — Prisma allows trailing comments
  // and whitespace between values, which `\s+` handles cleanly.
  const enumPattern = /enum\s+(\w+)\s*\{([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = enumPattern.exec(schema)) !== null) {
    const [, name, body] = match;
    const values = body
      .split("\n")
      .map((line) => line.replace(/\/\/.*$/, "").trim())
      .filter((line) => line.length > 0);
    enums.set(name, values);
  }

  return enums;
};

const renderTypeUnion = (name: string, values: string[]): string => {
  const union = values.map((v) => `'${v}'`).join(" | ");
  return `export type ${name} = ${union}`;
};

const renderValuesConstant = (name: string, values: string[]): string => {
  const lines = values.map((v) => `  '${v}',`).join("\n");
  return `export const ${name}Values = [\n${lines}\n] as const`;
};

const main = (): void => {
  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  const enums = parseEnums(schema);

  const missing = SHARED_ENUMS.filter((name) => !enums.has(name));
  if (missing.length > 0) {
    throw new Error(
      `Enums declared in SHARED_ENUMS but not found in schema.prisma: ${missing.join(", ")}`,
    );
  }

  const sections = SHARED_ENUMS.map((name) => {
    const values = enums.get(name)!;
    return [renderTypeUnion(name, values), renderValuesConstant(name, values)].join("\n");
  });

  const output = [
    "/**",
    " * AUTO-GENERATED — DO NOT EDIT BY HAND.",
    " *",
    " * Source: backend/prisma/schema.prisma",
    " * Regenerate: from /backend run `npm run sync:enums`",
    " */",
    "",
    sections.join("\n\n"),
    "",
  ].join("\n");

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, output, "utf-8");

  // eslint-disable-next-line no-console
  console.log(
    `Wrote ${SHARED_ENUMS.length} enums to ${OUTPUT_PATH.replace(resolve(__dirname, "../../.."), ".")}`,
  );
};

main();
