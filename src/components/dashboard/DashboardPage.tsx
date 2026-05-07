import { Link } from "@tanstack/react-router";
import { useAuth } from "../../lib/auth";
import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useState } from "react";
import { listBriefs } from "../../lib/mockApi";
import { DashboardSummaryCards } from "./DashboardSummaryCards";
import { BriefTable } from "./BriefTable";
import { useI18n } from "../../lib/i18n";

export function DashboardPage() {
  const { t } = useI18n();
  const auth = useAuth();

  const { data = [], isLoading } = useQuery({
    queryKey: ["briefs", auth.user?.id],
    queryFn: () => listBriefs(auth.user?.id),
  });
  const [globalFilter, setGlobalFilter] = useState("");

  return (
    <main className="page-shell">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-civic-700">
            {auth.isAuthenticated
              ? t("dashboard.workspace")
              : t("dashboard.testing")}
          </p>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">
            {t("dashboard.title")}
          </h1>
          {!auth.isAuthenticated ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {t("dashboard.testingCopy")}
            </p>
          ) : null}
        </div>
        <Link to="/briefs/new" className="btn-primary w-full sm:w-auto">
          <FileText size={16} />
          {t("dashboard.start")}
        </Link>
      </div>
      <DashboardSummaryCards />
      <BriefTable
        data={data}
        isLoading={isLoading}
        globalFilter={globalFilter}
        onGlobalFilterChange={setGlobalFilter}
      />
    </main>
  );
}
