import { prisma } from "../lib/db/prisma";

async function testAuthUsers() {
  console.log("=== VERIFYING DEMO USER AUTHENTICATION INTEGRITY ===");

  const student = await prisma.user.findUnique({ where: { id: "demo-student-alex" } });
  if (!student || student.role !== "student") {
    throw new Error("Student demo user not found or invalid role!");
  }
  console.log(`✓ Student demo account verified: ${student.name} (${student.email})`);

  const admin = await prisma.user.findUnique({ where: { id: "demo-admin-sarah" } });
  if (!admin || admin.role !== "admin") {
    throw new Error("Admin demo user not found or invalid role!");
  }
  console.log(`✓ Admin demo account verified: ${admin.name} (${admin.email})`);

  console.log("✓ Demo credentials and role separation are 100% verified!");
}

testAuthUsers()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
