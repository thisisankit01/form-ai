"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function SettingsPage() {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState(() => {
    if (typeof window === "undefined") return "My Workspace";
    try { return JSON.parse(window.localStorage.getItem("form-workspace-settings") || "{}").workspaceName || "My Workspace"; } catch { return "My Workspace"; }
  });
  const [notifications, setNotifications] = useState(() => {
    if (typeof window === "undefined") return true;
    try { const value = JSON.parse(window.localStorage.getItem("form-workspace-settings") || "{}").notifications; return typeof value === "boolean" ? value : true; } catch { return true; }
  });
  const [frequency, setFrequency] = useState(() => {
    if (typeof window === "undefined") return "weekly";
    try { return JSON.parse(window.localStorage.getItem("form-workspace-settings") || "{}").frequency || "weekly"; } catch { return "weekly"; }
  });
  const [saved, setSaved] = useState(false);

  function saveSettings() {
    window.localStorage.setItem("form-workspace-settings", JSON.stringify({ workspaceName, notifications, frequency }));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <h1 className="text-text-xl font-bold mb-2">Workspace Settings</h1>
        <p className="text-text-secondary">Manage your FORM workspace preferences</p>
      </div>
      
      <div className="bg-surface rounded-panel border border-line p-6">
        <h2 className="text-text font-semibold mb-4">General</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input
              id="workspace-name"
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="Enter your workspace name"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notifications">Email Notifications</Label>
            <Switch
              id="email-notifications"
              checked={notifications}
              onCheckedChange={setNotifications}
              aria-label="Enable email notifications"
            />
          </div>
          
          <div>
            <Label htmlFor="update-frequency">Update Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="update-frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-surface rounded-panel border border-line p-6">
        <h2 className="text-text font-semibold mb-4">API Connections</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="deepseek-key">DeepSeek API Key</Label>
            <Input
              id="deepseek-key"
              type="password"
              placeholder="••••••••••••••••"
            />
          </div>
          
          <div>
            <Label htmlFor="firecrawl-key">Firecrawl API Key</Label>
            <Input
              id="firecrawl-key"
              type="password"
              placeholder="••••••••••••••••"
            />
          </div>
          
          <div>
            <Label htmlFor="inngest-key">Inngest Keys</Label>
            <p className="text-text-xs text-text-secondary">Configured in environment variables</p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 bg-surface rounded-panel border border-line p-6">
        <h2 className="text-text font-semibold mb-4">Usage & Limits</h2>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-text font-medium">AI Calls Today</h3>
              <p className="text-text-2xl font-bold">3/30</p>
            </div>
            <div>
              <h3 className="text-text font-bold">Global AI Calls</h3>
              <p className="text-text-2xl font-bold">45/300</p>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h3 className="text-text font-medium">Active Projects</h3>
              <p className="text-text-2xl font-bold">2/10</p>
            </div>
            <div>
              <h3 className="text-text font-bold">Active Jobs</h3>
              <p className="text-text-2xl font-bold">0/1</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end">
          <Button variant="outline" className="mr-4" onClick={() => router.back()}>
            Cancel
          </Button>
        <Button variant="default" onClick={saveSettings}>
          {saved ? "Saved" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
