import { emailTemplates } from "./registry";
import { SAMPLE_VARIABLES } from "./sampleVariables.fixture";

/**
 * Guardrail against the exact bug class fixed in this cleanup: a template
 * referencing a {{placeholder}} that no known call site actually supplies (a
 * missing cancelUrl; coHostDetails vs coCoachDetails naming drift). Regex-extracts
 * every {{token}} a template uses and asserts it's a name in the shared
 * SAMPLE_VARIABLES registry — the same registry goldenOutput.test.ts renders
 * every template with. A template introducing a genuinely new variable name means
 * adding it to sampleVariables.fixture.ts too, deliberately, in the same change.
 */
const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

const extractPlaceholders = (value: string | undefined): string[] =>
  value ? Array.from(value.matchAll(PLACEHOLDER_PATTERN), (m) => m[1]) : [];

const KNOWN_VARIABLE_NAMES = new Set(Object.keys(SAMPLE_VARIABLES));

describe("template variable contract", () => {
  for (const [type, template] of Object.entries(emailTemplates)) {
    it(`${type} only references known variable names`, () => {
      const used = new Set([
        ...extractPlaceholders(template.subject),
        ...extractPlaceholders(template.preheader),
        ...extractPlaceholders(template.text),
        ...extractPlaceholders(template.html),
      ]);

      const unknown = [...used].filter((name) => !KNOWN_VARIABLE_NAMES.has(name));
      expect(unknown).toEqual([]);
    });
  }
});
