import { developerBPages } from "../config/developerBPages";
import { FeaturePageShell } from "./FeaturePageShell";

export default function MaintenancePage() {
  return <FeaturePageShell page={developerBPages.maintenance} />;
}
