import { ActionsPage } from "../../components/brief/BriefPage";
import { useParams } from "@tanstack/react-router";

export function BriefActionsRoutePage() {
  const { briefId } = useParams({ from: "/briefs/$briefId/actions" });
  return <ActionsPage briefId={briefId} />;
}
