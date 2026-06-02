import { prisma } from "../shared/db/prisma";

const DESCRIPTIONS: Record<string, string> = {
  "one-to-one-tutoring-session": "Personalized 1-on-1 tutoring session focusing on student course material, conceptual help, and custom queries.",
  "mentorship-session": "Individual professional mentorship, industry career guidance, and soft-skills development.",
  "live-assessment": "Technical evaluation and live assessments conducted by expert evaluators.",
  "on-demand-session": "Instant, on-demand help to resolve quick blocker issues, debugging, or conceptual questions.",
  "live-lesson": "Guided cohort teaching, interactive group lessons, and concept deep-dives.",
};

async function main() {
  console.log("Updating session type descriptions in the database...");
  for (const [slug, description] of Object.entries(DESCRIPTIONS)) {
    const result = await prisma.sessionType.updateMany({
      where: { slug },
      data: { description },
    });
    console.log(`Slug "${slug}": ${result.count} row(s) updated.`);
  }
  console.log("Database update complete!");
}

main()
  .catch((e) => {
    console.error("Error updating descriptions:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
