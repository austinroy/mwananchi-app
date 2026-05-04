import { Link, Outlet, createRootRoute, createRoute, createRouter, useNavigate } from '@tanstack/react-router';
import { useClerk } from '@clerk/clerk-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import { Eye, EyeOff, FileText, Home, LayoutDashboard, LogIn, LogOut, Menu, MessageSquare, Send, Sparkles, UserCog, UserPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type React from 'react';
import { useAuth } from './lib/auth';
import { createBrief, generateAction, getBrief, getChatMessages, listBriefs, sendChatMessage } from './lib/mockApi';
import { extractPdfText } from './lib/pdf';
import type { BriefCategory, CivicActionInput, CivicActionType, NewBriefInput } from './lib/types';

const categories: BriefCategory[] = ['Housing', 'Justice', 'Elections', 'Education', 'Health', 'Budget', 'Other'];
const actionTypes: { value: CivicActionType; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'petition', label: 'Petition' },
  { value: 'public_comment', label: 'Public comment' },
  { value: 'whatsapp_summary', label: 'WhatsApp summary' },
  { value: 'talking_points', label: 'Talking points' },
];
const actionTones: CivicActionInput['tone'][] = ['Respectful', 'Firm', 'Youth-friendly', 'Professional'];

const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: DashboardPage,
});

const newBriefRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/briefs/new',
  component: NewBriefPage,
});

const briefRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/briefs/$briefId',
  component: BriefPage,
});

const actionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/briefs/$briefId/actions',
  component: ActionsPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/account',
  component: AccountPage,
});

const routeTree = rootRoute.addChildren([indexRoute, dashboardRoute, newBriefRoute, briefRoute, actionsRoute, loginRoute, registerRoute, accountRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function AppShell() {
  const auth = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);
  const signOut = async () => {
    closeMenu();

    if (auth.isClerkEnabled) {
      await clerk.signOut({ redirectUrl: '/' });
      return;
    }

    await auth.localLogout();
    await navigate({ to: '/' });
  };

  return (
    <div className="min-h-screen bg-civic-50">
      <header className="border-b border-civic-100 bg-white">
        <nav className="page-shell relative flex items-center justify-between gap-3 py-4">
          <Link to="/" className="flex min-w-0 items-center gap-2 text-lg font-bold text-civic-900">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-civic-700 text-white">
              <Sparkles size={18} />
            </span>
            <span className="truncate">Mwananchi App</span>
          </Link>
          <button
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="btn-secondary px-3"
            type="button"
            onClick={() => setIsMenuOpen((value) => !value)}
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
            <span className="hidden sm:inline">Menu</span>
          </button>
          {isMenuOpen ? (
            <div className="absolute right-4 top-[calc(100%-0.5rem)] z-20 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-civic-100 bg-white p-2 shadow-lg">
            {auth.isAuthenticated ? (
              <div className="grid gap-1">
                <MenuLink to="/dashboard" icon={<LayoutDashboard size={16} />} label="Dashboard" onSelect={closeMenu} />
                <MenuLink to="/account" icon={<UserCog size={16} />} label="Account" onSelect={closeMenu} />
                <Link to="/briefs/new" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-civic-800 transition hover:bg-civic-50" onClick={closeMenu}>
                  <FileText size={16} />
                  New brief
                </Link>
                <button
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-civic-50"
                  type="button"
                  onClick={() => {
                    void signOut();
                  }}
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            ) : (
              <div className="grid gap-1">
                <Link to="/login" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-civic-50" onClick={closeMenu}>
                  <LogIn size={16} />
                  Sign in
                </Link>
                <Link to="/register" className="flex items-center gap-2 rounded-md bg-civic-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-civic-800" onClick={closeMenu}>
                  <UserPlus size={16} />
                  Create account
                </Link>
              </div>
            )}
            </div>
          ) : null}
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

function MenuLink({
  to,
  icon,
  label,
  onSelect,
}: {
  to: '/dashboard' | '/account';
  icon: React.ReactNode;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Link to={to} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-civic-50" onClick={onSelect}>
      {icon}
      {label}
    </Link>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  if (auth.isAuthenticated) {
    return children;
  }

  return (
    <main className="page-shell grid min-h-[70vh] place-items-center">
      <section className="surface w-full max-w-xl rounded-lg p-5 text-center sm:p-8">
        <div className="mx-auto grid size-12 place-items-center rounded-md bg-civic-700 text-white">
          <LogIn size={22} />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-ink sm:text-3xl">Sign in to continue</h1>
        <p className="mt-3 text-slate-600">
          Mwananchi App saves briefs, chat history, and generated actions to your workspace.
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

function LandingPage() {
  const auth = useAuth();

  return (
    <main className="page-shell">
      <section className="grid items-center gap-8 py-6 sm:min-h-[72vh] sm:py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-civic-700 sm:text-sm sm:tracking-[0.18em]">Civic intelligence for citizens</p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight text-ink sm:text-5xl lg:text-6xl">
            Turn public documents into public understanding.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700 sm:mt-6 sm:text-lg sm:leading-8">
            Mwananchi App helps citizens, journalists, students, and community groups explain policies,
            ask sharper questions, and draft practical civic actions.
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
          <div className="rounded-md bg-civic-900 p-5 text-white">
            <p className="text-sm text-civic-100">Sample brief</p>
            <h2 className="mt-2 text-2xl font-bold">County Budget Public Notice</h2>
            <p className="mt-4 text-sm leading-6 text-civic-100">
              Key issues: public participation window, ward allocation, service delivery impact,
              and accountability after approval.
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {['Explain', 'Question', 'Act'].map((item) => (
              <div key={item} className="rounded-md border border-civic-100 p-4">
                <p className="font-semibold text-civic-900">{item}</p>
                <p className="mt-1 text-sm text-slate-600">Plain language workflow</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function LoginPage() {
  const auth = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      await auth.localLogin(value);
      await navigate({ to: '/dashboard' });
    },
  });

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      void navigate({ to: '/dashboard', replace: true });
    }
  }, [auth.isAuthenticated, auth.isLoading, navigate]);

  if (auth.isAuthenticated) {
    return <AuthRedirectingCard />;
  }

  return (
    <AuthFormShell
      eyebrow="Welcome back"
      title="Sign in to Mwananchi App"
      description={auth.isClerkEnabled ? 'Use your Mwananchi App account to save briefs, messages, and civic actions.' : 'Local development fallback is active until Clerk is configured.'}
      footer={<span>New here? <Link to="/register" className="font-semibold text-civic-700">Create an account</Link></span>}
    >
      {auth.isClerkEnabled ? (
        <button
          className="btn-primary w-full"
          type="button"
          onClick={() => {
            void clerk.openSignIn({ forceRedirectUrl: '/dashboard', fallbackRedirectUrl: '/dashboard' });
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
                <input className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2" type="email" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} required />
              </label>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Password</span>
                <span className="relative mt-2 block">
                  <input className="w-full rounded-md border border-civic-100 px-3 py-2 pr-11" type={isPasswordVisible ? 'text' : 'password'} value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} required />
                  <button
                    aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-2 grid w-8 place-items-center text-slate-500 transition hover:text-civic-700"
                    type="button"
                    onClick={() => setIsPasswordVisible((value) => !value)}
                  >
                    {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
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

function RegisterPage() {
  const auth = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      await auth.localRegister(value);
      await navigate({ to: '/dashboard' });
    },
  });

  useEffect(() => {
    if (!auth.isLoading && auth.isAuthenticated) {
      void navigate({ to: '/dashboard', replace: true });
    }
  }, [auth.isAuthenticated, auth.isLoading, navigate]);

  if (auth.isAuthenticated) {
    return <AuthRedirectingCard />;
  }

  return (
    <AuthFormShell
      eyebrow="Create workspace"
      title="Create your Mwananchi account"
      description={auth.isClerkEnabled ? 'Create an account to keep your civic briefs connected to your workspace.' : 'Local development fallback is active until Clerk is configured.'}
      footer={<span>Already have an account? <Link to="/login" className="font-semibold text-civic-700">Sign in</Link></span>}
    >
      {auth.isClerkEnabled ? (
        <button
          className="btn-primary w-full"
          type="button"
          onClick={() => {
            void clerk.openSignUp({ forceRedirectUrl: '/dashboard', fallbackRedirectUrl: '/dashboard' });
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
                <input className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} required />
              </label>
            )}
          </form.Field>
          <form.Field name="email">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Email</span>
                <input className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2" type="email" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} required />
              </label>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Password</span>
                <span className="relative mt-2 block">
                  <input className="w-full rounded-md border border-civic-100 px-3 py-2 pr-11" type={isPasswordVisible ? 'text' : 'password'} value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} required minLength={8} />
                  <button
                    aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-2 grid w-8 place-items-center text-slate-500 transition hover:text-civic-700"
                    type="button"
                    onClick={() => setIsPasswordVisible((value) => !value)}
                  >
                    {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
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

function AuthFormShell({
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
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6">{children}</div>
        <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
      </section>
    </main>
  );
}

function AuthRedirectingCard() {
  return (
    <main className="page-shell grid min-h-[72vh] place-items-center">
      <section className="surface w-full max-w-md rounded-lg p-5 text-center sm:p-6">
        <h1 className="text-2xl font-bold text-ink">Taking you to your dashboard...</h1>
      </section>
    </main>
  );
}

function AccountPage() {
  const auth = useAuth();
  const clerk = useClerk();
  const navigate = useNavigate();
  const signOut = async () => {
    if (auth.isClerkEnabled) {
      await clerk.signOut({ redirectUrl: '/' });
      return;
    }

    await auth.localLogout();
    await navigate({ to: '/' });
  };

  return (
    <RequireAuth>
      <main className="page-shell max-w-4xl">
        <div className="mb-6">
          <p className="text-sm font-semibold text-civic-700">Workspace settings</p>
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
            <h2 className="mt-5 text-xl font-bold text-ink">{auth.user?.name ?? 'Mwananchi user'}</h2>
            <p className="mt-1 break-words text-sm text-slate-600">{auth.user?.email}</p>
            <p className="mt-4 rounded-md bg-civic-50 px-3 py-2 text-sm font-semibold text-civic-800">
              {auth.isClerkEnabled ? 'Clerk account' : 'Local development account'}
            </p>
          </section>

          <section className="surface rounded-lg p-5 sm:p-6">
            <h2 className="text-xl font-bold text-ink">Account management</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {auth.isClerkEnabled
                ? 'Open Clerk account management to update profile details, password, security settings, connected sign-in methods, and account deletion.'
                : 'Local fallback accounts are stored in this browser for development. Configure Clerk to enable production profile and security management.'}
            </p>

            <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
              {auth.isClerkEnabled ? (
                <button className="btn-primary w-full sm:w-auto" type="button" onClick={() => void clerk.openUserProfile()}>
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

function DashboardPage() {
  const auth = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ['briefs', auth.user?.id],
    queryFn: () => listBriefs(auth.user?.id),
  });

  return (
    <main className="page-shell">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-civic-700">{auth.isAuthenticated ? 'Workspace' : 'Testing mode'}</p>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">Civic briefs</h1>
          {!auth.isAuthenticated ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Dashboard access is temporarily open for testing. Sign in later to save generated briefs to your workspace.
            </p>
          ) : null}
        </div>
        <Link to="/briefs/new" className="btn-primary w-full sm:w-auto">
          <FileText size={16} />
          Start new brief
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.slice(0, 6).map((category) => (
          <div key={category} className="surface rounded-lg p-5">
            <p className="font-semibold text-civic-900">{category}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Track documents, questions, and actions.</p>
          </div>
        ))}
      </div>

      <section className="mt-8 surface rounded-lg">
        <div className="border-b border-civic-100 p-4 sm:p-5">
          <h2 className="text-xl font-bold">Recent briefs</h2>
        </div>
        <div className="divide-y divide-civic-100">
          {isLoading ? (
            <p className="p-5 text-slate-600">Loading briefs...</p>
          ) : (
            data.map((brief) => (
              <Link key={brief.id} to="/briefs/$briefId" params={{ briefId: brief.id }} className="block p-4 transition hover:bg-civic-50 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{brief.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{brief.category} · {brief.jurisdiction}</p>
                  </div>
                  <span className="text-sm font-semibold text-civic-700">Open brief</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function NewBriefPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [pdfStatus, setPdfStatus] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (input: NewBriefInput) => createBrief(input, auth.user?.id),
    onSuccess: async (brief) => {
      await queryClient.invalidateQueries({ queryKey: ['briefs', auth.user?.id] });
      await navigate({ to: '/briefs/$briefId', params: { briefId: brief.id } });
    },
  });

  const form = useForm({
    defaultValues: {
      title: '',
      category: 'Budget' as BriefCategory,
      jurisdiction: 'Kenya',
      documentText: '',
    },
    onSubmit: ({ value }) => mutation.mutate(value as NewBriefInput),
  });

  return (
    <main className="page-shell max-w-4xl">
      <h1 className="text-3xl font-bold sm:text-4xl">Create a civic brief</h1>
      <p className="mt-2 text-slate-600">Paste a policy, bill, public notice, or civic document.</p>
      {auth.isAuthenticated ? (
        <div className="mt-5 rounded-lg border border-civic-100 bg-white p-4 text-sm leading-6 text-slate-700">
          Generated briefs are saved to your dashboard.
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-signal/30 bg-white p-4 text-sm leading-6 text-slate-700">
          You can create a brief without signing in. Create an account when you want to keep briefs across sessions.
        </div>
      )}
      <form
        className="mt-6 surface rounded-lg p-4 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <form.Field name="title">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Document title</span>
                <input className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
              </label>
            )}
          </form.Field>
          <form.Field name="jurisdiction">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Jurisdiction</span>
                <input className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
              </label>
            )}
          </form.Field>
          <form.Field name="category">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Category</span>
                <select className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2" value={field.state.value} onChange={(event) => field.handleChange(event.target.value as BriefCategory)}>
                  {categories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </label>
            )}
          </form.Field>
        </div>
        <form.Field name="documentText">
          {(field) => (
            <div className="mt-5">
              <label className="block">
                <span className="text-sm font-semibold">Upload PDF</span>
                <input
                  className="mt-2 w-full rounded-md border border-civic-100 bg-white px-3 py-2 text-sm"
                  type="file"
                  accept="application/pdf"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;

                    setPdfStatus('Extracting text from PDF...');
                    try {
                      const result = await extractPdfText(file, (progress) => setPdfStatus(progress.message));
                      field.handleChange(result.text);
                      setPdfStatus(
                        result.method === 'ocr'
                          ? `OCR extracted text from ${file.name}. Review it before generating the brief.`
                          : `Extracted text from ${file.name}. Review it before generating the brief.`,
                      );
                    } catch (error) {
                      setPdfStatus(error instanceof Error ? error.message : 'Could not extract text from this PDF.');
                    }
                  }}
                />
              </label>
              {pdfStatus ? <p className="mt-2 text-sm leading-6 text-slate-600">{pdfStatus}</p> : null}
              <label className="mt-5 block">
                <span className="text-sm font-semibold">Document text</span>
                <textarea className="mt-2 min-h-56 w-full rounded-md border border-civic-100 px-3 py-2 leading-7 sm:min-h-64" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
              </label>
            </div>
          )}
        </form.Field>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">MVP note: mock analysis is active until the AI backend is connected.</p>
          <button className="btn-primary w-full sm:w-auto" disabled={mutation.isPending} type="submit">
            <Sparkles size={16} />
            {mutation.isPending ? 'Generating...' : 'Generate brief'}
          </button>
        </div>
      </form>
    </main>
  );
}

function BriefPage() {
  const { briefId } = briefRoute.useParams();
  const { data: brief, isLoading } = useQuery({ queryKey: ['brief', briefId], queryFn: () => getBrief(briefId) });

  if (isLoading || !brief) return <main className="page-shell">Loading brief...</main>;

  return (
    <main className="page-shell">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-civic-700">{brief.category} · {brief.jurisdiction}</p>
          <h1 className="text-3xl font-bold sm:text-4xl">{brief.title}</h1>
        </div>
        <Link to="/briefs/$briefId/actions" params={{ briefId }} className="btn-primary w-full sm:w-auto">
          <Send size={16} />
          Generate action
        </Link>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4">
          <BriefSection title="Plain-language summary" items={[brief.summary]} />
          <BriefSection title="Key points" items={brief.keyPoints} />
          <BriefSection title="Who is affected" items={brief.affectedGroups} />
          <BriefSection title="Concerns and risks" items={brief.concerns} />
          <BriefSection title="Questions citizens should ask" items={brief.citizenQuestions} />
          <BriefSection title="Suggested next steps" items={brief.nextSteps} />
        </section>
        <ChatPanel briefId={briefId} />
      </div>
    </main>
  );
}

function BriefSection({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="surface rounded-lg p-4 sm:p-5">
      <h2 className="font-bold text-civic-900">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </article>
  );
}

function ChatPanel({ briefId }: { briefId: string }) {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ['brief-chat', briefId], queryFn: () => getChatMessages(briefId) });
  const mutation = useMutation({
    mutationFn: (content: string) => sendChatMessage(briefId, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brief-chat', briefId] }),
  });
  const form = useForm({
    defaultValues: { message: '' },
    onSubmit: ({ value, formApi }) => {
      if (!value.message.trim()) return;
      mutation.mutate(value.message);
      formApi.reset();
    },
  });

  return (
    <aside className="surface flex min-h-[520px] flex-col rounded-lg lg:min-h-[560px]">
      <div className="border-b border-civic-100 p-4">
        <h2 className="flex items-center gap-2 font-bold">
          <MessageSquare size={18} />
          Ask about this brief
        </h2>
      </div>
      <div className="flex-1 space-y-3 overflow-auto p-3 sm:p-4">
        {data.map((message) => (
          <div key={message.id} className={message.role === 'user' ? 'ml-4 rounded-md bg-civic-700 p-3 text-sm leading-6 text-white sm:ml-8' : 'mr-4 rounded-md bg-civic-50 p-3 text-sm leading-6 text-slate-700 sm:mr-8'}>
            {message.content}
          </div>
        ))}
      </div>
      <form
        className="border-t border-civic-100 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="message">
          {(field) => (
            <textarea className="min-h-24 w-full rounded-md border border-civic-100 p-3 text-sm leading-6" placeholder="Ask who is affected, what changed, or what action to take..." value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
          )}
        </form.Field>
        <button className="btn-primary mt-3 w-full" disabled={mutation.isPending} type="submit">
          Send question
        </button>
      </form>
    </aside>
  );
}

function ActionsPage() {
  const { briefId } = actionsRoute.useParams();
  const { data: brief } = useQuery({ queryKey: ['brief', briefId], queryFn: () => getBrief(briefId) });
  const mutation = useMutation({ mutationFn: (input: CivicActionInput) => generateAction(briefId, input) });
  const form = useForm({
    defaultValues: {
      actionType: 'email' as CivicActionType,
      tone: 'Respectful' as CivicActionInput['tone'],
      audience: 'County official',
      extraContext: '',
    },
    onSubmit: ({ value }) => mutation.mutate(value),
  });

  return (
    <main className="page-shell max-w-5xl">
      <Link to="/briefs/$briefId" params={{ briefId }} className="text-sm font-semibold text-civic-700">Back to brief</Link>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Generate civic action</h1>
      <p className="mt-2 text-slate-600">{brief?.title ?? 'Brief'} · choose a format and audience.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form
          className="surface rounded-lg p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <form.Field name="actionType">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Action type</span>
                <select className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2" value={field.state.value} onChange={(event) => field.handleChange(event.target.value as CivicActionType)}>
                  {actionTypes.map((action) => <option key={action.value} value={action.value}>{action.label}</option>)}
                </select>
              </label>
            )}
          </form.Field>
          <form.Field name="tone">
            {(field) => (
              <label className="mt-4 block">
                <span className="text-sm font-semibold">Tone</span>
                <select className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2" value={field.state.value} onChange={(event) => field.handleChange(event.target.value as CivicActionInput['tone'])}>
                  {actionTones.map((tone) => <option key={tone}>{tone}</option>)}
                </select>
              </label>
            )}
          </form.Field>
          <form.Field name="audience">
            {(field) => (
              <label className="mt-4 block">
                <span className="text-sm font-semibold">Audience</span>
                <input className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
              </label>
            )}
          </form.Field>
          <button className="btn-primary mt-5 w-full" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? 'Drafting...' : 'Draft action'}
          </button>
        </form>
        <section className="surface rounded-lg p-4 sm:p-5">
          <h2 className="font-bold">Generated draft</h2>
          <pre className="mt-4 whitespace-pre-wrap rounded-md bg-civic-50 p-4 text-sm leading-7 text-slate-800">
            {mutation.data?.content ?? 'Your civic action draft will appear here.'}
          </pre>
        </section>
      </div>
    </main>
  );
}
