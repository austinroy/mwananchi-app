import { Link, Outlet, createRootRoute, createRoute, createRouter, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import { FileText, Home, LayoutDashboard, LogIn, LogOut, MessageSquare, Send, Sparkles, UserPlus } from 'lucide-react';
import type React from 'react';
import { useAuth } from './lib/auth';
import { createBrief, generateAction, getBrief, getChatMessages, listBriefs, sendChatMessage } from './lib/mockApi';
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
  component: () => <RequireAuth><DashboardPage /></RequireAuth>,
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

const routeTree = rootRoute.addChildren([indexRoute, dashboardRoute, newBriefRoute, briefRoute, actionsRoute, loginRoute, registerRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

function AppShell() {
  const auth = useAuth();

  return (
    <div className="min-h-screen bg-civic-50">
      <header className="border-b border-civic-100 bg-white">
        <nav className="page-shell flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-civic-900">
            <span className="grid size-9 place-items-center rounded-md bg-civic-700 text-white">
              <Sparkles size={18} />
            </span>
            Mwananchi App
          </Link>
          <div className="flex items-center gap-2">
            {auth.isAuthenticated ? (
              <>
                <NavLink to="/dashboard" icon={<LayoutDashboard size={16} />} label="Dashboard" />
                <Link to="/briefs/new" className="btn-primary">
                  <FileText size={16} />
                  New brief
                </Link>
                <button className="btn-secondary" type="button" onClick={auth.logout}>
                  <LogOut size={16} />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-secondary">
                  <LogIn size={16} />
                  Sign in
                </Link>
                <Link to="/register" className="btn-primary">
                  <UserPlus size={16} />
                  Create account
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}

function NavLink({ to, icon, label }: { to: '/dashboard'; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="btn-secondary">
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
      <section className="surface w-full max-w-xl rounded-lg p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-md bg-civic-700 text-white">
          <LogIn size={22} />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-ink">Sign in to continue</h1>
        <p className="mt-3 text-slate-600">
          Mwananchi App saves briefs, chat history, and generated actions to your workspace.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/login" className="btn-primary">
            Sign in
          </Link>
          <Link to="/register" className="btn-secondary">
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
      <section className="grid min-h-[72vh] items-center gap-10 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-civic-700">Civic intelligence for citizens</p>
          <h1 className="max-w-3xl text-5xl font-bold leading-tight text-ink sm:text-6xl">
            Turn public documents into public understanding.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
            Mwananchi App helps citizens, journalists, students, and community groups explain policies,
            ask sharper questions, and draft practical civic actions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/briefs/new" className="btn-primary">
              <FileText size={18} />
              Create a civic brief
            </Link>
            <Link to={auth.isAuthenticated ? '/dashboard' : '/login'} className="btn-secondary">
              <Home size={18} />
              {auth.isAuthenticated ? 'View dashboard' : 'Sign in'}
            </Link>
          </div>
        </div>
        <div className="surface rounded-lg p-6">
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
  const navigate = useNavigate();
  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      await auth.login(value);
      await navigate({ to: '/dashboard' });
    },
  });

  if (auth.isAuthenticated) {
    return <SignedInRedirectCard />;
  }

  return (
    <AuthFormShell
      eyebrow="Welcome back"
      title="Sign in to Mwananchi App"
      description="Use any email and password while local prototype auth is active."
      footer={<span>New here? <Link to="/register" className="font-semibold text-civic-700">Create an account</Link></span>}
    >
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
              <input className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2" type="password" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} required />
            </label>
          )}
        </form.Field>
        <button className="btn-primary w-full" type="submit">
          <LogIn size={16} />
          Sign in
        </button>
      </form>
    </AuthFormShell>
  );
}

function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      await auth.register(value);
      await navigate({ to: '/dashboard' });
    },
  });

  if (auth.isAuthenticated) {
    return <SignedInRedirectCard />;
  }

  return (
    <AuthFormShell
      eyebrow="Create workspace"
      title="Create your Mwananchi account"
      description="Prototype auth stores your session locally. A real provider can replace this layer later."
      footer={<span>Already have an account? <Link to="/login" className="font-semibold text-civic-700">Sign in</Link></span>}
    >
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
              <input className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2" type="password" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} required minLength={8} />
            </label>
          )}
        </form.Field>
        <button className="btn-primary w-full" type="submit">
          <UserPlus size={16} />
          Create account
        </button>
      </form>
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
      <section className="surface w-full max-w-md rounded-lg p-6">
        <p className="text-sm font-semibold text-civic-700">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-ink">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6">{children}</div>
        <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
      </section>
    </main>
  );
}

function SignedInRedirectCard() {
  return (
    <main className="page-shell grid min-h-[72vh] place-items-center">
      <section className="surface w-full max-w-md rounded-lg p-6 text-center">
        <h1 className="text-2xl font-bold text-ink">You are already signed in</h1>
        <Link to="/dashboard" className="btn-primary mt-5">
          Go to dashboard
        </Link>
      </section>
    </main>
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
          <p className="text-sm font-semibold text-civic-700">Workspace</p>
          <h1 className="text-3xl font-bold text-ink">Civic briefs</h1>
        </div>
        <Link to="/briefs/new" className="btn-primary">
          <FileText size={16} />
          Start new brief
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {categories.slice(0, 6).map((category) => (
          <div key={category} className="surface rounded-lg p-5">
            <p className="font-semibold text-civic-900">{category}</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">Track documents, questions, and actions.</p>
          </div>
        ))}
      </div>

      <section className="mt-8 surface rounded-lg">
        <div className="border-b border-civic-100 p-5">
          <h2 className="text-xl font-bold">Recent briefs</h2>
        </div>
        <div className="divide-y divide-civic-100">
          {isLoading ? (
            <p className="p-5 text-slate-600">Loading briefs...</p>
          ) : (
            data.map((brief) => (
              <Link key={brief.id} to="/briefs/$briefId" params={{ briefId: brief.id }} className="block p-5 transition hover:bg-civic-50">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
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
      <h1 className="text-3xl font-bold">Create a civic brief</h1>
      <p className="mt-2 text-slate-600">Paste a policy, bill, public notice, or civic document.</p>
      {auth.isAuthenticated ? (
        <div className="mt-5 rounded-lg border border-civic-100 bg-white p-4 text-sm leading-6 text-slate-700">
          Generated briefs are saved to your dashboard while prototype local storage is active.
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-signal/30 bg-white p-4 text-sm leading-6 text-slate-700">
          You can create a brief without signing in. Create an account when you want to keep briefs across sessions.
        </div>
      )}
      <form
        className="mt-6 surface rounded-lg p-6"
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
            <label className="mt-5 block">
              <span className="text-sm font-semibold">Document text</span>
              <textarea className="mt-2 min-h-64 w-full rounded-md border border-civic-100 px-3 py-2 leading-7" value={field.state.value} onChange={(event) => field.handleChange(event.target.value)} />
            </label>
          )}
        </form.Field>
        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-600">MVP note: mock analysis is active until the AI backend is connected.</p>
          <button className="btn-primary" disabled={mutation.isPending} type="submit">
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
        <div>
          <p className="text-sm font-semibold text-civic-700">{brief.category} · {brief.jurisdiction}</p>
          <h1 className="text-3xl font-bold">{brief.title}</h1>
        </div>
        <Link to="/briefs/$briefId/actions" params={{ briefId }} className="btn-primary">
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
    <article className="surface rounded-lg p-5">
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
    <aside className="surface flex min-h-[560px] flex-col rounded-lg">
      <div className="border-b border-civic-100 p-4">
        <h2 className="flex items-center gap-2 font-bold">
          <MessageSquare size={18} />
          Ask about this brief
        </h2>
      </div>
      <div className="flex-1 space-y-3 overflow-auto p-4">
        {data.map((message) => (
          <div key={message.id} className={message.role === 'user' ? 'ml-8 rounded-md bg-civic-700 p-3 text-sm leading-6 text-white' : 'mr-8 rounded-md bg-civic-50 p-3 text-sm leading-6 text-slate-700'}>
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
      <h1 className="mt-3 text-3xl font-bold">Generate civic action</h1>
      <p className="mt-2 text-slate-600">{brief?.title ?? 'Brief'} · choose a format and audience.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form
          className="surface rounded-lg p-5"
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
        <section className="surface rounded-lg p-5">
          <h2 className="font-bold">Generated draft</h2>
          <pre className="mt-4 whitespace-pre-wrap rounded-md bg-civic-50 p-4 text-sm leading-7 text-slate-800">
            {mutation.data?.content ?? 'Your civic action draft will appear here.'}
          </pre>
        </section>
      </div>
    </main>
  );
}
