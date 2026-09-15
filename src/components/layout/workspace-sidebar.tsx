"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FORMMark } from "@/lib/brand/mark";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/layout/logout-button";

export function WorkspaceSidebar({ projects = [] }: { projects?: { id: string; name: string; updatedAt: string }[] }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsExpanded(window.innerWidth >= 1200);
      if (!mobile) {
        setIsDrawerOpen(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Desktop: sidebar is always visible
  // Mobile: sidebar is a drawer
  if (isMobile) {
    return (
      <>
        {/* Mobile menu button in top bar would trigger this */}
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetTrigger asChild>
            <button
              className="p-2 rounded-control text-text-secondary hover:text-text hover:bg-surface-muted"
              aria-label="Open navigation"
            >
              <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </SheetTrigger>
          <SheetContent className="w-[272px] max-w-[calc(100vw-48px)] p-0" side="left">
            <SidebarContent isExpanded={true} onClose={() => setIsDrawerOpen(false)} projects={projects} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

return (
    <aside
      className={cn(
        "flex flex-col bg-ink border-r border-line-dark transition-all duration-200 ease-out",
        isExpanded ? "w-[216px]" : "w-[64px]"
      )}
      aria-label="Main navigation"
    >
       <SidebarContent isExpanded={isExpanded} onToggle={() => setIsExpanded(!isExpanded)} projects={projects} />
    </aside>
  );
}

function SidebarContent({
  isExpanded,
  onToggle,
  onClose,
  projects,
}: {
  isExpanded: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  projects: { id: string; name: string; updatedAt: string }[];
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Brand / Header */}
      <div className="flex h-16 items-center justify-between border-b border-line-dark px-4">
        <div className="flex items-center space-x-3">
          <FORMMark className="h-5 w-5 text-text-inverse" />
          {isExpanded && (
            <span className="whitespace-nowrap text-sm font-bold tracking-[0.18em] text-text-inverse">FORM</span>
          )}
        </div>
        {onToggle && (
          <button
            onClick={onToggle}
            className={cn(
              "p-1.5 rounded-control text-text-inverse-secondary hover:text-text-inverse hover:bg-white/5",
              isExpanded ? "rotate-0" : "rotate-180"
            )}
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={isExpanded}
          >
            <svg className="h-5 w-5 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-control text-text-inverse-secondary hover:text-text-inverse hover:bg-white/5"
            aria-label="Close navigation"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L5.586 10 4.293 8.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" role="navigation" aria-label="Projects">
        {isExpanded && <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-text-inverse-secondary">Recent projects</p>}
        <div className="space-y-1">
          {projects.length === 0 && isExpanded && <p className="px-3 py-3 text-xs leading-5 text-text-inverse-secondary">Your projects will appear here.</p>}
          {projects.map((project) => (
            <Link key={project.id} href={`/app/projects/${project.id}`} onClick={onClose} aria-label={project.name} className={cn("flex items-center gap-3 rounded-control px-3 py-2.5 text-text-inverse-secondary hover:bg-white/5 hover:text-text-inverse", !isExpanded && "justify-center")}>
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/10 text-[10px] font-bold">{project.name.slice(0, 1).toUpperCase()}</span>
              {isExpanded && <span className="truncate text-sm font-medium">{project.name}</span>}
            </Link>
          ))}
        </div>
      </nav>

      {/* Bottom workspace area */}
      <div className="border-t border-line-dark p-3">
        {isExpanded && (
          <>
            <h2 className="px-3 pb-2 text-xs font-semibold tracking-wider uppercase text-text-inverse-secondary">
              WORKSPACE
            </h2>
            <div className="space-y-1">
              <Link
                href="/app/settings"
                className="flex items-center gap-3 px-3 py-2 text-text-inverse-secondary hover:bg-white/5 hover:text-text-inverse rounded-control"
                aria-label="Settings"
              >
                <span className="flex-shrink-0 w-5 h-5 text-center">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M11.49 3.17c.38-.38.9-.38 1.28 0l2.828 2.828a1 1 0 010 1.414l-2.828 2.828a1 1 0 01-1.414 0l-2.828-2.828a1 1 0 010-1.414zM10 4.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zm0 1a4.5 4.5 0 110 9 4.5 4.5 0 010-9z" clipRule="evenodd" />
                  </svg>
                </span>
                <span>Settings</span>
              </Link>
            </div>
          </>
        )}
        <div className={cn("mt-2", !isExpanded && "flex justify-center")}>
          <LogoutButton isExpanded={isExpanded} />
        </div>
      </div>
    </div>
  );
}
