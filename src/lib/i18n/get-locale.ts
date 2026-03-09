import { cookies } from "next/headers";
import { DEFAULT_LOCALE, type Locale } from "./locales";

/** Read the locale from the cookie (server-side only) */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const val = cookieStore.get("locale")?.value;
  return val === "fr" ? "fr" : DEFAULT_LOCALE;
}
