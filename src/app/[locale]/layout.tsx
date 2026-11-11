import { notFound } from "next/navigation";
import { locales, type Locale } from "@/lib/types";
import { PageTracker } from "@/components/page-tracker";
import { SiteShell } from "@/components/site-shell";
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  return (
    <SiteShell locale={locale as Locale}>
      <PageTracker />
      {children}
    </SiteShell>
  );
}
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
