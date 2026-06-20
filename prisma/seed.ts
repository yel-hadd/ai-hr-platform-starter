/* eslint-disable no-console */
import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { embedTexts, toVectorLiteral } from "../src/lib/ai/embeddings";
import { HANDBOOK } from "./handbook";

const prisma = new PrismaClient();
const PASSWORD = "password123";

type Seed = {
  email: string;
  name: string;
  role: Role;
  title: string;
  department: string;
  location: string;
  salary: number;
  manager?: string; // email of manager
  login: boolean; // demo login account?
};

const PEOPLE: Seed[] = [
  { email: "admin@acme.test", name: "Sam Super", role: "SUPER_ADMIN", title: "Platform Administrator", department: "IT", location: "Remote", salary: 185000, login: true },
  { email: "hr@acme.test", name: "Hana HR", role: "HR_ADMIN", title: "HR Business Partner", department: "People", location: "Remote", salary: 145000, login: true },
  { email: "manager@acme.test", name: "Marcus Manager", role: "MANAGER", title: "Engineering Manager", department: "Engineering", location: "Austin, TX", salary: 165000, login: true },
  { email: "employee@acme.test", name: "Erin Employee", role: "EMPLOYEE", title: "Software Engineer", department: "Engineering", location: "Austin, TX", salary: 120000, manager: "manager@acme.test", login: true },
  { email: "nina@acme.test", name: "Nina Patel", role: "EMPLOYEE", title: "Frontend Engineer", department: "Engineering", location: "Remote", salary: 118000, manager: "manager@acme.test", login: false },
  { email: "omar@acme.test", name: "Omar Said", role: "EMPLOYEE", title: "Backend Engineer", department: "Engineering", location: "Austin, TX", salary: 122000, manager: "manager@acme.test", login: false },
];

async function seedPeople() {
  if ((await prisma.user.count()) > 0) {
    console.log("• People already seeded — skipping.");
    return;
  }
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const byEmail: Record<string, string> = {}; // email -> employeeId

  // Pass 1: create users + employees (no manager link yet).
  for (const p of PEOPLE) {
    const user = await prisma.user.create({
      data: {
        email: p.email,
        name: p.name,
        role: p.role,
        passwordHash: p.login ? passwordHash : await bcrypt.hash("disabled", 10),
        employee: {
          create: {
            title: p.title,
            department: p.department,
            location: p.location,
            salary: p.salary,
            startDate: new Date("2023-01-15"),
            leaveBalances: {
              create: [
                { type: "VACATION", totalDays: 20, usedDays: 4 },
                { type: "SICK", totalDays: 10, usedDays: 1 },
                { type: "PERSONAL", totalDays: 5, usedDays: 0 },
              ],
            },
          },
        },
      },
      include: { employee: true },
    });
    byEmail[p.email] = user.employee!.id;
  }

  // Pass 2: wire up manager relationships.
  for (const p of PEOPLE) {
    if (p.manager) {
      await prisma.employee.update({
        where: { id: byEmail[p.email] },
        data: { managerId: byEmail[p.manager] },
      });
    }
  }

  // A couple of leave requests so approvals have something to show.
  const erin = byEmail["employee@acme.test"];
  const nina = byEmail["nina@acme.test"];
  await prisma.leaveRequest.createMany({
    data: [
      { employeeId: erin, type: "VACATION", startDate: new Date("2026-07-06"), endDate: new Date("2026-07-08"), days: 3, reason: "Long weekend trip", status: "PENDING" },
      { employeeId: nina, type: "SICK", startDate: new Date("2026-06-22"), endDate: new Date("2026-06-22"), days: 1, reason: "Doctor appointment", status: "PENDING" },
      { employeeId: erin, type: "VACATION", startDate: new Date("2026-04-10"), endDate: new Date("2026-04-11"), days: 2, reason: "Family event", status: "APPROVED" },
    ],
  });

  console.log(`• Seeded ${PEOPLE.length} people (4 demo logins).`);
}

async function seedHandbook() {
  // HNSW index for fast cosine search over the halfvec column.
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS handbook_embedding_idx
     ON "HandbookChunk" USING hnsw (embedding halfvec_cosine_ops);`,
  );

  if ((await prisma.handbookChunk.count()) > 0) {
    console.log("• Handbook already seeded — skipping.");
    return;
  }

  const hasKey =
    !!process.env.OPENROUTER_API_KEY ||
    !!process.env.OPENAI_API_KEY ||
    !!process.env.AI_GATEWAY_API_KEY;
  if (!hasKey) {
    console.warn(
      "⚠ No embedding API key (OPENROUTER_API_KEY / OPENAI_API_KEY / AI_GATEWAY_API_KEY). " +
        "Skipping handbook embedding — RAG will return no results until you add a key and re-seed.",
    );
    return;
  }

  console.log(`• Embedding ${HANDBOOK.length} handbook sections…`);
  const vectors = await embedTexts(
    HANDBOOK.map((h) => `${h.section}\n${h.content}`),
  );

  for (let i = 0; i < HANDBOOK.length; i++) {
    const chunk = await prisma.handbookChunk.create({
      data: { section: HANDBOOK[i].section, content: HANDBOOK[i].content },
    });
    const literal = toVectorLiteral(vectors[i]);
    await prisma.$executeRawUnsafe(
      `UPDATE "HandbookChunk" SET embedding = $1::halfvec WHERE id = $2`,
      literal,
      chunk.id,
    );
  }
  console.log("• Handbook embedded.");
}

async function main() {
  await seedPeople();
  await seedHandbook();
}

main()
  .then(() => console.log("✓ Seed complete."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
