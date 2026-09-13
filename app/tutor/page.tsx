import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

export default async function TutorIndexPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?redirect=/tutor");
  }

  const project = await prisma.project.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });

  if (project) {
    redirect(`/project/${project.id}/tutor`);
  }

  redirect("/projects");
}
