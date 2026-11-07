import { notFound } from "next/navigation";
import { DetailView } from "@/components/detail-view";
import { getPublicPlaces } from "@/lib/server/public-places";
import type { Locale } from "@/lib/types";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const places = await getPublicPlaces();
  const place = places.find((p) => p.slug === slug);
  if (!place) notFound();
  return <DetailView locale={locale} place={place} places={places} />;
}
