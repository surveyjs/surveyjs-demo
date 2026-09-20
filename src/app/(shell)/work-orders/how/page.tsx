import { HowPage } from "@/components/how-built/HowPage";
import { howMetadata } from "@/lib/metadata";

export const metadata = howMetadata("workOrders");

/** How /work-orders is built. The whole page is `how/work-orders.md`. */
export default function Page() {
  return <HowPage navId="workOrders" />;
}
