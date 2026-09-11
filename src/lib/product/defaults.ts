export const sampleSpec = {
  "schemaVersion": 1,
  "name": "TaskFlow",
  "description": "A modern task management platform for independent consultants",
  "audience": "Independent consultants and small advisory teams",
  "positioning": "Unlike generic project tools, TaskFlow is built specifically for consultants who need to manage multiple client projects with clear deliverables and billing integration.",
  "features": [
    {
      "id": "feat-1",
      "title": "Client Portals",
      "description": "Secure client-facing portals for project updates, file sharing, and feedback collection",
      "priority": "must"
    },
    {
      "id": "feat-2",
      "title": "Time Tracking & Billing",
      "description": "Integrated time tracking with automated invoicing based on billable hours",
      "priority": "must"
    },
    {
      "id": "feat-3",
      "title": "Template Library",
      "description": "Pre-built project templates for common consulting engagements (strategy, audit, implementation)",
      "priority": "should"
    },
    {
      "id": "feat-4",
      "title": "Milestone Management",
      "description": "Break projects into phases with clear deliverables, due dates, and acceptance criteria",
      "priority": "must"
    }
  ],
  "theme": {
    "preset": "editorial-light",
    "accent": "lime",
    "density": "comfortable",
    "radius": "sharp"
  },
  "navigation": [
    { "id": "nav-1", "label": "Dashboard", "pageId": "page-1" },
    { "id": "nav-2", "label": "Projects", "pageId": "page-2" },
    { "id": "nav-3", "label": "Clients", "pageId": "page-3" },
    { "id": "nav-4", "label": "Billing", "pageId": "page-4" }
  ],
  "pages": [
    {
      "id": "page-1",
      "slug": "dashboard",
      "title": "Dashboard",
      "kind": "dashboard" as const,
      "sections": [
        {
          "id": "sec-1",
          "type": "metric-row" as const,
          "metrics": [
            { "id": "m1", "label": "Active Projects", "value": "12", "delta": "+3" },
            { "id": "m2", "label": "Billable Hours", "value": "142h", "delta": "+12%" },
            { "id": "m3", "label": "Invoice Total", "value": "$28,400", "delta": "+18%" },
            { "id": "m4", "label": "Client Satisfaction", "value": "4.8/5", "delta": "+0.2" }
          ]
        },
        {
          "id": "sec-2",
          "type": "data-table" as const,
          "heading": "Recent Activity",
          "columns": [
            { "key": "date", "label": "Date" },
            { "key": "client", "label": "Client" },
            { "key": "project", "label": "Project" },
            { "key": "action", "label": "Action" },
            { "key": "status", "label": "Status" }
          ],
          "rows": [
            {
              "id": "row-1",
              "date": "Today",
              "client": "Acme Corp",
              "project": "Website Redesign",
              "action": "Design review completed",
              "status": "approved"
            },
            {
              "id": "row-2",
              "date": "Yesterday",
              "client": "Beta LLC",
              "project": "Market Analysis",
              "action": "Invoice sent",
              "status": "paid"
            },
            {
              "id": "row-3",
              "date": "Sep 5",
              "client": "Gamma Inc",
              "project": "Process Optimization",
              "action": "Kickoff meeting scheduled",
              "status": "pending"
            }
          ]
        },
        {
          "id": "sec-3",
          "type": "activity-list" as const,
          "heading": "Upcoming Deadlines",
          "items": [
            {
              "id": "item-1",
              "title": "Final proposal due",
              "detail": "Acme Corp Website Redesign",
              "timeLabel": "Sep 10"
            },
            {
              "id": "item-2",
              "title": "Client presentation",
              "detail": "Beta LLC Market Analysis",
              "timeLabel": "Sep 12"
            },
            {
              "id": "item-3",
              "title": "Milestone 1 review",
              "detail": "Gamma Inc Process Optimization",
              "timeLabel": "Sep 15"
            }
          ]
        }
      ]
    },
    {
      "id": "page-2",
      "slug": "projects",
      "title": "Projects",
      "kind": "dashboard" as const,
      "sections": [
        {
          "id": "sec-4",
          "type": "data-table" as const,
          "heading": "All Projects",
          "columns": [
            { "key": "name", "label": "Project Name" },
            { "key": "client", "label": "Client" },
            { "key": "status", "label": "Status" },
            { "key": "progress", "label": "Progress" },
            { "key": "updated", "label": "Updated" }
          ],
          "rows": [
            {
              "id": "row-1",
              "name": "Website Redesign",
              "client": "Acme Corp",
              "status": "In Progress",
              "progress": "65%",
              "updated": "Sep 7"
            },
            {
              "id": "row-2",
              "name": "Market Analysis",
              "client": "Beta LLC",
              "status": "Completed",
              "progress": "100%",
              "updated": "Sep 6"
            },
            {
              "id": "row-3",
              "name": "Process Optimization",
              "client": "Gamma Inc",
              "status": "Planning",
              "progress": "10%",
              "updated": "Sep 5"
            }
          ]
        }
      ]
    }
  ],
  "uiDirection": "Clean, consultant-focused interface with emphasis on clarity and professionalism. Uses ample whitespace, clear typography, and intuitive navigation to reduce cognitive load during client work."
};