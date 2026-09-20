import { HowPage } from "@/components/how-built/HowPage";
import { howMetadata } from "@/lib/metadata";

export const metadata = howMetadata("embeddedClinic");

/** How /embedded/clinic is built, from `how/embedded-clinic.md`. Inside the admin shell, unlike the example it explains. */
export default function Page() {
  return <HowPage navId="embeddedClinic" />;
}
