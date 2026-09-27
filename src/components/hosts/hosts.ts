"use client";

import { Flower2Icon, WrenchIcon, type LucideIcon } from "lucide-react";
import { HOST_BRANDS } from "@/components/embedded/shared/demo-controls";

/**
 * The product each records page pretends to be, the way the embedded demos
 * pretend to be Cadence or Ridgeline: a name, a line under it, a mark and a
 * palette. Client-only, because the mark is a component and no icon crosses
 * the server boundary; the palette id lives in `HOST_BRANDS`, which the route
 * files read on the server for the boot script.
 *
 * The names clash with nothing in the demo's own data: Northwind and Kestrel
 * are accounts and customers here, and the job sheet is Tallis Mechanical's.
 */
export interface RecordHost {
  readonly name: string;
  readonly subtitle: string;
  readonly icon: LucideIcon;
  readonly brandId: string;
  /**
   * Who the header says is signed in, for a page with no session users: a
   * dispatch desk is a role, not a person, so nobody is picked in the dock.
   */
  readonly staticUser?: { readonly name: string; readonly meta?: string };
}

export type RecordHostId = "leads" | "workOrders";

export const RECORD_HOSTS: Readonly<Record<RecordHostId, RecordHost>> = {
  leads: {
    name: "Larkspur CRM",
    subtitle: "Pipeline · opportunities",
    icon: Flower2Icon,
    brandId: HOST_BRANDS.leads,
  },
  workOrders: {
    name: "Tallis Mechanical — dispatch",
    subtitle: "Field service · work orders",
    icon: WrenchIcon,
    brandId: HOST_BRANDS.workOrders,
    staticUser: { name: "Dispatch desk", meta: "Signed in" },
  },
};
