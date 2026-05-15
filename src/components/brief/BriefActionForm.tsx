import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { FormattedAiText } from "../FormattedAiText";
import { generateAction, getBrief, listActions } from "../../lib/mockApi";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../../lib/auth";
import { deleteBrief, updateBriefVisibility } from "../../lib/mockApi";
import { readAiDefaults } from "../../lib/aiSettings";
import { actionTypes, actionTones } from "../../lib/civicOptions";
import type { CivicAction, CivicActionInput } from "../../lib/types";
import { useI18n } from "../../lib/i18n";
import { BriefTabs } from "./BriefTabs";
import { BriefChatPanel } from "./BriefChatPanel";
import { Spinner } from "../ui/Spinner";
import { BriefHeaderActions } from "./BriefHeaderActions";
import { BriefErrorNotice } from "./BriefSections";

type CivicActionFormValues = {
  actionType: CivicActionInput["actionType"] | "";
  tone: CivicActionInput["tone"] | "";
  audience: string;
  extraContext: string;
};

export function BriefActionPage({ briefId }: { briefId: string }) {
  const { locale, t } = useI18n();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const navigate = useNavigate();
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
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
    onSuccess: async (savedAction) => {
      queryClient.setQueryData<CivicAction[]>(
        ["brief-actions", briefId],
        (current = []) => [
          savedAction,
          ...current.filter((action) => action.id !== savedAction.id),
        ],
      );
      await queryClient.invalidateQueries({
        queryKey: ["brief-actions", briefId],
      });
      toast.success(t("action.saved"));
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("action.saveError"),
      );
    },
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
        toast.success(t("brief.privateToast"));
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("brief.updateVisibilityError"),
      );
    },
  });
  const deleteBriefMutation = useMutation({
    mutationFn: () => deleteBrief(briefId, auth.user?.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["briefs", auth.user?.id],
      });
      await queryClient.removeQueries({ queryKey: ["brief", briefId] });
      await navigate({ to: "/dashboard" });
      toast.success(t("brief.deleted"));
    },
    onError: (error) =>
      setDeleteStatus(
        error instanceof Error ? error.message : t("brief.deleteError"),
      ),
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
        toast.error(t("action.requiredFields"));
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
    <main className="page-shell pb-6 lg:pb-[32rem]">
      <div className="mb-6 min-w-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-civic-700">
            {brief
              ? `${brief.category} · ${brief.jurisdiction}`
              : t("action.briefFallback")}
          </p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
            <h1 className="text-3xl font-bold sm:text-4xl">
              {brief?.title ?? t("action.briefFallback")}
            </h1>
          </div>
        </div>
      </div>
      {deleteStatus ? (
        <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {deleteStatus}
        </p>
      ) : null}
      <BriefTabs briefId={briefId} activeTab="actions" />
      <div className="mb-5">
        <BriefHeaderActions
          briefId={briefId}
          visibility={brief?.visibility ?? "private"}
          isVisibilityPending={visibilityMutation.isPending}
          isDeletePending={deleteBriefMutation.isPending}
          isSampleBrief={brief?.id === "brief-sample-budget"}
          onToggleVisibility={(nextVisibility) =>
            visibilityMutation.mutate(nextVisibility)
          }
          onCopyShareLink={async () => {
            if (!brief) return;
            const absoluteUrl = new URL(
              `/share/${brief.id}`,
              window.location.origin,
            ).toString();
            await navigator.clipboard?.writeText(absoluteUrl);
            toast.success(t("brief.linkCopied"));
          }}
          onDelete={() => {
            setDeleteStatus(null);
            if (window.confirm(t("brief.deleteConfirm"))) {
              deleteBriefMutation.mutate();
            }
          }}
        />
      </div>
      <BriefErrorNotice message={brief?.aiError} className="mb-5" />

      <div className="grid gap-6">
        <div>
          <h2 className="text-2xl font-bold text-ink">{t("action.title")}</h2>
          <p className="mt-2 text-slate-600">
            {t("action.subtitle", {
              title: brief?.title ?? t("action.briefFallback"),
            })}
          </p>
          <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr] items-start">
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
                          event.target.value as
                            | CivicActionInput["actionType"]
                            | "",
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
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
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
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                  </label>
                )}
              </form.Field>
              <button
                className="btn-primary mt-5 w-full"
                disabled={mutation.isPending}
                type="submit"
              >
                {mutation.isPending ? (
                  <Spinner className="size-4" label={t("action.drafting")} />
                ) : (
                  <Sparkles size={16} />
                )}
                {mutation.isPending ? t("action.drafting") : t("action.draft")}
              </button>
            </form>

            <section className="surface rounded-lg p-4 sm:p-5">
              <h2 className="text-xl font-bold text-ink">
                {t("action.preview")}
              </h2>
              {mutation.data ? (
                <div className="mt-3 text-sm leading-6 text-slate-700">
                  <FormattedAiText content={mutation.data.content} />
                </div>
              ) : (
                <div className="mt-4 rounded-md border border-dashed border-civic-200 bg-civic-50/55 p-4 text-sm leading-6 text-slate-700">
                  <p className="font-semibold text-ink">{t("action.empty")}</p>
                  <p className="mt-1 text-slate-600">{t("action.emptyCopy")}</p>
                </div>
              )}
            </section>
          </div>
        </div>

        <BriefChatPanel briefId={briefId} />
      </div>
    </main>
  );
}
