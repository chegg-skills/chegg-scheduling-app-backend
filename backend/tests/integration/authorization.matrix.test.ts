/**
 * Authorization matrix: pins (endpoint × role) → expected HTTP status.
 *
 * Purpose: a single drift-detection net. Any time someone broadens or narrows
 * an authorize(...) in a router, or adds a new endpoint without an explicit
 * role policy, this test fires. Add a row when adding an endpoint.
 *
 * Naming convention: actor names describe their relationship to teamA + eventA.
 *   - teamLeadA  = TEAM_ADMIN who owns teamA
 *   - teamLeadB  = TEAM_ADMIN who owns teamB only (foreign admin)
 *   - coachIn    = COACH who is a member of teamA AND assigned to eventA
 *   - coachOut   = COACH who is neither
 */
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/shared/db/prisma";
import { clearTables } from "../helpers/db";
import { bootstrapAdmin, registerUser } from "../helpers/auth";

type ActorKey = "superAdmin" | "teamLeadA" | "teamLeadB" | "coachIn" | "coachOut";
type Expected = Partial<Record<ActorKey, number>>;

interface Scenario {
  label: string;
  method: "get" | "post" | "patch" | "put" | "delete";
  buildPath: () => string;
  body?: () => Record<string, unknown> | undefined;
  expected: Expected;
}

interface Actor {
  id: string;
  token: string;
}

interface World {
  actors: Record<ActorKey, Actor>;
  teamAId: string;
  teamBId: string;
  eventAId: string;
  groupAId: string;
  // Slot on eventA used for read-only checks
  readSlotId: string;
  // Fresh slot for the reveal-action check (mutated by the test that targets it)
  revealSlotId: string;
}

let world: World;

beforeAll(async () => {
  await clearTables();

  const superAdmin = await bootstrapAdmin("super@matrix.com", "Admin1234");
  const teamLeadA = await registerUser(superAdmin.token, {
    firstName: "Lead",
    lastName: "A",
    email: "lead-a@matrix.com",
    password: "TestUser1234",
    role: "TEAM_ADMIN",
  });
  const teamLeadB = await registerUser(superAdmin.token, {
    firstName: "Lead",
    lastName: "B",
    email: "lead-b@matrix.com",
    password: "TestUser1234",
    role: "TEAM_ADMIN",
  });
  const coachIn = await registerUser(superAdmin.token, {
    firstName: "Coach",
    lastName: "In",
    email: "coach-in@matrix.com",
    password: "TestUser1234",
    role: "COACH",
  });
  const coachOut = await registerUser(superAdmin.token, {
    firstName: "Coach",
    lastName: "Out",
    email: "coach-out@matrix.com",
    password: "TestUser1234",
    role: "COACH",
  });

  const teamA = await request(app)
    .post("/api/teams")
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({ name: "Matrix Team A", description: "Primary team", teamLeadId: teamLeadA.id });
  const teamB = await request(app)
    .post("/api/teams")
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({ name: "Matrix Team B", description: "Foreign team", teamLeadId: teamLeadB.id });
  expect(teamA.status).toBe(201);
  expect(teamB.status).toBe(201);

  await prisma.teamMember.create({ data: { teamId: teamA.body.data.id, userId: coachIn.id } });

  const eventTypeRes = await request(app)
    .post("/api/event-types")
    .set("Authorization", `Bearer ${superAdmin.token}`)
    .send({ key: `matrix-offering-${Date.now()}`, name: "Matrix Offering" });
  expect(eventTypeRes.status).toBe(201);

  const eventA = await request(app)
    .post(`/api/teams/${teamA.body.data.id}/events`)
    .set("Authorization", `Bearer ${teamLeadA.token}`)
    .send({
      name: "Matrix Event A",
      eventTypeId: eventTypeRes.body.data.id,
      interactionType: "ONE_TO_ONE",
      assignmentStrategy: "DIRECT",
      durationSeconds: 1800,
      locationType: "VIRTUAL",
      locationValue: "https://meet.example.com/x",
    });
  expect(eventA.status).toBe(201);

  await request(app)
    .put(`/api/events/${eventA.body.data.id}/coaches`)
    .set("Authorization", `Bearer ${teamLeadA.token}`)
    .send({ coaches: [{ userId: coachIn.id, coachOrder: 1 }] });

  const groupA = await request(app)
    .post(`/api/teams/${teamA.body.data.id}/event-groups`)
    .set("Authorization", `Bearer ${teamLeadA.token}`)
    .send({ name: "Matrix Group A", color: "#FF0000" });
  expect(groupA.status).toBe(201);

  // Plain slot used for read assertions (capacity > 0 so it's a valid resource).
  const nextWed = (() => {
    const d = new Date();
    const offset = (3 - d.getUTCDay() + 7) % 7 || 7;
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offset, 14, 0));
  })();
  const readSlot = await request(app)
    .post(`/api/events/${eventA.body.data.id}/schedule-slots`)
    .set("Authorization", `Bearer ${teamLeadA.token}`)
    .send({
      startTime: nextWed.toISOString(),
      endTime: new Date(nextWed.getTime() + 30 * 60 * 1000).toISOString(),
      capacity: 1,
    });
  expect(readSlot.status).toBe(201);

  // Reveal slot lives on a deferred-reveal ONE_TO_MANY event so the reveal action is well-defined.
  const deferredEvent = await request(app)
    .post(`/api/teams/${teamA.body.data.id}/events`)
    .set("Authorization", `Bearer ${teamLeadA.token}`)
    .send({
      name: "Matrix Deferred Event",
      eventTypeId: eventTypeRes.body.data.id,
      interactionType: "ONE_TO_MANY",
      bookingMode: "FIXED_SLOTS",
      deferCoachReveal: true,
      maxParticipantCount: 5,
      durationSeconds: 1800,
      locationType: "VIRTUAL",
      locationValue: "https://meet.example.com/y",
    });
  expect(deferredEvent.status).toBe(201);
  await request(app)
    .put(`/api/events/${deferredEvent.body.data.id}/coaches`)
    .set("Authorization", `Bearer ${teamLeadA.token}`)
    .send({ coaches: [{ userId: coachIn.id, coachOrder: 1 }] });

  const revealStart = new Date(nextWed.getTime() + 4 * 60 * 60 * 1000);
  const revealSlot = await request(app)
    .post(`/api/events/${deferredEvent.body.data.id}/schedule-slots`)
    .set("Authorization", `Bearer ${teamLeadA.token}`)
    .send({
      startTime: revealStart.toISOString(),
      endTime: new Date(revealStart.getTime() + 30 * 60 * 1000).toISOString(),
      capacity: 5,
    });
  expect(revealSlot.status).toBe(201);

  world = {
    actors: {
      superAdmin: { id: superAdmin.id, token: superAdmin.token },
      teamLeadA: { id: teamLeadA.id, token: teamLeadA.token },
      teamLeadB: { id: teamLeadB.id, token: teamLeadB.token },
      coachIn: { id: coachIn.id, token: coachIn.token },
      coachOut: { id: coachOut.id, token: coachOut.token },
    },
    teamAId: teamA.body.data.id,
    teamBId: teamB.body.data.id,
    eventAId: deferredEvent.body.data.id,
    groupAId: groupA.body.data.id,
    readSlotId: readSlot.body.data.id,
    revealSlotId: revealSlot.body.data.id,
  };
});

afterAll(clearTables);

/**
 * One row per endpoint variant. `expected` lists only the actors whose status differs from
 * the default of 200 (or, for POST without a request body shape, 201). We assert exactly
 * what's listed; unspecified actors are not invoked.
 *
 * Reveal-action rows use a fresh slot each run so 409 doesn't leak between scenarios.
 */
const buildScenarios = (): Scenario[] => [
  // -------- Teams --------
  {
    label: "GET /teams (list)",
    method: "get",
    buildPath: () => "/api/teams",
    expected: { superAdmin: 200, teamLeadA: 200, teamLeadB: 200, coachIn: 200, coachOut: 200 },
  },
  {
    label: "POST /teams (create)",
    method: "post",
    buildPath: () => "/api/teams",
    body: () => ({
      name: `Drive-by Team ${Math.random().toString(36).slice(2, 8)}`,
      description: "rbac matrix",
      teamLeadId: world.actors.teamLeadA.id,
    }),
    expected: { superAdmin: 201, teamLeadA: 403, teamLeadB: 403, coachIn: 403, coachOut: 403 },
  },
  {
    label: "GET /teams/:teamAId (read)",
    method: "get",
    buildPath: () => `/api/teams/${world.teamAId}`,
    expected: { superAdmin: 200, teamLeadA: 200, teamLeadB: 403, coachIn: 200, coachOut: 403 },
  },
  {
    // PATCH /teams/:teamId is locked to SUPER_ADMIN — see team.router.ts.
    // Even the lead of teamA cannot mutate it via this route.
    label: "PATCH /teams/:teamAId (update)",
    method: "patch",
    buildPath: () => `/api/teams/${world.teamAId}`,
    body: () => ({ description: "updated by matrix" }),
    expected: { superAdmin: 200, teamLeadA: 403, teamLeadB: 403, coachIn: 403, coachOut: 403 },
  },
  {
    label: "GET /teams/:teamAId/notification-config",
    method: "get",
    buildPath: () => `/api/teams/${world.teamAId}/notification-config`,
    expected: { superAdmin: 200, teamLeadA: 200, teamLeadB: 403, coachIn: 200, coachOut: 403 },
  },
  {
    label: "PUT /teams/:teamAId/notification-config",
    method: "put",
    buildPath: () => `/api/teams/${world.teamAId}/notification-config`,
    body: () => ({
      reminderOffsets: [60],
      adminNotifyOnBooking: false,
      adminNotifyOnCancellation: false,
      adminNotifyOnNoShow: false,
      coachNotifyOnBooking: true,
      coachNotifyOnCancellation: true,
      coachNotifyOnNoShow: false,
      notifyLeadOnAvailability: false,
    }),
    expected: { superAdmin: 200, teamLeadA: 200, teamLeadB: 403, coachIn: 403, coachOut: 403 },
  },

  // -------- Team members --------
  {
    label: "GET /teams/:teamAId/members",
    method: "get",
    buildPath: () => `/api/teams/${world.teamAId}/members`,
    expected: { superAdmin: 200, teamLeadA: 200, teamLeadB: 403, coachIn: 200, coachOut: 403 },
  },
  {
    label: "POST /teams/:teamAId/members (add)",
    method: "post",
    buildPath: () => `/api/teams/${world.teamAId}/members`,
    body: () => ({ userId: world.actors.coachOut.id }),
    // teamLeadA succeeds with 201 but mutates world state; we test the deny cases here.
    expected: { teamLeadB: 403, coachIn: 403, coachOut: 403 },
  },

  // -------- Event groups --------
  {
    label: "GET /teams/:teamAId/event-groups",
    method: "get",
    buildPath: () => `/api/teams/${world.teamAId}/event-groups`,
    expected: { superAdmin: 200, teamLeadA: 200, teamLeadB: 403, coachIn: 200, coachOut: 403 },
  },
  {
    label: "GET /event-groups/:groupAId",
    method: "get",
    buildPath: () => `/api/event-groups/${world.groupAId}`,
    expected: { superAdmin: 200, teamLeadA: 200, teamLeadB: 403, coachIn: 200, coachOut: 403 },
  },

  // -------- Events --------
  {
    label: "GET /teams/:teamAId/events (list)",
    method: "get",
    buildPath: () => `/api/teams/${world.teamAId}/events`,
    expected: { superAdmin: 200, teamLeadA: 200, teamLeadB: 403, coachIn: 200, coachOut: 403 },
  },
  {
    label: "GET /events/:eventAId (read)",
    method: "get",
    buildPath: () => `/api/events/${world.eventAId}`,
    expected: { superAdmin: 200, teamLeadA: 200, teamLeadB: 403, coachIn: 200, coachOut: 403 },
  },
  {
    label: "PATCH /events/:eventAId (update)",
    method: "patch",
    buildPath: () => `/api/events/${world.eventAId}`,
    body: () => ({ description: "matrix patch" }),
    expected: { teamLeadB: 403, coachIn: 403, coachOut: 403 },
  },
  {
    label: "GET /events/:eventAId/coaches",
    method: "get",
    buildPath: () => `/api/events/${world.eventAId}/coaches`,
    expected: { superAdmin: 200, teamLeadA: 200, teamLeadB: 403, coachIn: 200, coachOut: 403 },
  },
  {
    label: "GET /events/:eventAId/schedule-slots",
    method: "get",
    buildPath: () => `/api/events/${world.eventAId}/schedule-slots`,
    expected: { superAdmin: 200, teamLeadA: 200, teamLeadB: 403, coachIn: 200, coachOut: 403 },
  },

  // -------- Users --------
  {
    label: "GET /users (list)",
    method: "get",
    buildPath: () => "/api/users",
    expected: { superAdmin: 200, teamLeadA: 200, teamLeadB: 200, coachIn: 403, coachOut: 403 },
  },
  {
    label: "GET /users/me",
    method: "get",
    buildPath: () => "/api/users/me",
    expected: { superAdmin: 200, teamLeadA: 200, teamLeadB: 200, coachIn: 200, coachOut: 200 },
  },
];

describe("Authorization matrix", () => {
  const send = (
    method: Scenario["method"],
    path: string,
    token: string,
    body?: Record<string, unknown>,
  ) => {
    const req = request(app)[method](path).set("Authorization", `Bearer ${token}`);
    return body ? req.send(body) : req;
  };

  it("baseline scenarios match expected (endpoint × role)", async () => {
    const scenarios = buildScenarios();
    const failures: string[] = [];

    for (const scenario of scenarios) {
      const path = scenario.buildPath();
      const body = scenario.body?.();
      const entries = Object.entries(scenario.expected) as Array<[ActorKey, number]>;

      for (const [actorKey, expectedStatus] of entries) {
        const actor = world.actors[actorKey];
        const res = await send(scenario.method, path, actor.token, body);
        if (res.status !== expectedStatus) {
          failures.push(
            `${scenario.label} [${actorKey}] expected ${expectedStatus}, got ${res.status}` +
              ` (body: ${JSON.stringify(res.body).slice(0, 200)})`,
          );
        }
      }
    }

    if (failures.length > 0) {
      throw new Error(`Authorization matrix mismatches:\n  - ${failures.join("\n  - ")}`);
    }
  });
});
