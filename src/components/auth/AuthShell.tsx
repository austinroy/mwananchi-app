import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import type React from "react";
import { useAuth } from "../../lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  if (auth.isAuthenticated) return children;

  return <AuthGateCard />;
}

export function AuthFormShell({
  eyebrow,
  title,
  description,
  footer,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="page-shell grid min-h-[72vh] place-items-center">
      <section className="surface w-full max-w-md rounded-lg p-5 sm:p-6">
        <p className="text-sm font-semibold text-civic-700">{eyebrow}</p>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6">{children}</div>
        <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
      </section>
    </main>
  );
}

export function AuthRedirectingCard() {
  return (
    <main className="page-shell grid min-h-[72vh] place-items-center">
      <section className="surface w-full max-w-md rounded-lg p-5 text-center sm:p-6">
        <h1 className="text-2xl font-bold text-ink">
          Taking you to your dashboard...
        </h1>
      </section>
    </main>
  );
}

export function AuthGateCard() {
  return (
    <main className="page-shell grid min-h-[70vh] place-items-center">
      <section className="surface w-full max-w-xl rounded-lg p-5 text-center sm:p-8">
        <div className="mx-auto grid size-12 place-items-center rounded-md bg-civic-700 text-white">
          <LogIn size={22} />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-ink sm:text-3xl">
          Sign in to continue
        </h1>
        <p className="mt-3 text-slate-600">
          Mwananchi App saves briefs, chat history, and generated actions to
          your workspace.
        </p>
        <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
          <Link to="/login" className="btn-primary w-full sm:w-auto">
            Sign in
          </Link>
          <Link to="/register" className="btn-secondary w-full sm:w-auto">
            Create account
          </Link>
        </div>
      </section>
    </main>
  );
}
