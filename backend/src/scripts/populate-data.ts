import { AssignmentStrategy, BookingStatus, EventLocationType, UserRole } from "@prisma/client";
import "dotenv/config";
import request from "supertest";
import app from "../app";
import { prisma } from "../shared/db/prisma";

const SUPER_ADMIN_EMAIL = "mohitkumar3005@example.com";
const SUPER_ADMIN_FIRST_NAME = "Mohit";
const SUPER_ADMIN_LAST_NAME = "Kumar";
const DEFAULT_PASSWORD = "pass1234";
const RESET_DEMO_DATA = process.env.RESET_DEMO_DATA === "true";
const BOOTSTRAP_SECRET = process.env.BOOTSTRAP_SECRET ?? "";

type ApiMethod = "GET" | "POST" | "PUT" | "PATCH";

type DemoMemberDefinition = {
  firstName: string;
  lastName: string;
  email: string;
};

type DemoEventDefinition = {
  name: string;
  description: string;
  offeringKey: string;
  interactionKey: string;
  assignmentStrategy: AssignmentStrategy;
  durationMinutes: number;
};

type DemoTeamDefinition = {
  key: string;
  name: string;
  description: string;
  admin: DemoMemberDefinition;
  coaches: DemoMemberDefinition[];
  events: DemoEventDefinition[];
};

type SeedUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

const offeringDefinitions = [
  {
    key: "mentorship",
    name: "Mentorship Sessions",
    description: "Career and growth coaching",
    sortOrder: 1,
  },
  {
    key: "qa",
    name: "Q&A Sessions",
    description: "Fast problem-solving help",
    sortOrder: 2,
  },
  {
    key: "live_lessons",
    name: "Live Lessons",
    description: "Guided teaching and walkthroughs",
    sortOrder: 3,
  },
  {
    key: "project_review",
    name: "Project Reviews",
    description: "Hands-on project feedback",
    sortOrder: 4,
  },
  {
    key: "portfolio_review",
    name: "Portfolio Reviews",
    description: "Design and portfolio critiques",
    sortOrder: 5,
  },
  {
    key: "analytics_consulting",
    name: "Analytics Consulting",
    description: "Dashboard and data analysis support",
    sortOrder: 6,
  },
];

// Maps demo interactionKey → InteractionType enum value
const interactionTypeKeyMap: Record<string, string> = {
  one_to_one: "ONE_TO_ONE",
  one_to_many: "ONE_TO_MANY",
  many_to_one: "MANY_TO_ONE",
  many_to_many: "MANY_TO_MANY",
};

const demoTeams: DemoTeamDefinition[] = [
  {
    key: "engineering",
    name: "Engineering Team",
    description: "Backend systems design, debugging, and software architecture support.",
    admin: {
      firstName: "Ethan",
      lastName: "Engineer",
      email: "engineering.admin@demo.chegg.local",
    },
    coaches: [
      {
        firstName: "Ava",
        lastName: "Backend",
        email: "ava.backend@demo.chegg.local",
      },
      {
        firstName: "Liam",
        lastName: "Systems",
        email: "liam.systems@demo.chegg.local",
      },
      {
        firstName: "Noah",
        lastName: "APIs",
        email: "noah.apis@demo.chegg.local",
      },
    ],
    events: [
      {
        name: "System Design Review",
        description: "Architecture reviews for scalable applications and platform design.",
        offeringKey: "project_review",
        interactionKey: "one_to_one",
        assignmentStrategy: AssignmentStrategy.DIRECT,
        durationMinutes: 60,
      },
      {
        name: "API Debugging Lab",
        description: "Hands-on help with backend bugs, integrations, and service failures.",
        offeringKey: "qa",
        interactionKey: "many_to_one",
        assignmentStrategy: AssignmentStrategy.ROUND_ROBIN,
        durationMinutes: 45,
      },
    ],
  },
  {
    key: "data-science",
    name: "Data Science Team",
    description: "Machine learning, experimentation, and model evaluation guidance.",
    admin: {
      firstName: "Maya",
      lastName: "Insights",
      email: "data-science.admin@demo.chegg.local",
    },
    coaches: [
      {
        firstName: "Priya",
        lastName: "Models",
        email: "priya.models@demo.chegg.local",
      },
      {
        firstName: "Leo",
        lastName: "Metrics",
        email: "leo.metrics@demo.chegg.local",
      },
      {
        firstName: "Sara",
        lastName: "Experiments",
        email: "sara.experiments@demo.chegg.local",
      },
    ],
    events: [
      {
        name: "ML Model Review",
        description: "Discuss model quality, validation strategy, and practical improvements.",
        offeringKey: "mentorship",
        interactionKey: "one_to_one",
        assignmentStrategy: AssignmentStrategy.DIRECT,
        durationMinutes: 60,
      },
      {
        name: "Experiment Design Office Hours",
        description: "Support for A/B testing, feature evaluation, and experiment setup.",
        offeringKey: "live_lessons",
        interactionKey: "one_to_many",
        assignmentStrategy: AssignmentStrategy.DIRECT,
        durationMinutes: 45,
      },
    ],
  },
  {
    key: "uiux",
    name: "UI/UX Team",
    description: "Design systems, user journeys, and portfolio feedback sessions.",
    admin: {
      firstName: "Olivia",
      lastName: "Design",
      email: "uiux.admin@demo.chegg.local",
    },
    coaches: [
      {
        firstName: "Nina",
        lastName: "Figma",
        email: "nina.figma@demo.chegg.local",
      },
      {
        firstName: "Aria",
        lastName: "Research",
        email: "aria.research@demo.chegg.local",
      },
      {
        firstName: "Mason",
        lastName: "Product",
        email: "mason.product@demo.chegg.local",
      },
    ],
    events: [
      {
        name: "Portfolio Critique",
        description: "Detailed feedback for case studies, resumes, and design storytelling.",
        offeringKey: "portfolio_review",
        interactionKey: "one_to_one",
        assignmentStrategy: AssignmentStrategy.DIRECT,
        durationMinutes: 45,
      },
      {
        name: "Figma Design Review",
        description: "Collaborative design reviews for interfaces, prototypes, and usability.",
        offeringKey: "project_review",
        interactionKey: "one_to_many",
        assignmentStrategy: AssignmentStrategy.DIRECT,
        durationMinutes: 60,
      },
    ],
  },
  {
    key: "cyber-security",
    name: "Cyber Security Team",
    description: "Application security, threat modeling, and secure coding sessions.",
    admin: {
      firstName: "Arjun",
      lastName: "Shield",
      email: "cyber.admin@demo.chegg.local",
    },
    coaches: [
      {
        firstName: "Ivy",
        lastName: "ZeroTrust",
        email: "ivy.zerotrust@demo.chegg.local",
      },
      {
        firstName: "Rohan",
        lastName: "Audit",
        email: "rohan.audit@demo.chegg.local",
      },
      {
        firstName: "Mila",
        lastName: "Threat",
        email: "mila.threat@demo.chegg.local",
      },
    ],
    events: [
      {
        name: "Security Audit Clinic",
        description: "Walk through vulnerabilities, checklists, and remediation strategies.",
        offeringKey: "project_review",
        interactionKey: "many_to_one",
        assignmentStrategy: AssignmentStrategy.DIRECT,
        durationMinutes: 60,
      },
      {
        name: "Threat Modeling Session",
        description: "Map risks and attack surfaces for product or infrastructure changes.",
        offeringKey: "mentorship",
        interactionKey: "many_to_one",
        assignmentStrategy: AssignmentStrategy.ROUND_ROBIN,
        durationMinutes: 45,
      },
    ],
  },
  {
    key: "ai-dev",
    name: "AI in Development Team",
    description: "AI-assisted software development, LLM apps, and developer productivity coaching.",
    admin: {
      firstName: "Priyank",
      lastName: "Copilot",
      email: "ai-dev.admin@demo.chegg.local",
    },
    coaches: [
      {
        firstName: "Sofia",
        lastName: "Agents",
        email: "sofia.agents@demo.chegg.local",
      },
      {
        firstName: "Daniel",
        lastName: "LLM",
        email: "daniel.llm@demo.chegg.local",
      },
      {
        firstName: "Grace",
        lastName: "Automation",
        email: "grace.automation@demo.chegg.local",
      },
    ],
    events: [
      {
        name: "AI Pair Programming",
        description: "Use AI tools effectively for code generation, refactors, and debugging.",
        offeringKey: "live_lessons",
        interactionKey: "many_to_one",
        assignmentStrategy: AssignmentStrategy.ROUND_ROBIN,
        durationMinutes: 45,
      },
      {
        name: "LLM App Architecture Review",
        description: "Design scalable and secure AI-powered application workflows.",
        offeringKey: "project_review",
        interactionKey: "many_to_one",
        assignmentStrategy: AssignmentStrategy.DIRECT,
        durationMinutes: 60,
      },
    ],
  },
  {
    key: "data-analytics",
    name: "Data Analytics Team",
    description: "SQL, dashboards, KPI design, and business reporting support.",
    admin: {
      firstName: "Noah",
      lastName: "Numbers",
      email: "analytics.admin@demo.chegg.local",
    },
    coaches: [
      {
        firstName: "Emma",
        lastName: "Dashboards",
        email: "emma.dashboards@demo.chegg.local",
      },
      {
        firstName: "Lucas",
        lastName: "SQL",
        email: "lucas.sql@demo.chegg.local",
      },
      {
        firstName: "Chloe",
        lastName: "KPIs",
        email: "chloe.kpis@demo.chegg.local",
      },
    ],
    events: [
      {
        name: "Dashboard Review Session",
        description: "Improve visual storytelling and executive reporting dashboards.",
        offeringKey: "analytics_consulting",
        interactionKey: "one_to_one",
        assignmentStrategy: AssignmentStrategy.DIRECT,
        durationMinutes: 45,
      },
      {
        name: "SQL Optimization Workshop",
        description: "Tune heavy queries and improve reporting workflows with experts.",
        offeringKey: "qa",
        interactionKey: "one_to_many",
        assignmentStrategy: AssignmentStrategy.DIRECT,
        durationMinutes: 60,
      },
    ],
  },
];

const sampleBookingPlans = [
  {
    studentName: "Alex Johnson",
    studentEmail: "alex.johnson@student.demo",
    teamKey: "engineering",
    eventName: "System Design Review",
    dayOffset: 1,
    hour: 10,
    status: BookingStatus.COMPLETED,
  },
  {
    studentName: "Alex Johnson",
    studentEmail: "alex.johnson@student.demo",
    teamKey: "engineering",
    eventName: "API Debugging Lab",
    dayOffset: 4,
    hour: 11,
    status: BookingStatus.CONFIRMED,
  },
  {
    studentName: "Priya Shah",
    studentEmail: "priya.shah@student.demo",
    teamKey: "data-science",
    eventName: "ML Model Review",
    dayOffset: 2,
    hour: 12,
    status: BookingStatus.COMPLETED,
  },
  {
    studentName: "Jordan Lee",
    studentEmail: "jordan.lee@student.demo",
    teamKey: "uiux",
    eventName: "Portfolio Critique",
    dayOffset: 3,
    hour: 10,
    status: BookingStatus.CONFIRMED,
  },
  {
    studentName: "Jordan Lee",
    studentEmail: "jordan.lee@student.demo",
    teamKey: "data-analytics",
    eventName: "Dashboard Review Session",
    dayOffset: 8,
    hour: 14,
    status: BookingStatus.CONFIRMED,
  },
  {
    studentName: "Mia Chen",
    studentEmail: "mia.chen@student.demo",
    teamKey: "cyber-security",
    eventName: "Threat Modeling Session",
    dayOffset: 5,
    hour: 13,
    status: BookingStatus.COMPLETED,
  },
  {
    studentName: "Daniel Brooks",
    studentEmail: "daniel.brooks@student.demo",
    teamKey: "ai-dev",
    eventName: "AI Pair Programming",
    dayOffset: 6,
    hour: 15,
    status: BookingStatus.CONFIRMED,
  },
  {
    studentName: "Sofia Martinez",
    studentEmail: "sofia.martinez@student.demo",
    teamKey: "data-analytics",
    eventName: "SQL Optimization Workshop",
    dayOffset: 9,
    hour: 11,
    status: BookingStatus.CONFIRMED,
  },
];

const getFutureWeekdaySlot = (dayOffset: number, hour: number): Date => {
  const slot = new Date();
  slot.setUTCDate(slot.getUTCDate() + dayOffset);

  while (slot.getUTCDay() === 0 || slot.getUTCDay() === 6) {
    slot.setUTCDate(slot.getUTCDate() + 1);
  }

  slot.setUTCHours(hour, 0, 0, 0);
  return slot;
};

async function apiRequest<T>(
  method: ApiMethod,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  let req =
    method === "GET"
      ? request(app).get(`/api${path}`)
      : method === "POST"
        ? request(app).post(`/api${path}`)
        : method === "PUT"
          ? request(app).put(`/api${path}`)
          : request(app).patch(`/api${path}`);

  if (token) {
    req = req.set("Authorization", `Bearer ${token}`);
  }

  if (body !== undefined) {
    req = req.send(body as string | object);
  }

  const res = await req;
  if (!res.ok) {
    console.error(`❌ API Error [${res.status}] ${path}:`, JSON.stringify(res.body, null, 2));
    throw new Error(res.body?.message || `API call failed for ${path}`);
  }

  return res.body.data as T;
}

async function ensureAuthenticatedAdmin(): Promise<{
  token: string;
  userId: string;
}> {
  const totalUsers = await prisma.user.count();

  if (totalUsers === 0) {
    if (!BOOTSTRAP_SECRET) {
      throw new Error("BOOTSTRAP_SECRET is required to create the initial super admin.");
    }

    console.log("🔐 Bootstrapping the first super admin...");
    const result = await apiRequest<{ token: string; user: { id: string } }>(
      "POST",
      "/auth/bootstrap",
      {
        bootstrapSecret: BOOTSTRAP_SECRET,
        firstName: SUPER_ADMIN_FIRST_NAME,
        lastName: SUPER_ADMIN_LAST_NAME,
        email: SUPER_ADMIN_EMAIL,
        password: DEFAULT_PASSWORD,
      },
    );

    return { token: result.token, userId: result.user.id };
  }

  console.log(`🔐 Logging in as ${SUPER_ADMIN_EMAIL}...`);
  const result = await apiRequest<{ token: string; user: { id: string } }>("POST", "/auth/login", {
    email: SUPER_ADMIN_EMAIL,
    password: DEFAULT_PASSWORD,
  });

  return { token: result.token, userId: result.user.id };
}

async function resetDemoDataKeepingAdmin(adminId?: string) {
  if (!RESET_DEMO_DATA) {
    return;
  }

  console.log("🧹 Resetting existing demo data while keeping the super admin account...");
  await prisma.booking.deleteMany();
  await prisma.student.deleteMany();
  await prisma.userAvailabilityException.deleteMany();
  await prisma.userWeeklyAvailability.deleteMany();
  await prisma.eventRoutingState.deleteMany();
  await prisma.eventCoach.deleteMany();
  await prisma.event.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.eventOffering.deleteMany();

  if (adminId) {
    await prisma.user.deleteMany({ where: { id: { not: adminId } } });
  }
}

async function ensureUser(
  authToken: string,
  member: DemoMemberDefinition,
  role: UserRole,
): Promise<SeedUser> {
  const existingUser = await prisma.user.findUnique({
    where: { email: member.email.toLowerCase() },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  if (existingUser) {
    return existingUser;
  }

  const result = await apiRequest<{ user: SeedUser }>(
    "POST",
    "/auth/register",
    {
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      password: DEFAULT_PASSWORD,
      role,
      timezone: "UTC",
    },
    authToken,
  );

  return result.user;
}

async function seedCatalog(authToken: string) {
  const createdOfferings = new Map<string, { id: string; name: string }>();

  for (const offering of offeringDefinitions) {
    let existing = await prisma.eventOffering.findUnique({
      where: { key: offering.key },
    });
    if (!existing) {
      existing = (await apiRequest<{ id: string; name: string }>(
        "POST",
        "/event-offerings",
        {
          ...offering,
          isActive: true,
        },
        authToken,
      )) as never;
    }
    createdOfferings.set(offering.key, {
      id: existing.id,
      name: existing.name,
    });
  }

  return { createdOfferings };
}

async function ensureCoachAvailability(userIds: string[]) {
  for (const userId of userIds) {
    await prisma.userWeeklyAvailability.deleteMany({ where: { userId } });
    await prisma.userWeeklyAvailability.createMany({
      data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        userId,
        dayOfWeek,
        startTime: "09:00",
        endTime: "17:00",
      })),
    });
  }
}

async function main() {
  console.log("🚀 Populating the app with realistic demo data...");

  const { token, userId } = await ensureAuthenticatedAdmin();
  await resetDemoDataKeepingAdmin(userId);

  const { createdOfferings } = await seedCatalog(token);

  const seededTeams: Array<{
    key: string;
    id: string;
    name: string;
    coaches: Array<{ id: string; firstName: string; lastName: string }>;
    events: Array<{ id: string; name: string }>;
  }> = [];

  for (const teamDefinition of demoTeams) {
    const admin = await ensureUser(token, teamDefinition.admin, UserRole.TEAM_ADMIN);
    const coaches: SeedUser[] = [];

    for (const coachDefinition of teamDefinition.coaches) {
      const coach = await ensureUser(token, coachDefinition, UserRole.COACH);
      coaches.push(coach);
    }

    await ensureCoachAvailability(coaches.map((coach) => coach.id));

    const teamResponse = await apiRequest<{ id: string; name: string }>(
      "POST",
      "/teams",
      {
        name: teamDefinition.name,
        description: teamDefinition.description,
        teamLeadId: admin.id,
      },
      token,
    );

    for (const member of [admin, ...coaches]) {
      await prisma.teamMember.upsert({
        where: {
          teamId_userId: {
            teamId: teamResponse.id,
            userId: member.id,
          },
        },
        update: { isActive: true },
        create: {
          teamId: teamResponse.id,
          userId: member.id,
          isActive: true,
        },
      });
    }

    const createdEvents: Array<{ id: string; name: string }> = [];
    for (const eventDefinition of teamDefinition.events) {
      const offering = createdOfferings.get(eventDefinition.offeringKey);
      const interactionType = interactionTypeKeyMap[eventDefinition.interactionKey];

      if (!offering || !interactionType) {
        throw new Error(`Missing seed catalog dependency for ${eventDefinition.name}`);
      }

      const event = await apiRequest<{ id: string; name: string }>(
        "POST",
        `/teams/${teamResponse.id}/events`,
        {
          name: eventDefinition.name,
          description: eventDefinition.description,
          offeringId: offering.id,
          interactionType,
          assignmentStrategy: eventDefinition.assignmentStrategy,
          durationSeconds: eventDefinition.durationMinutes * 60,
          locationType: EventLocationType.VIRTUAL,
          locationValue: "https://zoom.us/j/demo-session-room",
          isActive: true,
          minCoachCount: eventDefinition.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN ? 2 : 1,
        },
        token,
      );

      const candidateCoaches =
        eventDefinition.assignmentStrategy === AssignmentStrategy.ROUND_ROBIN
          ? coaches
          : coaches.slice(0, 1);

      await apiRequest(
        "PUT",
        `/events/${event.id}/coaches`,
        {
          coaches: candidateCoaches.map((coach, index) => ({
            userId: coach.id,
            coachOrder: index + 1,
          })),
        },
        token,
      );

      createdEvents.push({ id: event.id, name: event.name });
    }

    seededTeams.push({
      key: teamDefinition.key,
      id: teamResponse.id,
      name: teamResponse.name,
      coaches: coaches.map((coach) => ({
        id: coach.id,
        firstName: coach.firstName,
        lastName: coach.lastName,
      })),
      events: createdEvents,
    });
  }

  console.log("🗓️ Creating sample student bookings...");
  const createdBookingIds: string[] = [];

  for (const plan of sampleBookingPlans) {
    const team = seededTeams.find((entry) => entry.key === plan.teamKey);
    const event = team?.events.find((entry) => entry.name === plan.eventName);

    if (!team || !event) {
      throw new Error(`Unable to find seeded event ${plan.eventName} for ${plan.teamKey}`);
    }

    const startTime = getFutureWeekdaySlot(plan.dayOffset, plan.hour).toISOString();
    const bookingResult = await apiRequest<{ booking: { id: string } }>("POST", "/bookings", {
      studentName: plan.studentName,
      studentEmail: plan.studentEmail,
      teamId: team.id,
      eventId: event.id,
      startTime,
      timezone: "UTC",
      notes: `Seeded demo booking for ${team.name}`,
    });

    createdBookingIds.push(bookingResult.booking.id);

    if (plan.status === BookingStatus.COMPLETED) {
      const completedStart = getFutureWeekdaySlot(-Math.max(plan.dayOffset, 2), plan.hour);
      const completedEnd = new Date(completedStart.getTime() + 45 * 60 * 1000);
      await prisma.booking.update({
        where: { id: bookingResult.booking.id },
        data: {
          startTime: completedStart,
          endTime: completedEnd,
          status: BookingStatus.COMPLETED,
        },
      });
    }
  }

  const students = await prisma.student.findMany({
    include: {
      bookings: {
        select: { startTime: true },
        orderBy: { startTime: "asc" },
      },
    },
  });

  for (const student of students) {
    const firstBookedAt = student.bookings[0]?.startTime ?? null;
    const lastBookedAt = student.bookings[student.bookings.length - 1]?.startTime ?? null;
    await prisma.student.update({
      where: { id: student.id },
      data: { firstBookedAt, lastBookedAt },
    });
  }

  const [userCount, teamCount, eventCount, bookingCount, studentCount] = await Promise.all([
    prisma.user.count(),
    prisma.team.count(),
    prisma.event.count(),
    prisma.booking.count(),
    prisma.student.count(),
  ]);

  console.log("✅ Demo data is ready.");
  console.log(
    JSON.stringify(
      {
        users: userCount,
        teams: teamCount,
        events: eventCount,
        bookings: bookingCount,
        students: studentCount,
        recentBookingIds: createdBookingIds.slice(-3),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("❌ Error during demo data population:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
