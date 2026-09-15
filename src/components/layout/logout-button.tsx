"use client";

import { useState, useTransition } from "react";
import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

export function LogoutButton({ isExpanded }: { isExpanded: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleLogout() {
    setError(null);
    startTransition(async () => {
      const result = await logoutAction();
      if (!result.success) setError("Could not log out. Please try again.");
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        className={cn(
          "flex w-full items-center gap-3 rounded-control px-3 py-2 text-text-inverse-secondary hover:bg-white/5 hover:text-text-inverse disabled:cursor-wait disabled:opacity-60",
          !isExpanded && "w-auto justify-center",
        )}
        aria-label="Log out"
      >
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-center">↪</span>
        {isExpanded && <span>{isPending ? "Logging out..." : "Log out"}</span>}
      </button>
      {error && <p className="mt-2 px-3 text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}
