import Link from "next/link";
import { formatStatusLabel } from "@/components/dashboard/status-label";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string;
    updatedAt: string;
    status: string;
    progress: number;
  };
}

function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "completed":
      return "success";
    case "in progress":
      return "accent";
    case "planning":
      return "warning";
    default:
      return "text";
  }
}

function getStatusBgColor(status: string): string {
  const color = getStatusColor(status);
  return `bg-${color}/20`;
}

function getStatusTextColor(status: string): string {
  const color = getStatusColor(status);
  return `text-${color}`;
}

function getProgressBarColor(status: string): string {
  const color = getStatusColor(status);
  return `bg-${color}`;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const statusBgClass = getStatusBgColor(project.status);
  const statusTextClass = getStatusTextColor(project.status);
  const progressBarClass = getProgressBarColor(project.status);

  return (
    <Link
      href={`/app/projects/${project.id}`}
      className="flex flex-col h-full bg-surface border border-line rounded-panel hover:border-accent transition-colors"
    >
      <div className="flex-1 p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-text font-semibold">{project.name}</h3>
          <span className={`${statusBgClass} ${statusTextClass} px-2 py-0.5 text-text-xs rounded-full`}>
            {formatStatusLabel(project.status)}
          </span>
        </div>
        <p className="text-text-secondary line-clamp-3">{project.description}</p>
        <div className="mt-4 flex items-center">
          <span className="text-text-xs">{new Date(project.updatedAt).toLocaleDateString()}</span>
        </div>
      </div>
      <div className={`h-1 w-full ${progressBarClass}`} style={{ width: `${project.progress}%` }}></div>
    </Link>
  );
}
