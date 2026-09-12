import { redirect } from "next/navigation";

export default async function QuizAliasPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = await params;
  redirect(`/project/${resolvedParams.projectId}/quiz`);
}
