import { renderTemplate } from "./renderer";

// USER_INVITED is a simple template with straightforward {{placeholder}} usage
const TEMPLATE = "USER_INVITED";

describe("renderTemplate — placeholder substitution", () => {
  it("replaces a placeholder with its value in html output", () => {
    const result = renderTemplate(TEMPLATE, { role: "COACH" });
    expect(result.html).toContain("COACH");
  });

  it("replaces missing placeholders with an empty string", () => {
    // {{authNote}} is not provided — should resolve to "" rather than "{{authNote}}"
    const result = renderTemplate(TEMPLATE, { role: "COACH", inviteUrl: "https://example.com" });
    expect(result.html).not.toContain("{{authNote}}");
  });

  it("throws when the template name does not exist", () => {
    expect(() => renderTemplate("NONEXISTENT_TEMPLATE_XYZ")).toThrow(/template not found/i);
  });

  it("returns subject and text fields as well as html", () => {
    const result = renderTemplate(TEMPLATE, { role: "COACH" });
    expect(typeof result.subject).toBe("string");
    expect(typeof result.text).toBe("string");
    expect(typeof result.html).toBe("string");
    expect(result.subject.length).toBeGreaterThan(0);
  });

  it("returns preheader as a string when the template has one", () => {
    // BOOKING_CONFIRMED has preheader: "Your session is confirmed for {{startTime}}."
    const result = renderTemplate("BOOKING_CONFIRMED", { startTime: "10:00 AM" });
    expect(typeof result.preheader).toBe("string");
    expect(result.preheader).toContain("10:00 AM");
  });

  it("replaces multiple distinct placeholders in a single call", () => {
    const result = renderTemplate("BOOKING_CONFIRMED", {
      studentName: "Alice",
      eventName: "Career Coaching",
      startTime: "Mon Jan 1, 10:00 AM",
      coHostDetailsHtml: "",
    });
    expect(result.html).toContain("Alice");
    expect(result.html).toContain("Career Coaching");
    expect(result.html).toContain("Mon Jan 1, 10:00 AM");
  });
});

describe("renderTemplate — HTML escaping in html output", () => {
  it("escapes < > & \" ' characters in normal fields", () => {
    const xssPayload = '<script>alert("xss\'s")</script>&danger';
    const result = renderTemplate(TEMPLATE, { role: xssPayload });

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).toContain("&amp;danger");
    expect(result.html).toContain("&quot;xss&#039;s&quot;");
  });

  it("does NOT escape values in RAW_HTML_FIELDS (coHostDetailsHtml)", () => {
    // coHostDetailsHtml is in RAW_HTML_FIELDS — its value must pass through unescaped.
    // Use the BOOKING_CONFIRMED template which contains {{coHostDetailsHtml}}.
    const rawHtml = "<strong>Coach Name</strong>";
    const result = renderTemplate("BOOKING_CONFIRMED", {
      studentName: "Alice",
      eventName: "Test Session",
      date: "2026-01-01",
      time: "10:00 AM",
      timezone: "UTC",
      duration: "30 min",
      location: "Zoom",
      rescheduleUrl: "https://example.com",
      coHostDetailsHtml: rawHtml,
    });

    expect(result.html).toContain(rawHtml);
  });

  it("does NOT HTML-escape values in text output (plain text is not HTML)", () => {
    // subject and text fields should receive raw values, not HTML-escaped ones
    const specialChars = "Tom & Jerry <the show>";
    const result = renderTemplate(TEMPLATE, { role: specialChars });
    // text field: raw value
    expect(result.text).toContain(specialChars);
  });

  it("does NOT HTML-escape values in the subject field", () => {
    // BOOKING_CONFIRMED subject: "Confirmed: {{eventName}} with {{coachName}}"
    const specialChars = "Tom & Jerry <the show>";
    const result = renderTemplate("BOOKING_CONFIRMED", {
      eventName: specialChars,
      coHostDetailsHtml: "",
    });
    expect(result.subject).toContain(specialChars);
    expect(result.subject).not.toContain("&amp;");
  });
});

describe("renderTemplate — cancelUrl placement and escaping", () => {
  const CANCEL_URL = "https://app.example.com/cancel/abc-123?token=tok-456";

  it("renders cancelUrl in BOOKING_CONFIRMED html and text", () => {
    const result = renderTemplate("BOOKING_CONFIRMED", {
      cancelUrl: CANCEL_URL,
      coHostDetailsHtml: "",
    });
    expect(result.html).toContain(CANCEL_URL);
    expect(result.text).toContain(CANCEL_URL);
  });

  it("renders cancelUrl in BOOKING_RESCHEDULED html", () => {
    const result = renderTemplate("BOOKING_RESCHEDULED", {
      cancelUrl: CANCEL_URL,
      coHostDetailsHtml: "",
    });
    expect(result.html).toContain(CANCEL_URL);
  });

  it("renders cancelUrl in BOOKING_CONFIRMED_DEFERRED html", () => {
    const result = renderTemplate("BOOKING_CONFIRMED_DEFERRED", { cancelUrl: CANCEL_URL });
    expect(result.html).toContain(CANCEL_URL);
  });

  it("renders cancelUrl in SESSION_REMINDER_24H html", () => {
    const result = renderTemplate("SESSION_REMINDER_24H", { cancelUrl: CANCEL_URL });
    expect(result.html).toContain(CANCEL_URL);
  });

  it("renders cancelUrl in SESSION_REMINDER_1H html", () => {
    const result = renderTemplate("SESSION_REMINDER_1H", { cancelUrl: CANCEL_URL });
    expect(result.html).toContain(CANCEL_URL);
  });

  it("cancelUrl is NOT in RAW_HTML_FIELDS — special characters are HTML-escaped in html output", () => {
    const urlWithAmpersand = "https://app.example.com/cancel/id?token=t&extra=1";
    const result = renderTemplate("BOOKING_CONFIRMED", {
      cancelUrl: urlWithAmpersand,
      coHostDetailsHtml: "",
    });
    // & in a URL gets HTML-escaped to &amp; in html output (cancelUrl is not a raw field)
    expect(result.html).toContain("&amp;extra=1");
    // text output is unescaped
    expect(result.text).toContain(urlWithAmpersand);
  });

  it("cancelUrl does NOT appear in BOOKING_CANCELLED html", () => {
    const result = renderTemplate("BOOKING_CANCELLED", { cancelUrl: CANCEL_URL });
    // The BOOKING_CANCELLED template has no {{cancelUrl}} placeholder — it should not render
    expect(result.html).not.toContain(CANCEL_URL);
  });

  it("cancelUrl does NOT appear in BOOKING_CANCELLED_DEFERRED html", () => {
    const result = renderTemplate("BOOKING_CANCELLED_DEFERRED", { cancelUrl: CANCEL_URL });
    expect(result.html).not.toContain(CANCEL_URL);
  });
});
