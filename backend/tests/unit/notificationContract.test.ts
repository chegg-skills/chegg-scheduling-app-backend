import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Contract guard: the backend publisher's `NotificationType` union and the
 * notification-service's `NotificationType` union must stay identical.
 *
 * They are hand-duplicated across two services with no shared package. When they
 * drift (e.g. backend sends `COACH_BOOKING_COCOACH_ASSIGNED` while the service only
 * has a `COHOST` template), the backend publishes a type the service cannot render —
 * the message silently dead-letters and the email is never delivered.
 *
 * This test fails the build the moment the two unions diverge.
 */

const BACKEND_TYPES_FILE = resolve(
  __dirname,
  "../../src/shared/notifications/notification.publisher.ts",
);
const SERVICE_TYPES_FILE = resolve(
  __dirname,
  "../../../notification-service/src/types/notification.ts",
);

/** Extract the string members of the `NotificationType = | "A" | "B" ... ;` union. */
const extractNotificationTypes = (filePath: string): Set<string> => {
  const source = readFileSync(filePath, "utf8");
  const match = source.match(/type NotificationType\s*=([\s\S]*?);/);
  if (!match) {
    throw new Error(`Could not locate the NotificationType union in ${filePath}`);
  }
  const members = match[1].match(/"([A-Z0-9_]+)"/g) ?? [];
  return new Set(members.map((m) => m.replace(/"/g, "")));
};

const diff = (a: Set<string>, b: Set<string>): string[] => [...a].filter((x) => !b.has(x)).sort();

describe("NotificationType contract (backend ↔ notification-service)", () => {
  it("both unions declare the identical set of notification types", () => {
    const backend = extractNotificationTypes(BACKEND_TYPES_FILE);
    const service = extractNotificationTypes(SERVICE_TYPES_FILE);

    const onlyInBackend = diff(backend, service);
    const onlyInService = diff(service, backend);

    expect({ onlyInBackend, onlyInService }).toEqual({ onlyInBackend: [], onlyInService: [] });
  });
});
