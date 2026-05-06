import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../lib/auth";
import { deleteBrief, getBrief, getSharedBrief, updateBriefVisibility } from "../../lib/mockApi";
import { BriefActionPage } from "./BriefActionForm";
import { BriefChatPanel } from "./BriefChatPanel";
import { BriefErrorNotice, BriefSections } from "./BriefSections";
import { BriefHeaderActions } from "./BriefHeaderActions";
import { FileText } from "lucide-react";

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
    <main className="page-shell pb-6 lg:pb-[32rem]">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-civic-700">
            {brief.category} · {brief.jurisdiction}
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">{brief.title}</h1>
        </div>
        <BriefHeaderActions
          briefId={briefId}
          visibility={brief.visibility}
          isVisibilityPending={visibilityMutation.isPending}
          isDeletePending={deleteMutation.isPending}
          canDelete={brief.id !== "brief-sample-budget"}
          onToggleVisibility={(nextVisibility) =>
            visibilityMutation.mutate(nextVisibility)
          }
          onCopyShareLink={async () => {
            const absoluteUrl = new URL(
              `/share/${brief.id}`,
              window.location.origin,
            ).toString();
            await navigator.clipboard?.writeText(absoluteUrl);
            toast.success("Link copied!");
          }}
          onDelete={() => {
            setDeleteStatus(null);
            if (
              window.confirm(
                "Delete this brief and its chat/action history? This cannot be undone.",
              )
            ) {
              deleteMutation.mutate();
            }
          }}
        />
      </div>
      {deleteStatus ? (
        <p className="mb-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {deleteStatus}
        </p>
      ) : null}
      <BriefErrorNotice message={brief.aiError} className="mb-5" />
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <BriefSections
          sections={[
            { title: "Plain-language summary", items: [brief.summary] },
            { title: "Key points", items: brief.keyPoints },
            { title: "Who is affected", items: brief.affectedGroups },
            { title: "Concerns and risks", items: brief.concerns },
            {
              title: "Questions citizens should ask",
              items: brief.citizenQuestions,
            },
            { title: "Suggested next steps", items: brief.nextSteps },
          ]}
        />
        <BriefChatPanel briefId={briefId} />
      </div>
    </main>
  );
}

export function SharedBriefPage({ briefId }: { briefId: string }) {
  const { data: brief, isLoading } = useQuery({
    queryKey: ["shared-brief", briefId],
    queryFn: () => getSharedBrief(briefId),
  });

  if (isLoading)
    return <main className="page-shell">Loading shared brief...</main>;
  if (!brief)
    return <main className="page-shell">Shared brief not found.</main>;

  return (
    <main className="page-shell pb-6">
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
      <BriefSections
        sections={[
          { title: "Plain-language summary", items: [brief.summary] },
          { title: "Key points", items: brief.keyPoints },
          { title: "Who is affected", items: brief.affectedGroups },
          { title: "Concerns and risks", items: brief.concerns },
          {
            title: "Questions citizens should ask",
            items: brief.citizenQuestions,
          },
          { title: "Suggested next steps", items: brief.nextSteps },
        ]}
      />
    </main>
  );
}
