import { Link } from "@tanstack/react-router";
import { FileText, Sparkles } from "lucide-react";

export function BriefTabs({
  briefId,
  activeTab,
}: {
  briefId: string;
  activeTab: "brief" | "actions";
}) {
  const tabs = [
    {
      id: "brief",
      label: "Brief",
      to: "/briefs/$briefId",
      icon: <FileText size={16} />,
    },
    {
      id: "actions",
      label: "Actions",
      to: "/briefs/$briefId/actions",
      icon: <Sparkles size={16} />,
    },
  ] as const;

  return (
    <nav className="mb-6 border-b border-white/45" aria-label="Brief sections">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Link
              key={tab.id}
              to={tab.to}
              params={{ briefId }}
              className={[
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-t-md border-b-2 px-3 pb-3 pt-2 text-sm font-semibold transition sm:px-4",
                isActive
                  ? "border-civic-900 bg-civic-900 text-white shadow-sm"
                  : "border-transparent text-slate-600 hover:border-civic-200 hover:bg-white/55 hover:text-civic-800",
              ].join(" ")}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
