import { Link } from "@tanstack/react-router";
import { EyeOff, Globe, Link2, Share, Sparkles, Trash2 } from "lucide-react";

export function BriefHeaderActions({
  briefId,
  visibility,
  isVisibilityPending,
  isDeletePending,
  canDelete,
  onToggleVisibility,
  onCopyShareLink,
  onDelete,
}: {
  briefId: string;
  visibility: "private" | "unlisted" | "public";
  isVisibilityPending: boolean;
  isDeletePending: boolean;
  canDelete: boolean;
  onToggleVisibility: (nextVisibility: "private" | "public") => void;
  onCopyShareLink: () => Promise<void>;
  onDelete: () => void;
}) {
  return (
    <div className="grid items-center gap-2 sm:flex sm:flex-wrap">
      <details className="dropdown relative inline-block">
        <summary className="btn-secondary flex cursor-pointer list-none items-center gap-2 outline-none">
          <Share size={16} />
          Share & Actions
        </summary>
        <div className="absolute right-0 z-50 mt-1 min-w-[160px] rounded-md border border-slate-200 bg-white p-1 shadow-lg">
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
            Copy link
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
              <Globe size={14} />
              Make Public
            </button>
          ) : (
            <button
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              disabled={isVisibilityPending}
              onClick={() => {
                onToggleVisibility("private");
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
        disabled={isDeletePending || !canDelete}
        onClick={onDelete}
      >
        <Trash2 size={16} />
        {isDeletePending ? "Deleting..." : "Delete brief"}
      </button>
    </div>
  );
}
