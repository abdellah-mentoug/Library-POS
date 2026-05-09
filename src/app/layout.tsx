// src/app/layout.tsx
// Layout الرئيسي للتطبيق مع دعم i18n و RTL
import type { Metadata } from 'next';
import { Geist, Geist_Mono, Noto_Sans_Arabic } from 'next/font/google';
import './globals.css';
import { getLocale } from '@/lib/i18n/get-locale';
import { isRTL } from '@/lib/i18n/locales';
import { LocaleProvider } from '@/lib/i18n/locale-context';
import { ThemeProvider } from 'next-themes';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const notoArabic = Noto_Sans_Arabic({
  variable: '--font-noto-arabic',
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
});

// Metadata ديال الموقع
export const metadata: Metadata = {
  title: 'Library POS',
  description: 'Point of Sale for Bookstores',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // جلب اللغة الحالية من السيرفر أو الكوكيز
  const locale = await getLocale();
  const dir = isRTL(locale) ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoArabic.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          <LocaleProvider initialLocale={locale}>
            {children}
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
