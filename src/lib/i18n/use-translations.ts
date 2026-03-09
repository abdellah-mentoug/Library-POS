"use client";

import { useLocale } from "./locale-context";
import { messages } from "./translations";
import type { Messages } from "./translations/en";

/** Client-side hook to get translations for a namespace */
export function useTranslations<K extends keyof Messages>(
  namespace: K
): Messages[K] {
  const { locale } = useLocale();
  return messages[locale][namespace];
}
