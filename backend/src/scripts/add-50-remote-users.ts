import { Pool } from "pg";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.REMOTE_DB_URL) {
  console.error("❌ REMOTE_DB_URL env var is not set. Exiting.");
  process.exit(1);
}
const remoteUrl: string = process.env.REMOTE_DB_URL;
const writeMode = process.argv.includes("--write");

const firstNames = [
  "Dev", "Rudra", "Kabir", "Shaurya", "Kian", "Reyansh", "Atharv", "Aarush", "Ishaan", "Ayaan",
  "Ansh", "Arjun", "Krishna", "Dhruv", "Aditya", "Yash", "Pranav", "Sai", "Darsh", "Arav",
  "Karan", "Neil", "Jai", "Rohan", "Rahul", "Aarav", "Vihaan", "Vivaan", "Ananya", "Diya",
  "Aanya", "Ishani", "Kiara", "Myra", "Saanvi", "Pari", "Ahana", "Avani", "Navya", "Riya",
  "Ira", "Kavya", "Aadya", "Aaradhya", "Tanisha", "Shruti", "Sia", "Zara", "Maya", "Meera"
];

const lastNames = [
  "Sharma", "Verma", "Gupta", "Kumar", "Singh", "Patel", "Reddy", "Rao", "Joshi", "Iyer",
  "Nair", "Mehta", "Choudhary", "Grover", "Malhotra", "Kapoor", "Sen", "Bose", "Das", "Roy",
  "Chandra", "Misra", "Tripathi", "Pandey", "Sinha", "Dubey", "Dwivedi", "Trivedi", "Pathak", "Chatterjee",
  "Mukherjee", "Banerjee", "Ghosh", "Sen", "Dutta", "Paul", "Sarkar", "Rishi", "Agrawal", "Bansal",
  "Goel", "Singhal", "Mittal", "Jain", "Shah", "Desai", "Kulkarni", "Prabhu", "Hegde", "Pai"
];

async function main() {
  console.log(`🚀 Starting Creation of 50 Remote Users. Mode: ${writeMode ? "WRITE" : "DRY RUN"}`);

  // Create remote pg pool and prisma client
  const pool = new Pool({
    connectionString: remoteUrl.trim(),
    ssl: { rejectUnauthorized: false }
  });

  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const weekdays = [1, 2, 3, 4, 5]; // Monday to Friday

    for (let i = 0; i < 50; i++) {
      const firstName = firstNames[i];
      const lastName = lastNames[i];
      // Start from coach 26 onwards to prevent duplicate email issues
      const coachIndex = 25 + i + 1;
      const email = `ind.coach${coachIndex}@demo.chegg.local`.toLowerCase();
      const randomHex = Math.random().toString(36).substring(2, 8);
      const publicBookingSlug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}-${randomHex}`;

      console.log(`⏳ User ${i + 1}/50: ${firstName} ${lastName} (${email}) [Slug: ${publicBookingSlug}]...`);

      if (writeMode) {
        // Create user
        const createdUser = await prisma.user.create({
          data: {
            email,
            firstName,
            lastName,
            role: UserRole.COACH,
            timezone: "Asia/Kolkata",
            country: "India",
            publicBookingSlug
          }
        });
        console.log(`    ✅ Created User: ${createdUser.email} (ID: ${createdUser.id})`);

        // Seed 9:00 AM - 5:00 PM availability slots for Mon-Fri
        await prisma.userWeeklyAvailability.createMany({
          data: weekdays.map((dayOfWeek) => ({
            userId: createdUser.id,
            dayOfWeek,
            startTime: "09:00",
            endTime: "17:00"
          }))
        });
        console.log(`    ✅ Created 9:00 AM - 5:00 PM availability slots.`);
      } else {
        console.log(`    [Plan] Will create user: ${firstName} ${lastName} with Country: India, Timezone: Asia/Kolkata, Role: COACH, and Mon-Fri (09:00 - 17:00) weekly availability.`);
      }
    }

    console.log("\n🎉 Remote users creation finished successfully!");

  } catch (error) {
    console.error("❌ Error creating remote users:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
