"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AvatarDropdownProps {
  name: string;
  initials: string;
  email?: string;
  items: {
    label: string;
    href?: string;
    onClick?: () => void;
    variant?: "default" | "destructive";
  }[];
}

export function AvatarDropdown({ name, initials, email, items }: AvatarDropdownProps) {
  return (
    <div className="relative">
      <AvatarDropdownTrigger name={name} initials={initials} email={email} items={items} />
    </div>
  );
}

function AvatarDropdownTrigger({ name, initials, email, items }: AvatarDropdownProps) {
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
        className="flex items-center space-x-2 text-text-secondary hover:text-text"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-sm font-medium text-text-inverse bg-accent">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="hidden sm:block text-sm font-medium text-text-inverse">{name}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-surface border border-line rounded-panel shadow-lg z-[var(--z-dropdown)] animate-in fade-in-0 zoom-in-95" role="menu">
          <div className="px-3 py-2 border-b border-line">
            <p className="text-sm font-medium text-text">{name}</p>
            {email && <p className="text-xs text-text-secondary">{email}</p>}
          </div>
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                if (item.onClick) item.onClick();
                else if (item.href) window.location.href = item.href;
              }}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:bg-surface-muted hover:text-text rounded-control transition-colors ${item.variant === "destructive" ? "text-danger" : ""}`}
              role="menuitem"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
