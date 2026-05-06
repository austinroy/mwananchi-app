import { BriefActionPage } from "../../components/brief/BriefActionForm";
import { useParams } from "@tanstack/react-router";

export function BriefActionsRoutePage() {
  const { briefId } = useParams({ from: "/briefs/$briefId/actions" });
  return <BriefActionPage briefId={briefId} />;
}
