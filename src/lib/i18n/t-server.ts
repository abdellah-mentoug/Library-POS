import { getLocale } from "./get-locale";
import { messages } from "./translations";
import type { Messages } from "./translations/en";

/** Server-side helper to get translations for a namespace */
export async function getTranslations<K extends keyof Messages>(
  namespace: K
): Promise<Messages[K]> {
  const locale = await getLocale();
  return messages[locale][namespace];
}
