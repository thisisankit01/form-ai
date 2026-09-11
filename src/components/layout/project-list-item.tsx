import Link from "next/link";

interface ProjectListItemProps {
  project: {
    id: string;
    name: string;
    updatedAt: string;
  };
  isActive?: boolean;
}

export function ProjectListItem({ project, isActive = false }: ProjectListItemProps) {
  return (
    <Link 
      href={`/app/projects/${project.id}`} 
      className={`flex items-center px-4 py-3 text-text-secondary hover:bg-surface-muted hover:text-text rounded-lg ${isActive ? "bg-surface-muted text-text" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-text-xs font-medium truncate">{project.name}</h3>
        <p className="text-text-xs text-text-secondary">{new Date(project.updatedAt).toLocaleDateString()}</p>
      </div>
      <span className="text-text-xs">{project.name.charAt(0)}</span>
    </Link>
  );
}