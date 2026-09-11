"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProjectDropdown({ projectName = "Current Project" }: { projectName?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center space-x-2 text-text-secondary hover:text-text",
          isOpen && "text-text"
        )}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
         <span className="max-w-40 truncate">{projectName}</span>
        <ChevronDown
          className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 mt-2 w-56 bg-surface border border-line rounded-panel shadow-lg z-[var(--z-dropdown)] animate-in fade-in-0 zoom-in-95"
          role="menu"
        >
          <Link
            href="/app/projects/new"
            className="block px-4 py-2 text-text-sm hover:bg-surface-muted"
            role="menuitem"
          >
            New Project
          </Link>
          <hr className="my-1 border-line" />
          <Link
            href="/app/projects"
            className="block px-4 py-2 text-text-sm hover:bg-surface-muted"
            role="menuitem"
          >
            My Projects
          </Link>
        </div>
      )}
    </div>
  );
}
