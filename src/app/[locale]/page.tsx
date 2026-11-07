import { HomeView } from "@/components/home-view";
import { getPublicPlaces } from "@/lib/server/public-places";
import type { Locale } from "@/lib/types";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  return <HomeView locale={locale} places={await getPublicPlaces()} />;
}
