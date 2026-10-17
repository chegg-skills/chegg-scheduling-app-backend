import fs from "node:fs";
import path from "node:path";

// events, availability and bookings call each other's code. That is fine as long as the
// calls only flow one way. If two files ever import each other (directly or through a
// chain), the planned repository/DI wiring would break at start-up, and today it would
// silently depend on import order. This test fails the build the moment a loop appears.
//
// Only imports that survive compilation count: `import type { … }` and imports made up
// entirely of `type X` specifiers are erased by TypeScript and cannot cause a loop.

const DOMAIN_ROOT = path.resolve(__dirname, "../../src/domain");
const DOMAINS = ["events", "availability", "bookings", "scheduling"];

const listFiles = (): string[] =>
  DOMAINS.flatMap((d) =>
    fs
      .readdirSync(path.join(DOMAIN_ROOT, d))
      .filter((f) => f.endsWith(".ts") && !/\.(router|schema)\.ts$/.test(f))
      .map((f) => path.join(DOMAIN_ROOT, d, f)),
  );

const resolveRelative = (from: string, spec: string): string | null => {
  const target = path.normalize(path.join(path.dirname(from), spec)) + ".ts";
  return fs.existsSync(target) ? target : null;
};

const runtimeImports = (file: string): string[] => {
  const source = fs.readFileSync(file, "utf8");
  const found: string[] = [];
  const pattern =
    /(?:import|export)\s+(type\s+)?(\{[^}]*\}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*\{[^}]*\})?\s*from\s+"(\.{1,2}\/[^"]+)"/g;
  for (const match of source.matchAll(pattern)) {
    if (match[1]) continue; // `import type { … }`
    const clause = match[2] ?? "";
    if (clause.startsWith("{")) {
      const items = clause
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (items.every((i) => i.startsWith("type "))) continue; // all specifiers are types
    }
    const resolved = resolveRelative(file, match[3]);
    if (resolved) found.push(resolved);
  }
  // Side-effect imports (`import "./x"`) carry no specifiers but still run at load time.
  for (const match of source.matchAll(/^\s*import\s+"(\.{1,2}\/[^"]+)"/gm)) {
    const resolved = resolveRelative(file, match[1]);
    if (resolved) found.push(resolved);
  }
  return found;
};

/** Returns every group of files that (directly or indirectly) import each other. */
const findLoops = (files: string[]): string[][] => {
  const graph = new Map(files.map((f) => [f, runtimeImports(f).filter((t) => files.includes(t))]));
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const loops: string[][] = [];
  let counter = 0;

  const visit = (v: string): void => {
    index.set(v, counter);
    low.set(v, counter);
    counter += 1;
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) === index.get(v)) {
      const group: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        group.push(w);
      } while (w !== v);
      if (group.length > 1) loops.push(group.map((g) => path.relative(DOMAIN_ROOT, g)).sort());
    }
  };

  for (const f of files) if (!index.has(f)) visit(f);
  return loops;
};

describe("events / availability / bookings / scheduling dependencies", () => {
  it("analyses the expected files", () => {
    expect(listFiles().length).toBeGreaterThan(25);
  });

  it("have no import loops (calls only flow one way)", () => {
    expect(findLoops(listFiles())).toEqual([]);
  });

  it("the slot-listing service takes what it needs from events and bookings by injection, not by import", () => {
    const service = path.join(DOMAIN_ROOT, "availability/availability.service.ts");
    const violations = runtimeImports(service)
      .map((t) => path.relative(DOMAIN_ROOT, t))
      .filter((t) => t.startsWith("events/") || t.startsWith("bookings/"));
    expect(violations).toEqual([]);
  });

  it("events and bookings never import the slot-listing service or its module (they sit below it)", () => {
    const above = [
      path.join(DOMAIN_ROOT, "availability/availability.service.ts"),
      path.join(DOMAIN_ROOT, "availability/availability.module.ts"),
    ];
    const violations = listFiles()
      .filter((f) => /\/(events|bookings)\//.test(f))
      .flatMap((f) =>
        runtimeImports(f)
          .filter((t) => above.includes(t))
          .map((t) => `${path.relative(DOMAIN_ROOT, f)} -> ${path.relative(DOMAIN_ROOT, t)}`),
      );
    expect(violations).toEqual([]);
  });

  it("the shared rules and the availability building blocks never depend back on the domains that use them", () => {
    const availabilityLeaves = [
      "coachAvailability.service.ts",
      "coachAvailability.repository.ts",
      "availabilityConflict.service.ts",
      "availabilityConflict.repository.ts",
      "availabilityCalendar.service.ts",
      "availabilityCalendar.repository.ts",
      "availabilityCore.module.ts",
      "availability.shared.ts",
      "availability.notification.ts",
    ].map((f) => path.join(DOMAIN_ROOT, "availability", f));

    const leafPaths = [
      ...fs
        .readdirSync(path.join(DOMAIN_ROOT, "scheduling"))
        .filter((f) => f.endsWith(".ts"))
        .map((f) => path.join(DOMAIN_ROOT, "scheduling", f)),
      ...availabilityLeaves,
    ];
    for (const leaf of leafPaths) expect(fs.existsSync(leaf)).toBe(true);

    // events and bookings are above these leaves, and so is the slot-listing service.
    const forbidden = [
      "availability/availability.service.ts",
      ...fs.readdirSync(path.join(DOMAIN_ROOT, "events")).map((f) => `events/${f}`),
      ...fs.readdirSync(path.join(DOMAIN_ROOT, "bookings")).map((f) => `bookings/${f}`),
    ].map((p) => path.join(DOMAIN_ROOT, p));

    const violations = leafPaths.flatMap((leaf) =>
      runtimeImports(leaf)
        .filter((t) => forbidden.includes(t))
        .map((t) => `${path.relative(DOMAIN_ROOT, leaf)} -> ${path.relative(DOMAIN_ROOT, t)}`),
    );
    expect(violations).toEqual([]);
  });
});
