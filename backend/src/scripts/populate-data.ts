import { UserRole, AssignmentStrategy, EventLocationType } from "@prisma/client";
import "dotenv/config";
import { prisma } from "../shared/db/prisma";

const API_BASE_URL = "http://localhost:4000/api";
const SUPER_ADMIN_EMAIL = "mohitkumar3005@example.com";
const DEFAULT_PASSWORD = "pass1234";

async function apiFetch(url: string, options: any) {
    const res = await fetch(url, options);
    const data: any = await res.json();
    if (!res.ok) {
        console.error(`❌ API Error [${res.status}] ${url}:`, JSON.stringify(data, null, 2));
        throw new Error(`API call failed: ${data.message || res.statusText}`);
    }
    return data;
}

async function main() {
    console.log("🚀 Starting database population via API (refined names)...");

    // 1. Wipe database using Prisma (no API for this)
    console.log("🧹 Wiping existing data (except super admin)...");
    await prisma.eventHost.deleteMany({});
    await prisma.eventRoutingState.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.team.deleteMany({});
    await prisma.eventOffering.deleteMany({});
    await prisma.eventInteractionType.deleteMany({});

    const superAdmin = await prisma.user.findUnique({ where: { email: SUPER_ADMIN_EMAIL } });
    await prisma.user.deleteMany({
        where: { id: { not: superAdmin?.id } }
    });

    // 2. Login to get token
    console.log(`🔐 Logging in as ${SUPER_ADMIN_EMAIL}...`);
    const loginData = await apiFetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: SUPER_ADMIN_EMAIL, password: DEFAULT_PASSWORD }),
    });

    const token = loginData.data.token;
    const authHeaders = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
    };

    // 3. Create Event Offerings
    console.log("📅 Creating event offerings...");
    const offerings = [
        { key: "on_demand", name: "On-demand sessions", description: "Immediate help sessions" },
        { key: "tutoring", name: "Tutoring sessions", description: "Regular academic help" },
        { key: "mentorship", name: "Mentorship sessions", description: "Career and growth guidance" },
        { key: "qa", name: "Q&A sessions", description: "Quick question answering" },
        { key: "live_lessons", name: "Live lessons", description: "Scheduled interactive teaching" },
        { key: "live_assessments", name: "Live assessments", description: "One-on-one evaluation" },
    ];

    const createdOfferings = [];
    for (const off of offerings) {
        const data = await apiFetch(`${API_BASE_URL}/event-offerings`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify(off),
        });
        createdOfferings.push(data.data);
    }

    // 4. Create Interaction Types
    console.log("🤝 Creating interaction types...");
    const interactionTypes = [
        {
            key: "one_to_one",
            name: "1 to 1 connect",
            description: "Standard 1:1 interaction",
            supportsRoundRobin: true,
            supportsMultipleHosts: true,
            minHosts: 1,
            maxHosts: null,
            minParticipants: 1,
            maxParticipants: 1,
        },
        {
            key: "one_to_many",
            name: "1 to n connect",
            description: "One host, multiple participants",
            supportsRoundRobin: false,
            supportsMultipleHosts: false,
            minHosts: 1,
            maxHosts: null,
            minParticipants: 2,
            maxParticipants: 50,
        },
        {
            key: "many_to_one",
            name: "n to 1 connect",
            description: "Multiple hosts, one participant",
            supportsRoundRobin: false,
            supportsMultipleHosts: true,
            minHosts: 2,
            maxHosts: null,
            minParticipants: 1,
            maxParticipants: 1,
        },
        {
            key: "many_to_many",
            name: "n to n connect",
            description: "Multiple hosts, multiple participants",
            supportsRoundRobin: false,
            supportsMultipleHosts: true,
            minHosts: 2,
            maxHosts: null,
            minParticipants: 2,
            maxParticipants: 50,
        },
    ];

    const createdInteractionTypes = [];
    for (const it of interactionTypes) {
        const data = await apiFetch(`${API_BASE_URL}/event-interaction-types`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify(it),
        });
        createdInteractionTypes.push(data.data);
    }

    // 5. Create Team Admins
    console.log("👮 Creating team admins...");
    const teamAdmins = [];
    for (let i = 1; i <= 10; i++) {
        const data = await apiFetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
                firstName: "Admin",
                lastName: i.toString(),
                email: `admin${i}@test.com`,
                password: DEFAULT_PASSWORD,
                role: UserRole.TEAM_ADMIN,
                timezone: "UTC",
            }),
        });
        teamAdmins.push(data.data.user);
    }

    // 6. Create Coaches
    console.log("👨‍🏫 Creating coaches...");
    const coaches = [];
    for (let i = 1; i <= 20; i++) {
        const data = await apiFetch(`${API_BASE_URL}/auth/register`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
                firstName: "Coach",
                lastName: i.toString(),
                email: `coach${i}@test.com`,
                password: DEFAULT_PASSWORD,
                role: UserRole.COACH,
                timezone: "UTC",
            }),
        });
        coaches.push(data.data.user);
    }

    // 7. Create Teams
    console.log("👥 Creating teams...");
    const teams = [];
    const teamNames = [
        "Engineering team",
        "UI/UX team",
        "Cyber security team",
        "AI team",
        "Data analytics team",
        "Data science team"
    ];
    for (let i = 0; i < teamNames.length; i++) {
        const adminNum = (i % 10) + 1;
        const admin = teamAdmins[adminNum - 1];
        const teamData = await apiFetch(`${API_BASE_URL}/teams`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
                name: teamNames[i],
                description: `Dedicated team for ${teamNames[i]}`,
                teamLeadId: admin.id,
            }),
        });
        const team = teamData.data;

        // Add random coaches to team
        const teamSize = 3 + Math.floor(Math.random() * 5);
        const shuffledCoaches = [...coaches].sort(() => 0.5 - Math.random());
        const selectedCoaches = shuffledCoaches.slice(0, teamSize);

        const members = [...selectedCoaches, admin];
        for (const member of members) {
            await apiFetch(`${API_BASE_URL}/teams/${team.id}/members`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify({ userId: member.id }),
            });
        }

        teams.push({ ...team, members });
    }

    // 8. Create Events
    console.log("📅 Creating events...");
    for (let i = 1; i <= 20; i++) {
        const teamWrapper = teams[Math.floor(Math.random() * teams.length)];
        const offering = createdOfferings[Math.floor(Math.random() * createdOfferings.length)];
        const interactionType = createdInteractionTypes[Math.floor(Math.random() * createdInteractionTypes.length)];

        const strategy = interactionType.supportsRoundRobin && Math.random() > 0.5
            ? AssignmentStrategy.ROUND_ROBIN
            : AssignmentStrategy.DIRECT;

        const eventData = await apiFetch(`${API_BASE_URL}/teams/${teamWrapper.id}/events`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
                name: `${offering.name} - ${i}`,
                description: `Sample event for ${offering.name} using ${interactionType.name}`,
                offeringId: offering.id,
                interactionTypeId: interactionType.id,
                assignmentStrategy: strategy,
                durationSeconds: (30 + Math.floor(Math.random() * 6) * 15) * 60,
                locationType: EventLocationType.VIRTUAL,
                locationValue: "https://zoom.us/j/sample-meeting",
            }),
        });

        const event = eventData.data;

        // Assign hosts via API
        if (strategy === AssignmentStrategy.DIRECT) {
            const hostCount = interactionType.supportsMultipleHosts
                ? Math.min(teamWrapper.members.length, 2 + Math.floor(Math.random() * 2))
                : 1;

            const shuffledMembers = [...teamWrapper.members].sort(() => 0.5 - Math.random());
            const selectedHosts = shuffledMembers.slice(0, hostCount);

            const hostsPayload = selectedHosts.map((h, index) => ({
                userId: h.id,
                hostOrder: index + 1,
            }));

            await apiFetch(`${API_BASE_URL}/events/${event.id}/hosts`, {
                method: "PUT",
                headers: authHeaders,
                body: JSON.stringify({ hosts: hostsPayload }),
            });
        } else {
            // Round Robin: all eligible members are hosts
            const hostsPayload = teamWrapper.members.map((h, index) => ({
                userId: h.id,
                hostOrder: index + 1,
            }));

            await apiFetch(`${API_BASE_URL}/events/${event.id}/hosts`, {
                method: "PUT",
                headers: authHeaders,
                body: JSON.stringify({ hosts: hostsPayload }),
            });
        }
    }

    console.log("✅ Database population completed successfully via API calls!");
}

main()
    .catch((e) => {
        console.error("❌ Error during population:", e);
        process.exit(1);
    });
