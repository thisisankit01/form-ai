import { ProjectWorkspace } from "@/components/dashboard/project-workspace";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProjectWorkspace projectId={id} />;
}
