import { getNavItem } from "@/schemas";
import { NotImplemented } from "@/components/NotImplemented";

const nav = getNavItem("leads");

/** What the real page will show, once it is built. */
const LEADS_FEATURES = [
  "Variables from the server",
  "Choices from your API",
  "An async validator calling the server",
  "Live updates with presence",
  "PDF",
] as const;

export default function LeadsPage() {
  return (
    <NotImplemented title={nav.label} description={nav.description} features={LEADS_FEATURES} />
  );
}
