import { en } from "./en";
import { fr } from "./fr";
import type { Messages } from "./en";
import type { Locale } from "../locales";

export type { Messages };

export const messages: Record<Locale, Messages> = { en, fr };
