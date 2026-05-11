import { categories } from "../../lib/civicOptions";
import type { BriefCategory } from "../../lib/types";

const categoryCopy: Record<BriefCategory, string> = {
  Housing:
    "Follow tenancy notices, land plans, evictions, and county housing proposals.",
  Justice:
    "Review court, policing, legal aid, and rights-related public documents.",
  Elections:
    "Track voter notices, boundary changes, candidate rules, and election timelines.",
  Education:
    "Understand school funding, policy changes, bursaries, and student services.",
  Health:
    "Monitor clinic services, public health notices, budgets, and access concerns.",
  Budget:
    "Compare spending priorities, ward allocations, deadlines, and public comments.",
  Other:
    "Keep general civic documents organized when they do not fit another category.",
};

export function DashboardSummaryCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.slice(0, 6).map((category) => (
        <div key={category} className="surface rounded-lg p-5">
          <p className="font-semibold text-civic-900">{category}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {categoryCopy[category]}
          </p>
        </div>
      ))}
    </div>
  );
}
