import { htmlToPlainText } from "../../src/shared/utils/htmlSanitizer";

// Expected values are the output of the previous single-pass implementation
// (`html.replace(/<[^>]*>/g, "")`), pinned here so behaviour cannot drift.
describe("htmlToPlainText", () => {
  it.each([
    ["<p>Hello <b>world</b></p>", "Hello world"],
    ["<p>Line one</p><br><p>Line two</p>", "Line oneLine two"],
    ['<a href="https://example.com">link</a> text', "link text"],
    ["plain text, no tags", "plain text, no tags"],
    ["<p>Q&amp;A with Tom &amp; Jerry</p>", "Q&amp;A with Tom &amp; Jerry"],
    ["", ""],
  ])("keeps ordinary input unchanged: %j", (input, expected) => {
    expect(htmlToPlainText(input)).toBe(expected);
  });

  it.each([
    ["<<b>script>alert(1)<</b>/script>", "script>alert(1)/script>"],
    ["<scr<b></b>ipt>alert(1)</scr<i></i>ipt>", "ipt>alert(1)ipt>"],
    ["<<<b>>>script>", ">>script>"],
    ["a < b and c > d", "a  d"],
    ["<img src=x onerror=alert(1)", "<img src=x onerror=alert(1)"],
  ])("never leaves a complete tag behind: %j", (input, expected) => {
    const result = htmlToPlainText(input);
    expect(result).toBe(expected);
    // A leftover "<" may remain, but never one that is later closed by a ">".
    expect(result.includes("<") && result.slice(result.indexOf("<")).includes(">")).toBe(false);
  });

  it("is idempotent", () => {
    const once = htmlToPlainText("<<b>script>alert(1)<</b>/script><p>x</p>");
    expect(htmlToPlainText(once)).toBe(once);
  });

  it("terminates on pathological input", () => {
    const crafted = "<".repeat(5000) + "b>".repeat(5000) + "text";
    const result = htmlToPlainText(crafted);
    expect(result.includes("<") && result.slice(result.indexOf("<")).includes(">")).toBe(false);
  });
});
