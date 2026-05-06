import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { MessageSquare, Share, Link2, Globe, EyeOff, Sparkles, Trash2, FileText } from "lucide-react";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { FormattedAiText } from "../FormattedAiText";
import { AiModelSelector, isProviderConfigured, resolveConfiguredAiSelection, useConfiguredAiProviders } from "../ai/AiModelSelector";
import { useAuth } from "../../lib/auth";
import { clearChatMessages, deleteBrief, generateAction, getBrief, getChatMessages, getSharedBrief, sendChatMessage, updateBriefVisibility } from "../../lib/mockApi";
import { readAiDefaults } from "../../lib/aiSettings";
import type { AiModelSelection, CivicActionInput } from "../../lib/types";
import { toast } from "sonner";

export function BriefPage({ briefId }: { briefId: string }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
      await queryClient.invalidateQueries({
        queryKey: ["briefs", auth.user?.id],
      });
      if (result.visibility === "unlisted" || result.visibility === "public") {
        const absoluteUrl = new URL(
          `/share/${briefId}`,
          window.location.origin,
        ).toString();
        await navigator.clipboard?.writeText(absoluteUrl);
        toast.success(`Link copied! Brief is now ${result.visibility}`);
      } else {
        toast.success("Brief is now private.");
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not update visibility.",
      );
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteBrief(briefId, auth.user?.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["briefs", auth.user?.id],
      });
      await queryClient.removeQueries({ queryKey: ["brief", briefId] });
      await navigate({ to: "/dashboard" });
      toast.success("Brief deleted successfully.");
    },
    onError: (error) =>
      setDeleteStatus(
        error instanceof Error ? error.message : "Could not delete this brief.",
      ),
  });

  if (isLoading || !brief) {
    return <main className="page-shell">Loading brief...</main>;
  }

  return (
    <main className="page-shell">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-civic-700">
            {brief.category} · {brief.jurisdiction}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">{brief.title}</h1>
        </div>
        <div className="grid items-center gap-2 sm:flex sm:flex-wrap">
          <details className="dropdown relative inline-block">
            <summary className="btn-secondary flex cursor-pointer list-none items-center gap-2 outline-none">
              <Share size={16} />
              Share & Actions
            </summary>
            <div className="absolute right-0 z-50 mt-1 min-w-[160px] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
              <button
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                disabled={brief.visibility === "private"}
                onClick={async (e) => {
                  const target = e.currentTarget.closest("details");
                  if (target) target.removeAttribute("open");
                  const absoluteUrl = new URL(
                    `/share/${brief.id}`,
                    window.location.origin,
                  ).toString();
                  await navigator.clipboard?.writeText(absoluteUrl);
                  toast.success("Link copied!");
                }}
              >
                <Link2 size={14} />
                Copy link
              </button>
              <div className="my-1 border-t border-slate-100" />
              {brief.visibility === "private" ? (
                <button
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-civic-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={visibilityMutation.isPending}
                  onClick={() => {
                    visibilityMutation.mutate("public");
                    const target = document.activeElement?.closest("details");
                    if (target) target.removeAttribute("open");
                  }}
                >
                  <Globe size={14} />
                  Make Public
                </button>
              ) : (
                <button
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  disabled={visibilityMutation.isPending}
                  onClick={() => {
                    visibilityMutation.mutate("private");
                    const target = document.activeElement?.closest("details");
                    if (target) target.removeAttribute("open");
                  }}
                >
                  <EyeOff size={14} />
                  Make Private
                </button>
              )}
            </div>
          </details>
          <Link
            to="/briefs/$briefId/actions"
            params={{ briefId }}
            className="btn-primary"
          >
            <Sparkles size={16} />
            Generate actions
          </Link>
          <button
            className="btn-danger w-full sm:w-auto"
            type="button"
            disabled={deleteMutation.isPending || brief.id === "brief-sample-budget"}
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
      {deleteStatus ? (
        <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {deleteStatus}
        </p>
      ) : null}
      <AiErrorNotice message={brief.aiError} className="mb-5" />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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
        <ChatPanel briefId={briefId} />
      </div>
    </main>
  );
}

export function SharedBriefPage({ briefId }: { briefId: string }) {
  const { data: brief, isLoading } = useQuery({
    queryKey: ["shared-brief", briefId],
    queryFn: () => getSharedBrief(briefId),
  });

  if (isLoading) return <main className="page-shell">Loading shared brief...</main>;
  if (!brief) return <main className="page-shell">Shared brief not found.</main>;

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

export function ActionsPage({ briefId }: { briefId: string }) {
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
      actionType: "email" as CivicActionInput["actionType"],
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
      <Link to="/briefs/$briefId" params={{ briefId }} className="text-sm font-semibold text-civic-700">
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
                    field.handleChange(event.target.value as CivicActionInput["actionType"])
                  }
                >
                  {["email", "petition", "public_comment", "whatsapp_summary", "talking_points"].map((action) => (
                    <option key={action} value={action}>
                      {action}
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
                    field.handleChange(event.target.value as CivicActionInput["tone"])
                  }
                >
                  {["Respectful", "Firm", "Youth-friendly", "Professional"].map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
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
          <form.Field name="extraContext">
            {(field) => (
              <label className="mt-4 block">
                <span className="text-sm font-semibold">Extra context</span>
                <textarea
                  className="mt-2 min-h-28 w-full rounded-md border border-civic-100 px-3 py-2"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </label>
            )}
          </form.Field>
          <button
            className="btn-primary mt-5 w-full"
            disabled={mutation.isPending || !isAiReady}
            type="submit"
          >
            {mutation.isPending ? "Drafting..." : "Draft action"}
          </button>
        </form>
        <section className="surface rounded-lg p-4 sm:p-5">
          <h2 className="text-xl font-bold text-ink">Draft preview</h2>
          {mutation.data ? (
            <div className="mt-3 text-sm leading-6 text-slate-700">
              <p>{mutation.data.content}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your civic action draft will appear here.
            </p>
          )}
        </section>
      </div>
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
        {isConfiguredFailure ? "AI provider error detected" : "AI provider notice"}
      </p>
      <p className="mt-1">{message}</p>
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
          </div>
        ))}
        {pendingMessage ? (
          <>
            <div className="ml-4 rounded-md bg-civic-700 p-3 text-sm leading-6 text-white sm:ml-8">
              <p>{pendingMessage}</p>
            </div>
            <div className="mr-4 inline-flex rounded-md bg-civic-50 p-3 text-sm leading-6 text-slate-700 sm:mr-8">
              <span className="typing-dots" aria-label="Assistant is processing">
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
