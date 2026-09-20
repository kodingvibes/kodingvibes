import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import Header from '@/components/Header';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as 'es' | 'en' | 'de' | 'fr' | 'it' | 'pt' | 'ru' | 'zh' | 'ja')) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {/*
        No <Suspense> wrapper here. A Suspense boundary around a client
        component makes Next.js stream it into a `<div hidden>` that only an
        inline script reveals, so text-mode browsers and clients without JS
        would lose the navigation too. Header reads its query params on the
        client instead of via useSearchParams(), so it can render inline and
        needs no boundary.
      */}
      <Header />
      {children}
    </NextIntlClientProvider>
  );
}
