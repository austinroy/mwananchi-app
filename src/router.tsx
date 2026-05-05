import {
  Link,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
} from "@tanstack/react-router";
import { useClerk } from "@clerk/clerk-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Copy,
  Eye,
  EyeOff,
  FileText,
  Home,
  KeyRound,
  Laptop,
  Link2,
  LogIn,
  LogOut,
  MessageSquare,
  Send,
  Sparkles,
  Trash2,
  UserCog,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { AppShell } from "./components/AppShell";
import { FormattedAiText } from "./components/FormattedAiText";
import { actionTones, actionTypes, categories } from "./lib/civicOptions";
import { useAuth } from "./lib/auth";
import {
  aiProviderOptions,
  defaultLmStudioSettings,
  getProviderModels,
  readAiDefaults,
  readLmStudioSettings,
  saveAiDefaults,
  saveLmStudioSettings,
  withLocalProviderSettings,
} from "./lib/aiSettings";
import {
  deleteAiApiKey,
  getApiAiDefaults,
  listAiApiKeyStatuses,
  listProviderModels,
  saveAiApiKey,
  saveApiAiDefaults,
} from "./lib/api";
import {
  clearChatMessages,
  createBrief,
  deleteBrief,
  generateAction,
  getBrief,
  getChatMessages,
  getSharedBrief,
  listBriefs,
  sendChatMessage,
  updateBriefVisibility,
} from "./lib/mockApi";
import { extractPdfText } from "./lib/pdf";
import type {
  AiApiKeyStatus,
  AiModelSelection,
  AiProviderId,
  BriefCategory,
  CivicActionInput,
  CivicActionType,
  CivicBrief,
  NewBriefInput,
} from "./lib/types";

const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LandingPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const newBriefRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/briefs/new",
  component: NewBriefPage,
});

const briefRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/briefs/$briefId",
  component: BriefPage,
});

const actionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/briefs/$briefId/actions",
  component: ActionsPage,
});

const sharedBriefRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/share/$briefId",
  component: SharedBriefPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account",
  component: AccountPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  newBriefRoute,
  briefRoute,
  actionsRoute,
  sharedBriefRoute,
  loginRoute,
  registerRoute,
  accountRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
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

function LandingPage() {
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
          <div className="rounded-md bg-civic-900 p-5 text-white">
            <p className="text-sm text-civic-100">Sample brief</p>
            <h2 className="mt-2 text-2xl font-bold">
              County Budget Public Notice
            </h2>
            <p className="mt-4 text-sm leading-6 text-civic-100">
              Key issues: public participation window, ward allocation, service
              delivery impact, and accountability after approval.
            </p>
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

function LoginPage() {
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

  if (auth.isAuthenticated) {
    return <AuthRedirectingCard />;
  }

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

function RegisterPage() {
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

  if (auth.isAuthenticated) {
    return <AuthRedirectingCard />;
  }

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

function AuthRedirectingCard() {
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

function AccountPage() {
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
        <section className="surface mt-6 rounded-lg p-5 sm:p-6">
          <h2 className="text-xl font-bold text-ink">Default AI model</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Choose the provider and model Mwananchi App should use by default.
            Chat and action drafts can override this per request.
          </p>
          <AiDefaultsForm />
        </section>
        <section className="surface mt-6 rounded-lg p-5 sm:p-6">
          <h2 className="text-xl font-bold text-ink">User API keys</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Store your own provider keys for logged-in AI requests. Keys are
            encrypted by the API server and are never shown again after saving.
          </p>
          <AiApiKeysForm />
        </section>
        <section className="surface mt-6 rounded-lg p-5 sm:p-6">
          <h2 className="text-xl font-bold text-ink">Local models</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Connect LM Studio when you want Mwananchi App to use an open-source
            model running on this machine.
          </p>
          <LmStudioSetup />
        </section>
      </main>
    </RequireAuth>
  );
}

function AiDefaultsForm() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<AiModelSelection>(() =>
    readAiDefaults(),
  );
  const [status, setStatus] = useState<string | null>(null);
  const configured = useConfiguredAiProviders();
  const { data: storedDefaults } = useQuery({
    queryKey: ["ai-defaults", auth.user?.id],
    queryFn: getApiAiDefaults,
    enabled: auth.isAuthenticated,
  });
  const isSelectionAvailable =
    isProviderConfigured(selection.provider, configured) &&
    Boolean(selection.model);

  useEffect(() => {
    if (!storedDefaults) return;
    setSelection(storedDefaults);
    saveAiDefaults(storedDefaults);
  }, [storedDefaults]);

  const saveMutation = useMutation({
    mutationFn: (nextSelection: AiModelSelection) =>
      auth.isAuthenticated
        ? saveApiAiDefaults(nextSelection)
        : Promise.resolve(nextSelection),
    onSuccess: async (nextSelection) => {
      saveAiDefaults(nextSelection);
      setSelection(nextSelection);
      setStatus("Default AI model saved.");
      await queryClient.invalidateQueries({
        queryKey: ["ai-defaults", auth.user?.id],
      });
    },
    onError: (error) =>
      setStatus(
        error instanceof Error ? error.message : "Could not save AI defaults.",
      ),
  });

  const updateSelection = (nextSelection: AiModelSelection) => {
    setSelection(nextSelection);
    setStatus(null);
  };

  return (
    <div className="mt-5">
      <AiModelSelector selection={selection} onChange={updateSelection} />
      <button
        className="btn-primary mt-5 w-full sm:w-auto"
        type="button"
        disabled={!isSelectionAvailable || saveMutation.isPending}
        onClick={() => {
          saveMutation.mutate(resolveConfiguredAiSelection(selection, configured));
        }}
      >
        {saveMutation.isPending ? "Saving..." : "Save AI defaults"}
      </button>
      {!isSelectionAvailable ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Configure this provider before saving it as your default.
        </p>
      ) : null}
      {status ? (
        <p className="mt-3 text-sm font-semibold text-civic-700">{status}</p>
      ) : null}
    </div>
  );
}

function AiApiKeysForm() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["ai-api-key-statuses"],
    queryFn: listAiApiKeyStatuses,
  });
  const [provider, setProvider] = useState<AiProviderId>("openai");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const keyProviderOptions = aiProviderOptions.filter(
    (option) => option.value !== "lmstudio",
  );
  const configuredProviders = new Map(
    data.map((item: AiApiKeyStatus) => [item.provider, item]),
  );
  const selectedStatus = configuredProviders.get(provider);

  const saveMutation = useMutation({
    mutationFn: () => saveAiApiKey(provider, apiKey),
    onSuccess: async () => {
      setApiKey("");
      setStatus("API key saved.");
      await queryClient.invalidateQueries({
        queryKey: ["ai-api-key-statuses"],
      });
    },
    onError: (error) =>
      setStatus(
        error instanceof Error ? error.message : "Could not save API key.",
      ),
  });
  const deleteMutation = useMutation({
    mutationFn: (nextProvider: AiProviderId) => deleteAiApiKey(nextProvider),
    onSuccess: async () => {
      setStatus("API key removed.");
      await queryClient.invalidateQueries({
        queryKey: ["ai-api-key-statuses"],
      });
    },
    onError: (error) =>
      setStatus(
        error instanceof Error ? error.message : "Could not remove API key.",
      ),
  });

  return (
    <div className="mt-5 grid gap-5">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
        <label className="text-sm font-semibold text-slate-700">
          Provider
          <select
            className="mt-2 w-full rounded-md border border-civic-100 bg-white px-3 py-2 text-sm"
            value={provider}
            onChange={(event) => {
              setProvider(event.target.value as AiProviderId);
              setStatus(null);
            }}
          >
            {keyProviderOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700">
          API key
          <div className="mt-2 flex rounded-md border border-civic-100 bg-white focus-within:ring-2 focus-within:ring-civic-100">
            <input
              className="min-w-0 flex-1 rounded-l-md px-3 py-2 text-sm outline-none"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
                setStatus(null);
              }}
              placeholder={
                selectedStatus
                  ? "Enter a new key to replace the stored key"
                  : "Paste provider API key"
              }
            />
            <button
              className="grid w-11 place-items-center text-slate-500"
              type="button"
              onClick={() => setShowKey((value) => !value)}
              aria-label={showKey ? "Hide API key" : "Show API key"}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <button
          className="btn-primary w-full sm:w-auto"
          type="button"
          disabled={!apiKey.trim() || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          <KeyRound size={16} />
          {selectedStatus ? "Replace key" : "Save encrypted key"}
        </button>
        {selectedStatus ? (
          <button
            className="btn-secondary w-full sm:w-auto"
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(provider)}
          >
            <Trash2 size={16} />
            Remove stored key
          </button>
        ) : null}
        <span className="text-sm text-slate-600">
          {isLoading
            ? "Checking stored keys..."
            : selectedStatus
              ? `Configured ${new Date(selectedStatus.updatedAt).toLocaleDateString()}`
              : "No key stored for this provider."}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {keyProviderOptions.map((option) => {
          const item = configuredProviders.get(option.value);
          return (
            <div
              key={option.value}
              className="rounded-md border border-civic-100 bg-civic-50/60 px-3 py-2 text-sm"
            >
              <span className="font-semibold text-ink">{option.label}</span>
              <span className="ml-2 text-slate-600">
                {item ? "Configured" : "Not configured"}
              </span>
            </div>
          );
        })}
      </div>

      {status ? (
        <p className="text-sm font-semibold text-civic-700">{status}</p>
      ) : null}
    </div>
  );
}

function LmStudioSetup() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState(() => readLmStudioSettings());

  const saveSettings = (nextSettings: typeof defaultLmStudioSettings) => {
    saveLmStudioSettings(nextSettings);
    saveAiDefaults({
      provider: "lmstudio",
      model: nextSettings.model,
      baseUrl: nextSettings.baseUrl,
    });
    setSettings(nextSettings);
    setIsOpen(false);
  };

  return (
    <div className="mt-5">
      <div className="rounded-md border border-civic-100 bg-civic-50/70 p-4 text-sm leading-6 text-slate-700">
        <p className="font-semibold text-ink">LM Studio</p>
        <p className="mt-1 break-all">Base URL: {settings.baseUrl}</p>
        <p className="break-all">Model: {settings.model}</p>
        <p>
          {settings.models.length
            ? `${settings.models.length} models loaded from LM Studio`
            : "No LM Studio models loaded yet"}
        </p>
      </div>
      <button
        className="btn-primary mt-4 w-full sm:w-auto"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <Laptop size={16} />
        Set up LM Studio
      </button>
      {isOpen ? (
        <LmStudioModal
          initialSettings={settings}
          onClose={() => setIsOpen(false)}
          onSave={saveSettings}
        />
      ) : null}
    </div>
  );
}

function LmStudioModal({
  initialSettings,
  onClose,
  onSave,
}: {
  initialSettings: typeof defaultLmStudioSettings;
  onClose: () => void;
  onSave: (settings: typeof defaultLmStudioSettings) => void;
}) {
  const [baseUrl, setBaseUrl] = useState(initialSettings.baseUrl);
  const [model, setModel] = useState(initialSettings.model);
  const [models, setModels] = useState<string[]>(initialSettings.models);
  const [status, setStatus] = useState<string | null>(null);
  const modelMutation = useMutation({
    mutationFn: () =>
      listProviderModels(
        "lmstudio",
        baseUrl.trim() || defaultLmStudioSettings.baseUrl,
      ),
    onSuccess: (nextModels) => {
      setModels(nextModels);
      setModel((currentModel) =>
        nextModels.includes(currentModel)
          ? currentModel
          : (nextModels[0] ?? defaultLmStudioSettings.model),
      );
      setStatus(
        nextModels.length
          ? `Loaded ${nextModels.length} model${nextModels.length === 1 ? "" : "s"} from LM Studio.`
          : "LM Studio responded, but no models were returned.",
      );
    },
    onError: (error) =>
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not load LM Studio models.",
      ),
  });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4">
      <section className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-civic-700">
              Local model setup
            </p>
            <h2 className="mt-1 text-2xl font-bold text-ink">
              Connect LM Studio
            </h2>
          </div>
          <button
            className="grid size-9 place-items-center rounded-md border border-civic-100 text-slate-600"
            type="button"
            onClick={onClose}
            aria-label="Close LM Studio setup"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 rounded-md border border-civic-100 bg-civic-50 p-3 text-sm leading-6 text-slate-700">
          Start the LM Studio local server, load a model, then use the
          OpenAI-compatible server URL and model name here.
        </div>
        <label className="mt-5 block text-sm font-semibold text-slate-700">
          Base URL
          <input
            className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
            value={baseUrl}
            onChange={(event) => {
              setBaseUrl(event.target.value);
              setModels([]);
              setStatus(null);
            }}
            placeholder="http://127.0.0.1:1234/v1"
          />
        </label>
        <button
          className="btn-secondary mt-4 w-full sm:w-auto"
          type="button"
          disabled={modelMutation.isPending}
          onClick={() => modelMutation.mutate()}
        >
          {modelMutation.isPending
            ? "Loading models..."
            : "Load models from LM Studio"}
        </button>
        <label className="mt-4 block text-sm font-semibold text-slate-700">
          Model
          <select
            className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500"
            value={models.includes(model) ? model : ""}
            disabled={models.length === 0}
            onChange={(event) => setModel(event.target.value)}
          >
            {models.length === 0 ? (
              <option value="">Load models first</option>
            ) : null}
            {models.map((modelOption) => (
              <option key={modelOption} value={modelOption}>
                {modelOption}
              </option>
            ))}
          </select>
        </label>
        {status ? (
          <p className="mt-3 text-sm leading-6 text-slate-600">{status}</p>
        ) : null}
        <div className="mt-6 grid gap-3 sm:flex sm:justify-end">
          <button
            className="btn-secondary w-full sm:w-auto"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="btn-primary w-full sm:w-auto"
            type="button"
            onClick={() =>
              onSave({
                baseUrl: baseUrl.trim() || defaultLmStudioSettings.baseUrl,
                model: models.includes(model)
                  ? model
                  : (models[0] ?? defaultLmStudioSettings.model),
                models,
              })
            }
            disabled={models.length === 0}
          >
            Save LM Studio setup
          </button>
        </div>
      </section>
    </div>
  );
}

const columnHelper = createColumnHelper<CivicBrief>();

const briefColumns = [
  columnHelper.accessor("title", {
    header: "Title",
    cell: (info) => (
      <Link
        to="/briefs/$briefId"
        params={{ briefId: info.row.original.id }}
        className="font-semibold text-civic-800 hover:underline"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor("category", {
    header: "Category",
  }),
  columnHelper.accessor("jurisdiction", {
    header: "Jurisdiction",
  }),
  columnHelper.accessor("visibility", {
    header: "Visibility",
    cell: (info) => {
      const val = info.getValue() || "private";
      const style =
        val === "private"
          ? "bg-slate-100 text-slate-700"
          : val === "unlisted"
            ? "bg-blue-100 text-blue-800"
            : "bg-civic-100 text-civic-800";
      return (
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
          {val.charAt(0).toUpperCase() + val.slice(1)}
        </span>
      );
    },
  }),
  columnHelper.accessor("createdAt", {
    header: "Created Date",
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
];

function DashboardPage() {
  const auth = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["briefs", auth.user?.id],
    queryFn: () => listBriefs(auth.user?.id),
  });

  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns: briefColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <main className="page-shell">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-civic-700">
            {auth.isAuthenticated ? "Workspace" : "Testing mode"}
          </p>
          <h1 className="text-3xl font-bold text-ink sm:text-4xl">
            Civic briefs
          </h1>
          {!auth.isAuthenticated ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Dashboard access is temporarily open for testing. Sign in later to
              save generated briefs to your workspace.
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
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Track documents, questions, and actions.
            </p>
          </div>
        ))}
      </div>

      <section className="mt-8 surface rounded-lg">
        <div className="flex flex-col gap-4 border-b border-civic-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <h2 className="text-xl font-bold">Recent briefs</h2>
          <input
            type="text"
            placeholder="Search briefs..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-civic-500 focus:ring-1 focus:ring-civic-500"
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="cursor-pointer px-4 py-3 font-medium transition hover:bg-slate-100"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-2">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: " ↑",
                          desc: " ↓",
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={briefColumns.length} className="p-5 text-center text-slate-600">
                    Loading briefs...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={briefColumns.length} className="p-5 text-center text-slate-600">
                    No briefs found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-slate-50">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
  const [aiSelection, setAiSelection] = useState<AiModelSelection>(() =>
    readAiDefaults(),
  );
  const configured = useConfiguredAiProviders();
  const isAiReady =
    isProviderConfigured(aiSelection.provider, configured) &&
    Boolean(aiSelection.model);
  const mutation = useMutation({
    mutationFn: (input: NewBriefInput) =>
      createBrief(
        input,
        auth.user?.id,
        resolveConfiguredAiSelection(aiSelection, configured),
      ),
    onSuccess: async (brief) => {
      await queryClient.invalidateQueries({
        queryKey: ["briefs", auth.user?.id],
      });
      await navigate({ to: "/briefs/$briefId", params: { briefId: brief.id } });
    },
  });

  const form = useForm({
    defaultValues: {
      title: "",
      category: "Budget" as BriefCategory,
      jurisdiction: "Kenya",
      documentText: "",
    },
    onSubmit: ({ value }) => mutation.mutate(value as NewBriefInput),
  });

  return (
    <main className="page-shell max-w-4xl">
      <h1 className="text-3xl font-bold sm:text-4xl">Create a civic brief</h1>
      <p className="mt-2 text-slate-600">
        Paste a policy, bill, public notice, or civic document.
      </p>
      {auth.isAuthenticated ? (
        <div className="mt-5 rounded-lg border border-civic-100 bg-white p-4 text-sm leading-6 text-slate-700">
          Generated briefs are saved to your dashboard.
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-signal/30 bg-white p-4 text-sm leading-6 text-slate-700">
          You can create a brief without signing in. Create an account when you
          want to keep briefs across sessions.
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
                <input
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="jurisdiction">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Jurisdiction</span>
                <input
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="category">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Category</span>
                <select
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) =>
                    field.handleChange(event.target.value as BriefCategory)
                  }
                >
                  {categories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
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

                    setPdfStatus("Extracting text from PDF...");
                    try {
                      const result = await extractPdfText(file, (progress) =>
                        setPdfStatus(progress.message),
                      );
                      field.handleChange(result.text);
                      setPdfStatus(
                        result.method === "ocr"
                          ? `OCR extracted text from ${file.name}. Review it before generating the brief.`
                          : `Extracted text from ${file.name}. Review it before generating the brief.`,
                      );
                    } catch (error) {
                      setPdfStatus(
                        error instanceof Error
                          ? error.message
                          : "Could not extract text from this PDF.",
                      );
                    }
                  }}
                />
              </label>
              {pdfStatus ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {pdfStatus}
                </p>
              ) : null}
              <label className="mt-5 block">
                <span className="text-sm font-semibold">Document text</span>
                <textarea
                  className="mt-2 min-h-56 w-full rounded-md border border-civic-100 px-3 py-2 leading-7 sm:min-h-64"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </label>
            </div>
          )}
        </form.Field>
        <div className="mt-5 rounded-md border border-civic-100 bg-civic-50/50 p-4">
          <p className="mb-3 text-sm font-semibold text-ink">AI provider</p>
          <AiModelSelector selection={aiSelection} onChange={setAiSelection} />
        </div>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {isAiReady
              ? "MVP note: AI responses should still be checked against official sources."
              : "Configure the selected AI provider before generating a brief."}
          </p>
          <button
            className="btn-primary w-full sm:w-auto"
            disabled={mutation.isPending || !isAiReady}
            type="submit"
          >
            <Sparkles size={16} />
            {mutation.isPending ? "Generating..." : "Generate brief"}
          </button>
        </div>
      </form>
    </main>
  );
}

function BriefPage() {
  const { briefId } = briefRoute.useParams();
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [visibilityStatus, setVisibilityStatus] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const { data: brief, isLoading } = useQuery({
    queryKey: ["brief", briefId],
    queryFn: () => getBrief(briefId),
  });
  const visibilityMutation = useMutation({
    mutationFn: (nextVisibility: "private" | "unlisted" | "public") =>
      updateBriefVisibility(briefId, nextVisibility),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["brief", briefId] });
      await queryClient.invalidateQueries({ queryKey: ["briefs", auth.user?.id] });
      if (result.visibility === "unlisted" || result.visibility === "public") {
        const absoluteUrl = new URL(
          `/share/${briefId}`,
          window.location.origin,
        ).toString();
        await navigator.clipboard?.writeText(absoluteUrl);
        setVisibilityStatus(`Link copied! Brief is now ${result.visibility}: ${absoluteUrl}`);
      } else {
        setVisibilityStatus("Brief is now private. Only you can access it.");
      }
    },
    onError: (error) => {
      setVisibilityStatus(error instanceof Error ? error.message : "Could not update visibility.");
    }
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteBrief(briefId, auth.user?.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["briefs", auth.user?.id],
      });
      await queryClient.removeQueries({ queryKey: ["brief", briefId] });
      await navigate({ to: "/dashboard" });
    },
    onError: (error) =>
      setDeleteStatus(
        error instanceof Error ? error.message : "Could not delete this brief.",
      ),
  });

  if (isLoading || !brief)
    return <main className="page-shell">Loading brief...</main>;

  return (
    <main className="page-shell">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-civic-700">
            {brief.category} · {brief.jurisdiction}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">{brief.title}</h1>
        </div>
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <div className="flex bg-slate-100 rounded-md p-1 mr-2">
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded transition ${
                brief.visibility === "private" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
              }`}
              disabled={visibilityMutation.isPending}
              onClick={() => visibilityMutation.mutate("private")}
            >
              <EyeOff size={14} /> Private
            </button>
            <button
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded transition ${
                brief.visibility === "unlisted" ? "bg-white shadow-sm text-civic-700" : "text-slate-500 hover:text-slate-900"
              }`}
              disabled={visibilityMutation.isPending}
              onClick={() => visibilityMutation.mutate("unlisted")}
            >
              <Link2 size={14} /> Unlisted
            </button>
          </div>
          <Link
            to="/briefs/$briefId/actions"
            params={{ briefId }}
            className="btn-primary w-full sm:w-auto"
          >
            <Send size={16} />
            Generate action
          </Link>
          <button
            className="btn-danger w-full sm:w-auto"
            type="button"
            disabled={
              deleteMutation.isPending || brief.id === "brief-sample-budget"
            }
            onClick={() => {
              setDeleteStatus(null);
              if (
                window.confirm(
                  "Delete this brief and its chat/action history? This cannot be undone.",
                )
              ) {
                deleteMutation.mutate();
              }
            }}
          >
            <Trash2 size={16} />
            {deleteMutation.isPending ? "Deleting..." : "Delete brief"}
          </button>
        </div>
      </div>
      {visibilityStatus ? (
        <p className="mb-5 rounded-md border border-civic-100 bg-white p-3 text-sm font-semibold text-civic-800">
          {visibilityStatus}
        </p>
      ) : null}
      {deleteStatus ? (
        <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {deleteStatus}
        </p>
      ) : null}
      <AiErrorNotice message={brief.aiError} className="mb-5" />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-4">
          <BriefSection
            title="Plain-language summary"
            items={[brief.summary]}
          />
          <BriefSection title="Key points" items={brief.keyPoints} />
          <BriefSection title="Who is affected" items={brief.affectedGroups} />
          <BriefSection title="Concerns and risks" items={brief.concerns} />
          <BriefSection
            title="Questions citizens should ask"
            items={brief.citizenQuestions}
          />
          <BriefSection title="Suggested next steps" items={brief.nextSteps} />
        </section>
        <ChatPanel briefId={briefId} />
      </div>
    </main>
  );
}

function SharedBriefPage() {
  const { briefId } = sharedBriefRoute.useParams();
  const { data: brief, isLoading } = useQuery({
    queryKey: ["shared-brief", briefId],
    queryFn: () => getSharedBrief(briefId),
  });

  if (isLoading)
    return <main className="page-shell">Loading shared brief...</main>;
  if (!brief)
    return <main className="page-shell">Shared brief not found.</main>;

  return (
    <main className="page-shell">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-civic-700">
            Shared brief · {brief.category} · {brief.jurisdiction}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">{brief.title}</h1>
        </div>
        <Link to="/briefs/new" className="btn-primary w-full sm:w-auto">
          <FileText size={16} />
          Create your own brief
        </Link>
      </div>
      <section className="space-y-4">
        <BriefSection title="Plain-language summary" items={[brief.summary]} />
        <BriefSection title="Key points" items={brief.keyPoints} />
        <BriefSection title="Who is affected" items={brief.affectedGroups} />
        <BriefSection title="Concerns and risks" items={brief.concerns} />
        <BriefSection
          title="Questions citizens should ask"
          items={brief.citizenQuestions}
        />
        <BriefSection title="Suggested next steps" items={brief.nextSteps} />
      </section>
    </main>
  );
}

function BriefSection({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="surface rounded-lg p-4 sm:p-5">
      <h2 className="font-bold text-civic-900">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

function AiErrorNotice({
  message,
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  const isConfiguredFailure = message.startsWith("Configured ");

  return (
    <div
      className={`rounded-md border ${isConfiguredFailure ? "border-red-200 bg-red-50" : "border-signal/30 bg-white"} p-3 text-sm leading-6 text-slate-700 ${className}`}
    >
      <p className="font-semibold text-civic-900">
        {isConfiguredFailure
          ? "AI provider error detected"
          : "AI provider notice"}
      </p>
      <p className="mt-1">{message}</p>
    </div>
  );
}

function useConfiguredAiProviders() {
  const auth = useAuth();
  const [settingsVersion, setSettingsVersion] = useState(0);
  const { data = [] } = useQuery({
    queryKey: ["ai-api-key-statuses"],
    queryFn: listAiApiKeyStatuses,
    enabled: auth.isAuthenticated,
  });
  const lmStudioSettings = readLmStudioSettings();
  const keyedProviders = new Set(
    data.map((item: AiApiKeyStatus) => item.provider),
  );

  useEffect(() => {
    const refresh = () => setSettingsVersion((version) => version + 1);
    window.addEventListener("mwananchi-lm-studio-settings", refresh);
    return () =>
      window.removeEventListener("mwananchi-lm-studio-settings", refresh);
  }, []);

  return {
    keyedProviders,
    lmStudioSettings,
    settingsVersion,
    isLmStudioConfigured: Boolean(
      lmStudioSettings.baseUrl &&
      lmStudioSettings.model &&
      lmStudioSettings.models.length,
    ),
  };
}

function isProviderConfigured(
  provider: AiProviderId,
  configured: ReturnType<typeof useConfiguredAiProviders>,
) {
  if (provider === "lmstudio") return configured.isLmStudioConfigured;
  return configured.keyedProviders.has(provider);
}

function getConfiguredProviderModels(
  provider: AiProviderId,
  configured: ReturnType<typeof useConfiguredAiProviders>,
) {
  if (!isProviderConfigured(provider, configured)) return [];
  if (provider === "lmstudio") return configured.lmStudioSettings.models;
  return getProviderModels(provider);
}

function resolveConfiguredAiSelection(
  selection: AiModelSelection,
  configured: ReturnType<typeof useConfiguredAiProviders>,
) {
  const models = getConfiguredProviderModels(selection.provider, configured);
  const resolvedSelection = {
    ...selection,
    model: models.includes(selection.model)
      ? selection.model
      : (models[0] ?? selection.model),
  };

  return withLocalProviderSettings(resolvedSelection);
}

function AiModelSelector({
  selection,
  onChange,
  compact = false,
}: {
  selection: AiModelSelection;
  onChange: (selection: AiModelSelection) => void;
  compact?: boolean;
}) {
  const configured = useConfiguredAiProviders();
  const providerOptions = aiProviderOptions.map((provider) => ({
    ...provider,
    isConfigured: isProviderConfigured(provider.value, configured),
  }));
  const isSelectedProviderConfigured = isProviderConfigured(
    selection.provider,
    configured,
  );
  const {
    data: providerModels = [],
    isLoading: isLoadingModels,
    isError: modelLoadFailed,
  } = useQuery<string[]>({
    queryKey: [
      "ai-provider-models",
      selection.provider,
      selection.provider === "lmstudio"
        ? configured.lmStudioSettings.baseUrl
        : "hosted",
      configured.settingsVersion,
    ],
    queryFn: () =>
      listProviderModels(
        selection.provider,
        selection.provider === "lmstudio"
          ? configured.lmStudioSettings.baseUrl
          : undefined,
      ),
    enabled: isSelectedProviderConfigured,
  });
  const models = useMemo(
    () => (isSelectedProviderConfigured ? providerModels : []),
    [isSelectedProviderConfigured, providerModels],
  );

  useEffect(() => {
    if (!models.length) return;
    if (models.includes(selection.model)) return;
    onChange({ ...selection, model: models[0] });
  }, [models, onChange, selection]);

  return (
    <div
      className={
        compact ? "grid gap-2 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"
      }
    >
      <label className="block">
        <span className="text-sm font-semibold">Provider</span>
        <select
          className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
          value={selection.provider}
          onChange={(event) => {
            const provider = event.target.value as AiModelSelection["provider"];
            onChange({ provider, model: "" });
          }}
        >
          {providerOptions.map((provider) => (
            <option
              key={provider.value}
              value={provider.value}
              disabled={!provider.isConfigured}
            >
              {provider.label}
              {provider.isConfigured ? "" : " (not configured)"}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Model</span>
        <select
          className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2 disabled:bg-slate-100 disabled:text-slate-500"
          value={
            models.includes(selection.model)
              ? selection.model
              : (models[0] ?? "")
          }
          disabled={!isSelectedProviderConfigured || models.length === 0}
          onChange={(event) =>
            onChange({ ...selection, model: event.target.value })
          }
        >
          {!isSelectedProviderConfigured ? (
            <option value="">Configure provider first</option>
          ) : null}
          {isSelectedProviderConfigured && isLoadingModels ? (
            <option value="">Loading models...</option>
          ) : null}
          {isSelectedProviderConfigured && modelLoadFailed ? (
            <option value="">Could not load models</option>
          ) : null}
          {isSelectedProviderConfigured && models.length === 0 ? (
            <option value="">No models available</option>
          ) : null}
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        {!isSelectedProviderConfigured ? (
          <p className="mt-2 text-xs leading-5 text-slate-600">
            This provider is disabled until it is configured in Account.
          </p>
        ) : null}
        {modelLoadFailed ? (
          <p className="mt-2 text-xs leading-5 text-slate-600">
            Could not load models from this provider. Check the provider setup
            and try again.
          </p>
        ) : null}
      </label>
    </div>
  );
}

function ChatPanel({ briefId }: { briefId: string }) {
  const queryClient = useQueryClient();
  const [aiSelection, setAiSelection] = useState<AiModelSelection>(() =>
    readAiDefaults(),
  );
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);
  const configured = useConfiguredAiProviders();
  const isAiReady =
    isProviderConfigured(aiSelection.provider, configured) &&
    Boolean(aiSelection.model);
  const { data = [] } = useQuery({
    queryKey: ["brief-chat", briefId],
    queryFn: () => getChatMessages(briefId),
  });
  const mutation = useMutation({
    mutationFn: (content: string) =>
      sendChatMessage(
        briefId,
        content,
        resolveConfiguredAiSelection(aiSelection, configured),
      ),
    onMutate: (content) => setPendingMessage(content),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["brief-chat", briefId] }),
    onSettled: () => setPendingMessage(null),
  });
  const clearMutation = useMutation({
    mutationFn: () => clearChatMessages(briefId),
    onSuccess: async () => {
      setClearError(null);
      queryClient.setQueryData(["brief-chat", briefId], []);
      await queryClient.invalidateQueries({ queryKey: ["brief-chat", briefId] });
    },
    onError: (error) =>
      setClearError(
        error instanceof Error ? error.message : "Could not clear chat history.",
      ),
  });
  const form = useForm({
    defaultValues: { message: "" },
    onSubmit: ({ value, formApi }) => {
      if (!value.message.trim()) return;
      mutation.mutate(value.message);
      formApi.reset();
    },
  });

  return (
    <aside className="surface flex min-h-[520px] flex-col rounded-lg lg:min-h-[560px]">
      <div className="border-b border-civic-100 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-bold">
            <MessageSquare size={18} />
            Ask about this brief
          </h2>
          <button
            className="btn-secondary min-h-9 px-3 py-1.5 text-xs"
            type="button"
            disabled={!data.length || clearMutation.isPending}
            onClick={() => {
              setClearError(null);
              if (window.confirm("Clear this chat history?")) {
                clearMutation.mutate();
              }
            }}
          >
            {clearMutation.isPending ? "Clearing..." : "Clear chat"}
          </button>
        </div>
        <div className="mt-3">
          <AiModelSelector
            selection={aiSelection}
            onChange={setAiSelection}
            compact
          />
        </div>
        {clearError ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs font-semibold text-red-700">
            {clearError}
          </p>
        ) : null}
      </div>
      <div className="flex-1 space-y-3 overflow-auto p-3 sm:p-4">
        {data.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-4 rounded-md bg-civic-700 p-3 text-sm leading-6 text-white sm:ml-8"
                : "mr-4 rounded-md bg-civic-50 p-3 text-sm leading-6 text-slate-700 sm:mr-8"
            }
          >
            {message.role === "assistant" ? (
              <FormattedAiText content={message.content} />
            ) : (
              <p>{message.content}</p>
            )}
            {message.aiError ? (
              <div
                className={`mt-3 rounded-md border p-2 text-xs leading-5 text-slate-700 ${message.aiError.startsWith("Configured ") ? "border-red-200 bg-red-50" : "border-signal/30 bg-white/80"}`}
              >
                <span className="font-semibold">
                  {message.aiError.startsWith("Configured ")
                    ? "AI provider error detected: "
                    : "AI provider notice: "}
                </span>
                {message.aiError}
              </div>
            ) : null}
          </div>
        ))}
        {pendingMessage ? (
          <>
            <div className="ml-4 rounded-md bg-civic-700 p-3 text-sm leading-6 text-white sm:ml-8">
              <p>{pendingMessage}</p>
            </div>
            <div className="mr-4 inline-flex rounded-md bg-civic-50 p-3 text-sm leading-6 text-slate-700 sm:mr-8">
              <span
                className="typing-dots"
                aria-label="Assistant is processing"
              >
                <span />
                <span />
                <span />
              </span>
            </div>
          </>
        ) : null}
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
            <textarea
              className="min-h-24 w-full rounded-md border border-civic-100 p-3 text-sm leading-6"
              placeholder="Ask who is affected, what changed, or what action to take..."
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          )}
        </form.Field>
        {!isAiReady ? (
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Configure the selected provider before sending a question.
          </p>
        ) : null}
        <button
          className="btn-primary mt-3 w-full"
          disabled={mutation.isPending || !isAiReady}
          type="submit"
        >
          Send question
        </button>
      </form>
    </aside>
  );
}

function ActionsPage() {
  const { briefId } = actionsRoute.useParams();
  const { data: brief } = useQuery({
    queryKey: ["brief", briefId],
    queryFn: () => getBrief(briefId),
  });
  const mutation = useMutation({
    mutationFn: (input: CivicActionInput) => generateAction(briefId, input),
  });
  const [aiSelection, setAiSelection] = useState<AiModelSelection>(() =>
    readAiDefaults(),
  );
  const configured = useConfiguredAiProviders();
  const isAiReady =
    isProviderConfigured(aiSelection.provider, configured) &&
    Boolean(aiSelection.model);
  const form = useForm({
    defaultValues: {
      actionType: "email" as CivicActionType,
      tone: "Respectful" as CivicActionInput["tone"],
      audience: "County official",
      extraContext: "",
    },
    onSubmit: ({ value }) =>
      mutation.mutate({
        ...value,
        ai: resolveConfiguredAiSelection(aiSelection, configured),
      }),
  });

  return (
    <main className="page-shell max-w-5xl">
      <Link
        to="/briefs/$briefId"
        params={{ briefId }}
        className="text-sm font-semibold text-civic-700"
      >
        Back to brief
      </Link>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
        Generate civic action
      </h1>
      <p className="mt-2 text-slate-600">
        {brief?.title ?? "Brief"} · choose a format and audience.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form
          className="surface rounded-lg p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <AiModelSelector selection={aiSelection} onChange={setAiSelection} />
          <form.Field name="actionType">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">Action type</span>
                <select
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) =>
                    field.handleChange(event.target.value as CivicActionType)
                  }
                >
                  {actionTypes.map((action) => (
                    <option key={action.value} value={action.value}>
                      {action.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </form.Field>
          <form.Field name="tone">
            {(field) => (
              <label className="mt-4 block">
                <span className="text-sm font-semibold">Tone</span>
                <select
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) =>
                    field.handleChange(
                      event.target.value as CivicActionInput["tone"],
                    )
                  }
                >
                  {actionTones.map((tone) => (
                    <option key={tone}>{tone}</option>
                  ))}
                </select>
              </label>
            )}
          </form.Field>
          <form.Field name="audience">
            {(field) => (
              <label className="mt-4 block">
                <span className="text-sm font-semibold">Audience</span>
                <input
                  className="mt-2 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </label>
            )}
          </form.Field>
          {!isAiReady ? (
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Configure the selected provider before drafting an action.
            </p>
          ) : null}
          <button
            className="btn-primary mt-5 w-full"
            disabled={mutation.isPending || !isAiReady}
            type="submit"
          >
            {mutation.isPending ? "Drafting..." : "Draft action"}
          </button>
        </form>
        <section className="surface rounded-lg p-4 sm:p-5">
          <h2 className="font-bold">Generated draft</h2>
          <AiErrorNotice message={mutation.data?.aiError} className="mt-4" />
          <div className="mt-4 rounded-md bg-civic-50 p-4 text-sm leading-7 text-slate-800">
            {mutation.data?.content ? (
              <FormattedAiText content={mutation.data.content} />
            ) : (
              "Your civic action draft will appear here."
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
