import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from './i18n/routing';

export const locales = routing.locales;
export type Locale = 'es' | 'en' | 'de' | 'fr' | 'it' | 'pt' | 'ru' | 'zh' | 'ja';
export const defaultLocale = routing.defaultLocale as Locale;

export const localeNames: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
};

export default getRequestConfig(async ({ locale }) => {
  const validLocale = locale ?? defaultLocale;
  if (!locales.includes(validLocale as Locale)) notFound();

  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default,
  };
});
