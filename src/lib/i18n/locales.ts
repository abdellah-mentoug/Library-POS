export type Locale = "en" | "fr" | "ar";

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALES: Locale[] = ["en", "fr", "ar"];

/** Replace {param} placeholders in a template string */
export function interpolate(
  template: string,
  params: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    String(params[key] ?? `{${key}}`)
  );
}
