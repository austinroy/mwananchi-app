import { categories } from "../../lib/civicOptions";

export function DashboardSummaryCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.slice(0, 6).map((category) => (
        <div key={category} className="surface rounded-lg p-5">
          <p className="font-semibold text-civic-900">{category}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Track documents, questions, and actions.
          </p>
        </div>
      ))}
    </div>
  );
}
