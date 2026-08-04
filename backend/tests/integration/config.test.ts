import request from "supertest";
import app from "../../src/app";

// The config domain serves static, public reference data (no auth, no DB).

describe("GET /api/config/timezones", () => {
  it("returns curated IANA timezones with iana/label/group and no auth required", async () => {
    const res = await request(app).get("/api/config/timezones");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const { timezones } = res.body.data;
    expect(Array.isArray(timezones)).toBe(true);
    expect(timezones.length).toBeGreaterThan(50);

    for (const tz of timezones) {
      expect(typeof tz.iana).toBe("string");
      expect(typeof tz.label).toBe("string");
      expect(tz.label.length).toBeGreaterThan(0);
      expect(typeof tz.group).toBe("string");
    }

    // No duplicate IANA entries.
    const ianas = timezones.map((t: { iana: string }) => t.iana);
    expect(new Set(ianas).size).toBe(ianas.length);
  });

  it("groups zones correctly (UTC, US/Canada, and a regional prefix)", async () => {
    const res = await request(app).get("/api/config/timezones");
    const byIana = new Map<string, string>(
      res.body.data.timezones.map((t: { iana: string; group: string }) => [t.iana, t.group]),
    );

    expect(byIana.get("UTC")).toBe("UTC");
    expect(byIana.get("America/New_York")).toBe("US/Canada");
    expect(byIana.get("Europe/Paris")).toBe("Europe");
  });
});

describe("GET /api/config/countries", () => {
  it("returns the country list including well-known entries", async () => {
    const res = await request(app).get("/api/config/countries");

    expect(res.status).toBe(200);
    const { countries } = res.body.data;
    expect(countries.length).toBeGreaterThan(200);
    expect(countries).toContainEqual({ code: "US", name: "United States" });
    expect(countries).toContainEqual({ code: "IN", name: "India" });

    for (const c of countries) {
      expect(typeof c.code).toBe("string");
      expect(typeof c.name).toBe("string");
    }
  });
});

describe("GET /api/config/languages", () => {
  it("returns the supported language list", async () => {
    const res = await request(app).get("/api/config/languages");

    expect(res.status).toBe(200);
    expect(res.body.data.languages).toEqual([
      { code: "en", name: "English" },
      { code: "es", name: "Spanish" },
      { code: "fr", name: "French" },
      { code: "de", name: "German" },
      { code: "ja", name: "Japanese" },
      { code: "pt", name: "Portuguese" },
    ]);
  });
});

describe("config routing", () => {
  it("returns 404 for an unsupported method on a config route", async () => {
    const res = await request(app).post("/api/config/timezones").send({});
    expect(res.status).toBe(404);
  });
});
