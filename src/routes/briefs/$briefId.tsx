import { BriefPage } from "../../components/brief/BriefPage";
import { useParams } from "@tanstack/react-router";

export function BriefRoutePage() {
  const { briefId } = useParams({ from: "/briefs/$briefId" });
  return <BriefPage briefId={briefId} />;
}
