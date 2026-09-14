import type { MetadataRoute } from "next";
import { indexable } from "@/lib/metadata";

/**
 * `/robots.txt`. Open unless `NEXT_PUBLIC_INDEXABLE` is `"false"`, in which case
 * crawling is disallowed and every page also carries `noindex` (the root layout).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: indexable ? { userAgent: "*", allow: "/" } : { userAgent: "*", disallow: "/" },
  };
}
