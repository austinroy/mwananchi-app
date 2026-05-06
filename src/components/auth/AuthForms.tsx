import { useClerk } from "@clerk/clerk-react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import { Eye, EyeOff, LogIn, UserPlus, UserCog, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import type React from "react";
import { useAuth } from "../../lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  if (auth.isAuthenticated) return children;

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

export function LoginPage() {
  const auth = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await auth.localLogin(value);
      await navigate({ to: "/dashboard" });
    },
  });

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [auth.isAuthenticated, auth.isLoading, navigate]);

  if (auth.isAuthenticated) return <AuthRedirectingCard />;

  return (
    <AuthFormShell
      eyebrow="Welcome back"
      title="Sign in to Mwananchi App"
      description={
        auth.isClerkEnabled
          ? "Use your Mwananchi App account to save briefs, messages, and civic actions."
          : "Local development fallback is active until Clerk is configured."
      }
      footer={
        <span>
          New here?{" "}
          <Link to="/register" className="font-semibold text-civic-700">
            Create an account
          </Link>
        </span>
      }
    >
      {auth.isClerkEnabled ? (
        <button
          className="btn-primary w-full"
          type="button"
          onClick={() => {
            void clerk.openSignIn({
              forceRedirectUrl: "/dashboard",
              fallbackRedirectUrl: "/dashboard",
            });
          }}
        >
          <LogIn size={16} />
          Continue with Clerk
        </button>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="email">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Email</span>
                <input
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  type="email"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                />
              </label>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Password</span>
                <span className="relative mt-2 block">
                  <input
                    className="w-full rounded-md border border-civic-100 px-3 py-2 pr-11"
                    type={isPasswordVisible ? "text" : "password"}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    required
                  />
                  <button
                    aria-label={
                      isPasswordVisible ? "Hide password" : "Show password"
                    }
                    className="absolute inset-y-0 right-2 grid w-8 place-items-center text-slate-500 transition hover:text-civic-700"
                    type="button"
                    onClick={() => setIsPasswordVisible((value) => !value)}
                  >
                    {isPasswordVisible ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </span>
              </label>
            )}
          </form.Field>
          <button className="btn-primary w-full" type="submit">
            <LogIn size={16} />
            Sign in
          </button>
        </form>
      )}
    </AuthFormShell>
  );
}

export function RegisterPage() {
  const auth = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await auth.localRegister(value);
      await navigate({ to: "/dashboard" });
    },
  });

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      void navigate({ to: "/dashboard", replace: true });
    }
  }, [auth.isAuthenticated, auth.isLoading, navigate]);

  if (auth.isAuthenticated) return <AuthRedirectingCard />;

  return (
    <AuthFormShell
      eyebrow="Create workspace"
      title="Create your Mwananchi account"
      description={
        auth.isClerkEnabled
          ? "Create an account to keep your civic briefs connected to your workspace."
          : "Local development fallback is active until Clerk is configured."
      }
      footer={
        <span>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-civic-700">
            Sign in
          </Link>
        </span>
      }
    >
      {auth.isClerkEnabled ? (
        <button
          className="btn-primary w-full"
          type="button"
          onClick={() => {
            void clerk.openSignUp({
              forceRedirectUrl: "/dashboard",
              fallbackRedirectUrl: "/dashboard",
            });
          }}
        >
          <UserPlus size={16} />
          Continue with Clerk
        </button>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="name">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Name</span>
                <input
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                />
              </label>
            )}
          </form.Field>
          <form.Field name="email">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Email</span>
                <input
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  type="email"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  required
                />
              </label>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Password</span>
                <span className="relative mt-2 block">
                  <input
                    className="w-full rounded-md border border-civic-100 px-3 py-2 pr-11"
                    type={isPasswordVisible ? "text" : "password"}
                    value={field.state.value}
                    onChange={(event) => field.handleChange(event.target.value)}
                    required
                    minLength={8}
                  />
                  <button
                    aria-label={
                      isPasswordVisible ? "Hide password" : "Show password"
                    }
                    className="absolute inset-y-0 right-2 grid w-8 place-items-center text-slate-500 transition hover:text-civic-700"
                    type="button"
                    onClick={() => setIsPasswordVisible((value) => !value)}
                  >
                    {isPasswordVisible ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </span>
              </label>
            )}
          </form.Field>
          <button className="btn-primary w-full" type="submit">
            <UserPlus size={16} />
            Create account
          </button>
        </form>
      )}
    </AuthFormShell>
  );
}

export function AccountPage() {
  const auth = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const signOut = async () => {
    if (auth.isClerkEnabled) {
      await clerk.signOut({ redirectUrl: "/" });
      return;
    }

    await auth.localLogout();
    await navigate({ to: "/" });
  };

  return (
    <RequireAuth>
      <main className="page-shell max-w-4xl">
        <div className="mb-6">
          <p className="text-sm font-semibold text-civic-700">
            Workspace settings
          </p>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">Account</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Manage your Mwananchi App identity and sign-in settings.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="surface rounded-lg p-5 sm:p-6">
            <div className="grid size-14 place-items-center rounded-md bg-civic-700 text-white">
              <UserCog size={24} />
            </div>
            <h2 className="mt-5 text-xl font-bold text-ink">
              {auth.user?.name ?? "Mwananchi user"}
            </h2>
            <p className="mt-1 break-words text-sm text-slate-600">
              {auth.user?.email}
            </p>
            <p className="mt-4 rounded-md bg-civic-50 px-3 py-2 text-sm font-semibold text-civic-800">
              {auth.isClerkEnabled
                ? "Clerk account"
                : "Local development account"}
            </p>
          </section>
          <section className="surface rounded-lg p-5 sm:p-6">
            <h2 className="text-xl font-bold text-ink">Account management</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {auth.isClerkEnabled
                ? "Open Clerk account management to update profile details, password, security settings, connected sign-in methods, and account deletion."
                : "Local fallback accounts are stored in this browser for development. Configure Clerk to enable production profile and security management."}
            </p>
            <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
              {auth.isClerkEnabled ? (
                <button
                  className="btn-primary w-full sm:w-auto"
                  type="button"
                  onClick={() => void clerk.openUserProfile()}
                >
                  <UserCog size={16} />
                  Manage with Clerk
                </button>
              ) : null}
              <button
                className="btn-secondary w-full sm:w-auto"
                type="button"
                onClick={() => {
                  void signOut();
                }}
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </section>
        </div>
      </main>
    </RequireAuth>
  );
}
