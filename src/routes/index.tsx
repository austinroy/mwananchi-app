import { Link } from "@tanstack/react-router";
import { ArrowRight, FileText, Home } from "lucide-react";
import { useI18n } from "../lib/i18n";

export function LandingPage() {
  const { t } = useI18n();

  return (
    <main className="page-shell">
      <section className="grid items-center gap-8 py-6 sm:min-h-[72vh] sm:py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-civic-700 sm:text-sm sm:tracking-[0.18em]">
            {t("landing.eyebrow")}
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-ink sm:text-5xl lg:text-6xl">
            {t("landing.title")}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 sm:mt-6 sm:text-lg sm:leading-8">
            {t("landing.copy")}
          </p>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
            <Link to="/briefs/new" className="btn-primary w-full sm:w-auto">
              <FileText size={18} />
              {t("landing.createBrief")}
            </Link>
            <Link to="/dashboard" className="btn-secondary w-full sm:w-auto">
              <Home size={18} />
              {t("landing.viewDashboard")}
            </Link>
          </div>
        </div>
        <div className="surface rounded-lg p-4 sm:p-6">
          <div className="rounded-md border border-white/45 bg-white/45 p-5 backdrop-blur-xl">
            <p className="text-sm font-semibold text-civic-700">
              {t("landing.exampleLabel")}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink">
              {t("landing.exampleTitle")}
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-700">
              {t("landing.exampleCopy")}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/briefs/$briefId"
                params={{ briefId: "brief-sample-budget" }}
                className="btn-primary w-full sm:w-auto"
              >
                {t("landing.openExample")}
                <ArrowRight size={16} />
              </Link>
              <Link to="/briefs/new" className="btn-secondary w-full sm:w-auto">
                {t("landing.createOwn")}
              </Link>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              {
                title: t("landing.workflowExplain"),
                copy: t("landing.workflowExplainCopy"),
              },
              {
                title: t("landing.workflowQuestion"),
                copy: t("landing.workflowQuestionCopy"),
              },
              {
                title: t("landing.workflowAct"),
                copy: t("landing.workflowActCopy"),
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-md border border-civic-100 p-4"
              >
                <p className="font-semibold text-civic-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
