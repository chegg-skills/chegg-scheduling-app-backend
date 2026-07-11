import { emailTemplates } from "./registry";
import { renderTemplate } from "./renderer";
import { SAMPLE_VARIABLES } from "./sampleVariables.fixture";

/**
 * Golden-output safety net for the email-notification cleanup: renders every
 * registered template with one fixed, comprehensive set of sample variables and
 * snapshots the exact result. Any refactor that accidentally changes what a
 * student/coach/admin actually receives shows up as a snapshot diff here —
 * intentional content changes get their snapshot deliberately updated in the same
 * commit that makes the change, everything else must come back byte-identical.
 *
 * The year in wrapLayout's footer ("(c) {year} Chegg Inc.") is baked in at module
 * load time via `new Date().getFullYear()`, not a template variable — normalized
 * out below so snapshots don't spuriously fail on a Jan 1 rollover.
 */
const normalizeYear = (value: string): string =>
  value.replace(/© \d{4} Chegg Inc\./, "© [YEAR] Chegg Inc.");

describe("email template golden output (regression safety net)", () => {
  const templateNames = Object.keys(emailTemplates).sort();

  it.each(templateNames)("%s renders a stable, unchanged output", (name) => {
    const result = renderTemplate(name, SAMPLE_VARIABLES);

    expect({
      subject: normalizeYear(result.subject),
      preheader: result.preheader ? normalizeYear(result.preheader) : result.preheader,
      text: normalizeYear(result.text),
      html: normalizeYear(result.html),
    }).toMatchSnapshot();
  });
});
