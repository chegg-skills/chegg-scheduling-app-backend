import { prisma } from "../shared/db/prisma";
import {
  AssignmentStrategy,
  EventBookingMode,
  EventLocationType,
  InteractionType,
  SessionLeadershipStrategy,
  UserRole,
} from "@prisma/client";

async function main() {
  console.log("🛠️ Starting custom event seeding for Engineering Team...");

  // 1. Locate the target team: Engineering Team
  const team = await prisma.team.findFirst({
    where: { name: { contains: "engineering", mode: "insensitive" } },
  });

  if (!team) {
    throw new Error("❌ Could not find Engineering Team in the database. Please seed the demo data first!");
  }
  console.log(`✅ Found Team: ${team.name} (${team.id})`);

  // 2. Locate Admin user to assign as creator
  const superAdmin = await prisma.user.findFirst({
    where: { role: UserRole.SUPER_ADMIN },
  });
  const teamLead = await prisma.user.findUnique({
    where: { id: team.teamLeadId },
  });
  const creator = superAdmin ?? teamLead;

  if (!creator) {
    throw new Error("❌ Could not find a creator user (Super Admin or Team Lead).");
  }
  console.log(`✅ Found Creator: ${creator.firstName} ${creator.lastName} (${creator.id})`);

  // 3. Locate target coaches for the Live Lesson event
  const ava = await prisma.user.findFirst({
    where: { email: "ava.backend@demo.chegg.local" },
  });
  const liam = await prisma.user.findFirst({
    where: { email: "liam.systems@demo.chegg.local" },
  });
  const noah = await prisma.user.findFirst({
    where: { email: "noah.apis@demo.chegg.local" },
  });

  if (!ava || !liam || !noah) {
    throw new Error("❌ Target coaches (Ava, Liam, Noah) could not be found. Ensure they are in the database.");
  }
  console.log("✅ Found Coaches for Live Lesson: Ava Backend, Liam Systems, Noah APIs");

  // 4. Resolve default event type mappings
  const mentorship = await prisma.eventType.findFirst({
    where: { key: "mentorship" },
  });
  const liveLessons = await prisma.eventType.findFirst({
    where: { key: "live_lessons" },
  });
  const qa = await prisma.eventType.findFirst({
    where: { key: "qa" },
  });

  const standardType = mentorship ?? qa ?? liveLessons;
  if (!standardType) {
    throw new Error("❌ Could not find any EventType to link events to.");
  }

  // Helper function to safely upsert (clean delete & recreate to avoid complex cascade edge cases)
  const upsertEvent = async (slug: string, data: any) => {
    const existing = await prisma.event.findUnique({ where: { publicBookingSlug: slug } });
    if (existing) {
      console.log(`🧹 Cleaning up existing event with slug "${slug}"...`);
      await prisma.eventScheduleSlot.deleteMany({ where: { eventId: existing.id } });
      await prisma.eventCoach.deleteMany({ where: { eventId: existing.id } });
      await prisma.event.delete({ where: { id: existing.id } });
    }
    return prisma.event.create({ data });
  };

  // --- CREATE EVENT 1 ---
  // Create an on-demand tutoring session event with the following settings:
  // - Interaction type: one-to-one
  // - Coach visibility on public booking page (allowStudentCoachChoice: true)
  // - Booking mode: based on coach availability (COACH_AVAILABILITY)
  console.log("➡️ Seeding Event 1: On-Demand Tutoring Session...");
  const event1 = await upsertEvent("on-demand-tutoring-session", {
    name: "On-Demand Tutoring Session",
    description: "Get immediate help on demand.",
    eventTypeId: qa?.id ?? standardType.id,
    teamId: team.id,
    interactionType: InteractionType.ONE_TO_ONE,
    assignmentStrategy: AssignmentStrategy.ROUND_ROBIN,
    durationSeconds: 1800, // 30 minutes
    locationType: EventLocationType.VIRTUAL,
    locationValue: "https://zoom.us/j/on-demand-room",
    isActive: true,
    bookingMode: EventBookingMode.COACH_AVAILABILITY,
    allowStudentCoachChoice: true,
    createdById: creator.id,
    updatedById: creator.id,
    publicBookingSlug: "on-demand-tutoring-session",
  });
  await prisma.eventCoach.create({
    data: { eventId: event1.id, coachUserId: ava.id, coachOrder: 1 },
  });

  // --- CREATE EVENT 2 ---
  // Create a one-to-one tutoring session event
  console.log("➡️ Seeding Event 2: One-to-One Tutoring Session...");
  const event2 = await upsertEvent("one-to-one-tutoring-session", {
    name: "One-to-One Tutoring Session",
    description: "Standard individual engineering tutoring support.",
    eventTypeId: mentorship?.id ?? standardType.id,
    teamId: team.id,
    interactionType: InteractionType.ONE_TO_ONE,
    assignmentStrategy: AssignmentStrategy.DIRECT,
    durationSeconds: 3600, // 60 minutes
    locationType: EventLocationType.VIRTUAL,
    locationValue: "https://zoom.us/j/one-to-one-room",
    isActive: true,
    bookingMode: EventBookingMode.COACH_AVAILABILITY,
    allowStudentCoachChoice: false,
    createdById: creator.id,
    updatedById: creator.id,
    publicBookingSlug: "one-to-one-tutoring-session",
  });
  await prisma.eventCoach.create({
    data: { eventId: event2.id, coachUserId: liam.id, coachOrder: 1 },
  });

  // --- CREATE EVENT 3 ---
  // Create a back-end live assessment event
  console.log("➡️ Seeding Event 3: Back-End Live Assessment...");
  const event3 = await upsertEvent("backend-live-assessment", {
    name: "Back-End Live Assessment",
    description: "Evaluates production architecture and coding paradigms.",
    eventTypeId: mentorship?.id ?? standardType.id,
    teamId: team.id,
    interactionType: InteractionType.ONE_TO_ONE,
    assignmentStrategy: AssignmentStrategy.DIRECT,
    durationSeconds: 5400, // 90 minutes
    locationType: EventLocationType.VIRTUAL,
    locationValue: "https://zoom.us/j/backend-assessment-room",
    isActive: true,
    bookingMode: EventBookingMode.COACH_AVAILABILITY,
    allowStudentCoachChoice: false,
    createdById: creator.id,
    updatedById: creator.id,
    publicBookingSlug: "backend-live-assessment",
  });
  await prisma.eventCoach.create({
    data: { eventId: event3.id, coachUserId: ava.id, coachOrder: 1 },
  });

  // --- CREATE EVENT 4 ---
  // Create a front-end live assessment event
  console.log("➡️ Seeding Event 4: Front-End Live Assessment...");
  const event4 = await upsertEvent("frontend-live-assessment", {
    name: "Front-End Live Assessment",
    description: "Evaluates layout, state, and browser optimization capabilities.",
    eventTypeId: mentorship?.id ?? standardType.id,
    teamId: team.id,
    interactionType: InteractionType.ONE_TO_ONE,
    assignmentStrategy: AssignmentStrategy.DIRECT,
    durationSeconds: 5400, // 90 minutes
    locationType: EventLocationType.VIRTUAL,
    locationValue: "https://zoom.us/j/frontend-assessment-room",
    isActive: true,
    bookingMode: EventBookingMode.COACH_AVAILABILITY,
    allowStudentCoachChoice: false,
    createdById: creator.id,
    updatedById: creator.id,
    publicBookingSlug: "frontend-live-assessment",
  });
  await prisma.eventCoach.create({
    data: { eventId: event4.id, coachUserId: noah.id, coachOrder: 1 },
  });

  // --- CREATE EVENT 5 ---
  // Create a live lesson event where there will be one coach and two co-hosts and we can send the reveal later.
  // Create a pre-defined session slot for this event.
  console.log("➡️ Seeding Event 5: Live Lesson...");
  const event5 = await upsertEvent("live-lesson", {
    name: "Live Lesson",
    description: "Guided technical masterclass session.",
    eventTypeId: liveLessons?.id ?? standardType.id,
    teamId: team.id,
    interactionType: InteractionType.ONE_TO_MANY,
    assignmentStrategy: AssignmentStrategy.DIRECT,
    durationSeconds: 3600, // 60 minutes
    locationType: EventLocationType.VIRTUAL,
    locationValue: "https://zoom.us/j/live-lesson-room",
    isActive: true,
    bookingMode: EventBookingMode.FIXED_SLOTS,
    sessionLeadershipStrategy: SessionLeadershipStrategy.SINGLE_COACH,
    minCoachCount: 1,      // 1 lead coach
    targetCoHostCount: 2,  // 2 co-hosts
    deferCoachReveal: true, // "send the reveal later"
    allowStudentCoachChoice: false,
    createdById: creator.id,
    updatedById: creator.id,
    publicBookingSlug: "live-lesson",
  });

  // Associate Lead (Ava) and Co-hosts (Liam, Noah)
  await prisma.eventCoach.createMany({
    data: [
      { eventId: event5.id, coachUserId: ava.id, coachOrder: 1 },
      { eventId: event5.id, coachUserId: liam.id, coachOrder: 2 },
      { eventId: event5.id, coachUserId: noah.id, coachOrder: 3 },
    ],
  });

  // Create a pre-defined schedule slot starting tomorrow at 14:00 UTC
  const startTime = new Date();
  startTime.setDate(startTime.getDate() + 1);
  startTime.setUTCHours(14, 0, 0, 0);

  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour duration

  await prisma.eventScheduleSlot.create({
    data: {
      eventId: event5.id,
      startTime,
      endTime,
      capacity: 25,
      isActive: true,
      isCancelled: false,
    },
  });

  console.log(`✅ Pre-defined schedule slot created: ${startTime.toISOString()} to ${endTime.toISOString()} (Capacity: 25)`);
  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
