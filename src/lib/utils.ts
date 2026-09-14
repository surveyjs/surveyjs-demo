import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function mergeTailwindClasses(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Key-order-insensitive serialisation, for "has this been edited?".
 *
 * A survey model rebuilds its data in question order, which is not the order the
 * answers were written in — comparing raw JSON would report every record as
 * edited the moment the form mounted.
 */
export function stableJson(value: Record<string, unknown>): string {
  return JSON.stringify(
    Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = value[key];
        return acc;
      }, {}),
  );
}
