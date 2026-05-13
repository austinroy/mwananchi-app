import { Link } from "@tanstack/react-router";
import { EyeOff, Globe, Link2, Share, Sparkles, Trash2 } from "lucide-react";
import { useI18n } from "../../lib/i18n";
import { Spinner } from "../ui/Spinner";

export function BriefHeaderActions({
  briefId,
  visibility,
  isVisibilityPending,
  isDeletePending,
  isSampleBrief,
  onToggleVisibility,
  onCopyShareLink,
  onDelete,
}: {
  briefId: string;
  visibility: "private" | "unlisted" | "public";
  isVisibilityPending: boolean;
  isDeletePending: boolean;
  isSampleBrief: boolean;
  onToggleVisibility: (nextVisibility: "private" | "public") => void;
  onCopyShareLink: () => Promise<void>;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const samplePrivateTooltip = "The example brief cannot be made private.";
  const sampleDeleteTooltip = "The example brief cannot be deleted.";

  return (
    <div className="grid items-center gap-2 sm:flex sm:flex-wrap">
      <details className="dropdown relative inline-block">
        <summary className="btn-secondary flex cursor-pointer list-none items-center gap-2 outline-none">
          <Share size={16} />
          {t("briefActions.menu")}
        </summary>
        <div className="absolute right-0 z-50 mt-1 min-w-[160px] rounded-md border border-white/45 bg-white/70 p-1 shadow-lg backdrop-blur-xl">
          <button
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
            disabled={visibility === "private"}
            onClick={async (e) => {
              const target = e.currentTarget.closest("details");
              if (target) target.removeAttribute("open");
              await onCopyShareLink();
            }}
          >
            <Link2 size={14} />
            {t("briefActions.copyLink")}
          </button>
          <div className="my-1 border-t border-slate-100" />
          {visibility === "private" ? (
            <button
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-civic-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={isVisibilityPending}
              onClick={() => {
                onToggleVisibility("public");
                const target = document.activeElement?.closest("details");
                if (target) target.removeAttribute("open");
              }}
            >
              {isVisibilityPending ? (
                <Spinner className="size-3" label="Updating visibility" />
              ) : (
                <Globe size={14} />
              )}
              {t("briefActions.makePublic")}
            </button>
          ) : (
            <span
              className="block"
              title={isSampleBrief ? samplePrivateTooltip : undefined}
            >
              <button
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                disabled={isVisibilityPending || isSampleBrief}
                onClick={() => {
                  onToggleVisibility("private");
                  const target = document.activeElement?.closest("details");
                  if (target) target.removeAttribute("open");
                }}
              >
                {isVisibilityPending ? (
                  <Spinner className="size-3" label="Updating visibility" />
                ) : (
                  <EyeOff size={14} />
                )}
                {t("briefActions.makePrivate")}
              </button>
            </span>
          )}
        </div>
      </details>
      <Link
        to="/briefs/$briefId/actions"
        params={{ briefId }}
        className="btn-primary"
      >
        <Sparkles size={16} />
        {t("briefActions.generate")}
      </Link>
      <span
        className="inline-flex w-full sm:w-auto"
        title={isSampleBrief ? sampleDeleteTooltip : undefined}
      >
        <button
          className="btn-danger w-full sm:w-auto"
          type="button"
          disabled={isDeletePending || isSampleBrief}
          onClick={onDelete}
        >
          {isDeletePending ? (
            <Spinner className="size-4" label={t("briefActions.deleting")} />
          ) : (
            <Trash2 size={16} />
          )}
          {isDeletePending
            ? t("briefActions.deleting")
            : t("briefActions.delete")}
        </button>
      </span>
    </div>
  );
}
