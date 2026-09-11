interface AnalysisOverviewProps {
  analysis: {
    summary: string;
    targetUsers: string[];
    coreProblem: string;
    keyFeatures: string[];
    businessModel: string;
    improvements: Array<{
      id: string;
      title: string;
      rationale: string;
      priority: "high" | "medium" | "low";
    }>;
    mvpFeatures: Array<{
      id: string;
      title: string;
      userValue: string;
      priority: "must" | "should";
    }>;
  };
}

export function AnalysisOverview({ analysis }: AnalysisOverviewProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-text font-semibold">What this product does</h2>
        <p className="text-text-secondary">{analysis.summary}</p>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-text font-semibold">Who it serves / Problem it solves</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-text font-medium mb-2">Target Users</h3>
            <ul className="space-y-2 text-text-secondary">
              {analysis.targetUsers.map((user, index) => (
                <li key={index}>• {user}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-text font-medium mb-2">Core Problem</h3>
            <p className="text-text-secondary">{analysis.coreProblem}</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-text font-semibold">Key Features</h2>
        <div className="space-y-2">
          {analysis.keyFeatures.map((feature, index) => (
            <div key={index} className="flex items-start space-x-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface-muted shrink-0">
                <span className="text-text-secondary font-medium">•</span>
              </div>
              <div className="flex-1">
                <p className="text-text">{feature}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-text font-semibold">Business Model</h2>
        <p className="text-text-secondary">{analysis.businessModel}</p>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-text font-semibold">Opportunities</h2>
        <div className="space-y-2">
          {analysis.improvements.map((imp) => (
            <div key={imp.id} className="flex items-start space-x-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-${getPriorityColor(imp.priority)}/20 shrink-0">
                <span className="text-text-xs font-medium text-${getPriorityColor(imp.priority)}">{imp.priority.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-text font-medium">{imp.title}</h3>
                <p className="text-text-secondary">{imp.rationale}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-text font-semibold">Proposed MVP Features</h2>
        <div className="space-y-2">
          {analysis.mvpFeatures.map((feat) => (
            <div key={feat.id} className="flex items-start space-x-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-${getPriorityColor(feat.priority)}/20 shrink-0">
                <span className="text-text-xs font-medium text-${getPriorityColor(feat.priority)}">{feat.priority.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <h3 className="text-text font-medium">{feat.title}</h3>
                <p className="text-text-secondary">{feat.userValue}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
