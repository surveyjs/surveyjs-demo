import { HowPage } from "@/components/how-built/HowPage";
import { howMetadata } from "@/lib/metadata";

export const metadata = howMetadata("embeddedChart");

/** How /embedded/chart is built, from `how/embedded-chart.md`. Inside the admin shell, unlike the example it explains. */
export default function Page() {
  return <HowPage navId="embeddedChart" />;
}
