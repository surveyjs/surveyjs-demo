import { getFormNavItem, getSchemaDefinition } from "@/schemas";
import { NeutralHeader } from "@/components/hosts/NeutralHeader";
import { StarterDemo } from "@/components/starter/StarterDemo";
import { pageMetadata } from "@/lib/metadata";
import { loadSurveyJson } from "@/storage/survey-json";

const nav = getFormNavItem("starter");

export const metadata = pageMetadata(nav.id);

// The visitor's own definition, read on the server: an edit made on `/configure`
// is in the HTML this page sends.
export default async function StarterPage() {
  return (
    <div className="min-h-svh">
      <NeutralHeader title={nav.label} description={nav.description} width="max-w-3xl" />
      <StarterDemo schema={(await loadSurveyJson(nav.schemaId)) ?? getSchemaDefinition(nav.schemaId).json} />
    </div>
  );
}
