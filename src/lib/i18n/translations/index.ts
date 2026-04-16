import { en } from './en';
import { fr } from './fr';
import { ar } from './ar';
import type { Locale } from '../locales';

export { en, fr, ar };

export const messages: Record<Locale, typeof en> = { en, fr, ar };

export type TranslationKeys = typeof en;
