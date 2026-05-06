import { SharedBriefPage } from "../../components/brief/BriefPage";
import { useParams } from "@tanstack/react-router";

export function SharedBriefRoutePage() {
  const { briefId } = useParams({ from: "/share/$briefId" });
  return <SharedBriefPage briefId={briefId} />;
}
