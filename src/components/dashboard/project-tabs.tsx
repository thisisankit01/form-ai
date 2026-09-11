"use client";

import { useState } from "react";

interface ProjectTabsProps {
  children: React.ReactNode;
}

export function ProjectTabs({ children }: ProjectTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex border-b border-line bg-surface shrink-0" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          className={`flex-1 px-4 py-3 text-text-secondary hover:text-text border-b-2 transition-colors ${
            activeTab === "overview" ? "border-accent text-text" : "border-transparent"
          }`}
        >
          Overview
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "preview"}
          onClick={() => setActiveTab("preview")}
          className={`flex-1 px-4 py-3 text-text-secondary hover:text-text border-b-2 transition-colors ${
            activeTab === "preview" ? "border-accent text-text" : "border-transparent"
          }`}
        >
          Preview
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "code"}
          onClick={() => setActiveTab("code")}
          className={`flex-1 px-4 py-3 text-text-secondary hover:text-text border-b-2 transition-colors ${
            activeTab === "code" ? "border-accent text-text" : "border-transparent"
          }`}
        >
          Code
        </button>
        <button
          role="tab"
          aria-selected={activeTab === "activity"}
          onClick={() => setActiveTab("activity")}
          className={`flex-1 px-4 py-3 text-text-secondary hover:text-text border-b-2 transition-colors ${
            activeTab === "activity" ? "border-accent text-text" : "border-transparent"
          }`}
        >
          Activity
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-4 form-page-scroll">
        {activeTab === "overview" && (
          <div className="space-y-6">{children}</div>
        )}
        {activeTab === "preview" && (
          <div className="space-y-6">
            <h2 className="text-panel-title font-semibold">Live Preview</h2>
            <div className="bg-surface rounded-panel border border-line p-6 text-center">
              <p className="text-text-secondary">Preview functionality would be implemented here</p>
              <p className="text-meta text-text-secondary mt-2">Connected to analysis and product spec</p>
            </div>
          </div>
        )}
        {activeTab === "code" && (
          <div className="space-y-6">
            <h2 className="text-panel-title font-semibold">Generated Code</h2>
            <div className="bg-surface rounded-panel border border-line p-6">
              <p className="text-text-secondary">Code export functionality would be implemented here</p>
              <p className="text-meta text-text-secondary mt-2">Downloadable starter code</p>
            </div>
          </div>
        )}
        {activeTab === "activity" && (
          <div className="space-y-6">
            <h2 className="text-panel-title font-semibold">Project Activity</h2>
            <div className="bg-surface rounded-panel border border-line p-6">
              <p className="text-text-secondary">Activity timeline would be implemented here</p>
              <p className="text-meta text-text-secondary mt-2">Showing edits, versions, and jobs</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}