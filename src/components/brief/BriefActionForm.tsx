import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FormattedAiText } from "../FormattedAiText";
import {
  deleteAction,
  generateAction,
  getBrief,
  listActions,
} from "../../lib/mockApi";
import { readAiDefaults } from "../../lib/aiSettings";
import { actionTypes, actionTones } from "../../lib/civicOptions";
import type { CivicAction, CivicActionInput } from "../../lib/types";
import { useI18n } from "../../lib/i18n";
import { BriefTabs } from "./BriefTabs";
import { BriefChatPanel } from "./BriefChatPanel";


type CivicActionFormValues = {
  actionType: CivicActionInput["actionType"] | "";
  tone: CivicActionInput["tone"] | "";
  audience: string;
  extraContext: string;
};

export function BriefActionPage({ briefId }: { briefId: string }) {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const { data: brief } = useQuery({
    queryKey: ["brief", briefId],
    queryFn: () => getBrief(briefId),
  });
  const { data: actions = [] } = useQuery({
    queryKey: ["brief-actions", briefId],
    queryFn: () => listActions(briefId),
  });
  const mutation = useMutation({
    mutationFn: (input: CivicActionInput) => generateAction(briefId, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["brief-actions", briefId] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (actionId: string) => deleteAction(briefId, actionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["brief-actions", briefId],
      });
      toast.success(t("action.deleted"));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("action.deleteError"),
      );
    },
  });
  const aiDefaults = readAiDefaults();
  const form = useForm({
    defaultValues: {
      actionType: "",
      tone: "",
      audience: "",
      extraContext: "",
    } as CivicActionFormValues,
    onSubmit: ({ value }) => {
      if (!value.actionType || !value.tone || !value.audience.trim()) {
        toast.error("Choose an action type, tone, and audience first.");
        return;
      }

      mutation.mutate({
        actionType: value.actionType,
        tone: value.tone,
        audience: value.audience,
        extraContext: value.extraContext,
        ai: { ...aiDefaults, language: locale },
      });
    },
  });

  return (
    <main className="page-shell max-w-5xl pb-6 lg:pb-[32rem]">
      <div className="mb-5 min-w-0">
        <p className="text-sm font-semibold text-civic-700">
          {brief
            ? `${brief.category} · ${brief.jurisdiction}`
            : t("action.briefFallback")}
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">
          {brief?.title ?? t("action.briefFallback")}
        </h1>
      </div>
      <div className="mt-5">
        <BriefTabs briefId={briefId} activeTab="actions" />
      </div>
      <h2 className="text-2xl font-bold text-ink">{t("action.title")}</h2>
      <p className="mt-2 text-slate-600">
        {t("action.subtitle", {
          title: brief?.title ?? t("action.briefFallback"),
        })}
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <form
          className="surface rounded-lg p-4 sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="rounded-md border border-white/45 bg-white/45 p-4 text-sm leading-6 text-slate-700 backdrop-blur-xl">
            <p className="font-semibold text-ink">{t("action.aiModel")}</p>
            <p className="mt-1">
              {aiDefaults.provider && aiDefaults.model
                ? `${aiDefaults.provider} · ${aiDefaults.model}`
                : t("action.aiNotReady")}
            </p>
          </div>
          <form.Field name="actionType">
            {(field) => (
              <label className="block">
                <span className="text-sm font-semibold">
                  {t("action.type")}
                </span>
                <select
                  className="mt-2 w-full rounded-md border border-white/50 bg-white/55 px-3 py-2 outline-none backdrop-blur-xl focus:border-civic-500 focus:ring-2 focus:ring-civic-100"
                  value={field.state.value}
                  onChange={(event) =>
                    field.handleChange(
                      event.target.value as CivicActionInput["actionType"] | "",
                    )
                  }
                >
                  <option value="" disabled>
                    Select an action type
                  </option>
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
                <span className="text-sm font-semibold">
                  {t("action.tone")}
                </span>
                <select
                  className="mt-2 w-full rounded-md border border-white/50 bg-white/55 px-3 py-2 outline-none backdrop-blur-xl focus:border-civic-500 focus:ring-2 focus:ring-civic-100"
                  value={field.state.value}
                  onChange={(event) =>
                    field.handleChange(
                      event.target.value as CivicActionInput["tone"] | "",
                    )
                  }
                >
                  <option value="" disabled>
                    Select a tone
                  </option>
                  {actionTones.map((tone) => (
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
                <span className="text-sm font-semibold">
                  {t("action.audience")}
                </span>
                <input
                  className="mt-2 w-full rounded-md border border-white/50 bg-white/55 px-3 py-2 outline-none backdrop-blur-xl focus:border-civic-500 focus:ring-2 focus:ring-civic-100"
                  placeholder="e.g. County executive, MCA, school board"
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </label>
            )}
          </form.Field>
          <form.Field name="extraContext">
            {(field) => (
              <label className="mt-4 block">
                <span className="text-sm font-semibold">
                  {t("action.extraContext")}
                </span>
                <textarea
                  className="mt-2 min-h-28 w-full rounded-md border border-white/50 bg-white/55 px-3 py-2 outline-none backdrop-blur-xl focus:border-civic-500 focus:ring-2 focus:ring-civic-100"
                  placeholder="Add any deadline, audience detail, or point you want emphasized."
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                />
              </label>
            )}
          </form.Field>
          <button
            className="btn-primary mt-5 w-full"
            disabled={mutation.isPending}
            type="submit"
          >
            <Sparkles size={16} />
            {mutation.isPending ? t("action.drafting") : t("action.draft")}
          </button>
        </form>
        <section className="surface rounded-lg p-4 sm:p-5">
          <h2 className="text-xl font-bold text-ink">{t("action.preview")}</h2>
          {mutation.data ? (
            <div className="mt-3 text-sm leading-6 text-slate-700">
              <FormattedAiText content={mutation.data.content} />
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {t("action.empty")}
            </p>
          )}
          {actions.length ? (
            <div className="mt-6 border-t border-civic-100 pt-4">
              <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-civic-700">
                {t("action.generated")}
              </h3>
              <div className="mt-3 space-y-3">
                {actions.map((action) => (
                  <article
                    key={action.id}
                    className="rounded-md border border-white/45 bg-white/50 p-3 backdrop-blur-xl"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-civic-700">
                        {formatActionType(action.actionType)} · {action.tone}
                      </p>
                      <div className="grid gap-2 sm:flex sm:flex-wrap sm:justify-end">
                        <button
                          className="btn-secondary min-h-9 w-full px-3 py-1.5 text-xs sm:w-auto"
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard?.writeText(
                              formatActionForCopy(action),
                            );
                            toast.success(t("action.copied"));
                          }}
                        >
                          <Copy size={14} />
                          {t("action.copyDraft")}
                        </button>
                        <button
                          className="btn-danger min-h-9 w-full px-3 py-1.5 text-xs sm:w-auto"
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (window.confirm(t("action.deleteConfirm"))) {
                              deleteMutation.mutate(action.id);
                            }
                          }}
                        >
                          <Trash2 size={14} />
                          {deleteMutation.isPending
                            ? t("action.deletingDraft")
                            : t("action.deleteDraft")}
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-sm leading-6 text-slate-700">
                      <FormattedAiText content={action.content} />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
      <BriefChatPanel briefId={briefId} />
    </main>
  );
}

function formatActionForCopy(action: CivicAction) {
  return `${formatActionType(action.actionType)}
Tone: ${action.tone}
Audience: ${action.audience}

${action.content}`;
}

function formatActionType(actionType: CivicActionInput["actionType"]) {
  return actionType
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
