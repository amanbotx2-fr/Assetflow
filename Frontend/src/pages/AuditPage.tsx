import { developerBPages } from "../config/developerBPages";
import { FeaturePageShell } from "./FeaturePageShell";

export default function AuditPage() {
  return <FeaturePageShell page={developerBPages.audit} />;
}
