import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { manrope, inter, jetbrains } from "@/lib/fonts";
import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import { WorkspaceTopBar } from "@/components/layout/workspace-top-bar";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "FORM - Workspace",
  description: "Website-to-product studio",
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?callbackUrl=/app");

  return (
    <div className={`${manrope.className} ${inter.className} ${jetbrains.className} antialiased form-app-shell`}>
      <WorkspaceSidebar />
      <div className="form-app-main">
        <WorkspaceTopBar />
        <main className="form-page-scroll flex min-h-0 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
