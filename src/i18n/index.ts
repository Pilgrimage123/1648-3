/**
 * React bindings for the locale runtime. Core and the store import `./runtime`
 * so headless modules do not pull in React.
 */
import { useSyncExternalStore } from "react";
import { getLocale, subscribeLocale } from "./runtime";

export * from "./runtime";

export function useLocale() {
  return useSyncExternalStore(subscribeLocale, getLocale, getLocale);
}
