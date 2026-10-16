import { htmlToPlainText } from "../../src/shared/utils/htmlSanitizer";

// The single-pass regex this replaced: `html.replace(/<[^>]*>/g, "")`.
const singlePass = (html: string) => html.replace(/<[^>]*>/g, "");

describe("htmlToPlainText", () => {
  it.each([
    "<p>Hello <b>world</b></p>",
    "<p>Line one</p><br><p>Line two</p>",
    '<a href="https://example.com">link</a> text',
    "plain text, no tags",
    "<p>Q&amp;A with Tom &amp; Jerry</p>",
    "",
  ])("matches the previous single-pass output for ordinary input: %j", (input) => {
    expect(htmlToPlainText(input)).toBe(singlePass(input));
  });

  it.each([
    "<<b>script>alert(1)<</b>/script>",
    "<scr<b></b>ipt>alert(1)</scr<i></i>ipt>",
    "<<<b>>>script>",
    "a < b and c > d",
    "<img src=x onerror=alert(1)",
  ])("never leaves a tag behind, and equals the single-pass result: %j", (input) => {
    const result = htmlToPlainText(input);
    expect(result).not.toMatch(/<[^>]*>/);
    expect(result).toBe(singlePass(input));
  });

  it("is idempotent", () => {
    const once = htmlToPlainText("<<b>script>alert(1)<</b>/script><p>x</p>");
    expect(htmlToPlainText(once)).toBe(once);
  });

  it("terminates on pathological input", () => {
    const crafted = "<".repeat(5000) + "b>".repeat(5000) + "text";
    expect(htmlToPlainText(crafted)).not.toMatch(/<[^>]*>/);
  });

  it("returns an empty string for empty input", () => {
    expect(htmlToPlainText("")).toBe("");
  });
});
