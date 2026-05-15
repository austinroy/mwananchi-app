import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { getBrief, listActions, deleteAction } from "../../lib/mockApi";
import { FormattedAiText } from "../../components/FormattedAiText";
import { useI18n } from "../../lib/i18n";
import { Link } from "@tanstack/react-router";
import { Copy, FileText, Trash2, Sparkles } from "lucide-react";
import { BriefTabs } from "../../components/brief/BriefTabs";
import { toast } from "sonner";
import { Spinner } from "../../components/ui/Spinner";
import type { CivicAction, CivicActionInput } from "../../lib/types";
export function BriefGeneratedActionsRoutePage() {
  const { briefId } = useParams({ from: "/briefs/$briefId/actions/generated" });
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: brief } = useQuery({
    queryKey: ["brief", briefId],
    queryFn: () => getBrief(briefId),
  });
  const { data: actions = [] } = useQuery({
    queryKey: ["brief-actions", briefId],
    queryFn: () => listActions(briefId),
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
      <BriefTabs briefId={briefId} activeTab="generated" />

      <section className="space-y-4">
        {actions.length ? (
          <div className="grid gap-3">
            {actions.map((action) => (
              <article
                key={action.id}
                className="rounded-md border border-white/45 bg-white/50 p-4 backdrop-blur-xl"
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
                      {deleteMutation.isPending ? (
                        <Spinner
                          className="size-3"
                          label={t("action.deletingDraft")}
                        />
                      ) : (
                        <Trash2 size={14} />
                      )}
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
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-civic-200 bg-civic-50/55 px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-civic-200/50">
              <Sparkles className="text-civic-500" size={24} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-ink">
              {t("action.empty")}
            </h3>
            <p className="mt-2 max-w-sm text-sm text-slate-600">
              {t("action.emptyCopy")}
            </p>
            <Link
              to="/briefs/$briefId/actions"
              params={{ briefId }}
              className="btn-primary mt-6"
            >
              <Sparkles size={16} />
              {t("action.draft")}
            </Link>
          </div>
        )}
      </section>
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

export default BriefGeneratedActionsRoutePage;
