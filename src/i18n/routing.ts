import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['es', 'en', 'de', 'fr', 'it', 'pt', 'ru', 'zh', 'ja'],
  defaultLocale: 'es',
  localePrefix: 'always',
});
