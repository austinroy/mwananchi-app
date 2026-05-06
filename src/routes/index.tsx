import { Link } from "@tanstack/react-router";
import { ArrowRight, FileText, Home } from "lucide-react";

export function LandingPage() {
  return (
    <main className="page-shell">
      <section className="grid items-center gap-8 py-6 sm:min-h-[72vh] sm:py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-civic-700 sm:text-sm sm:tracking-[0.18em]">
            Civic intelligence for citizens
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-ink sm:text-5xl lg:text-6xl">
            Turn public documents into public understanding.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 sm:mt-6 sm:text-lg sm:leading-8">
            Mwananchi App helps citizens, journalists, students, and community
            groups explain policies, ask sharper questions, and draft practical
            civic actions.
          </p>
          <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
            <Link to="/briefs/new" className="btn-primary w-full sm:w-auto">
              <FileText size={18} />
              Create a civic brief
            </Link>
            <Link to="/dashboard" className="btn-secondary w-full sm:w-auto">
              <Home size={18} />
              View dashboard
            </Link>
          </div>
        </div>
        <div className="surface rounded-lg p-4 sm:p-6">
          <div className="rounded-md border border-civic-100 bg-civic-50 p-5">
            <p className="text-sm font-semibold text-civic-700">
              Example brief
            </p>
            <h2 className="mt-2 text-2xl font-bold text-ink">
              County Budget Public Notice
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-700">
              This is a sample brief showing how Mwananchi App explains a real
              civic document. It is an example only, so you can explore the
              workflow before creating your own.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/share/$briefId"
                params={{ briefId: "brief-sample-budget" }}
                className="btn-primary w-full sm:w-auto"
              >
                Open the example
                <ArrowRight size={16} />
              </Link>
              <Link to="/briefs/new" className="btn-secondary w-full sm:w-auto">
                Create your own brief
              </Link>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {["Explain", "Question", "Act"].map((item) => (
              <div
                key={item}
                className="rounded-md border border-civic-100 p-4"
              >
                <p className="font-semibold text-civic-900">{item}</p>
                <p className="mt-1 text-sm text-slate-600">
                  Plain language workflow
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
