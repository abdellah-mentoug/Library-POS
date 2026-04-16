import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./locales";

/** Read the locale from the cookie (server-side only) */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const val = cookieStore.get("locale")?.value;
  return LOCALES.includes(val as Locale) ? (val as Locale) : DEFAULT_LOCALE;
}
