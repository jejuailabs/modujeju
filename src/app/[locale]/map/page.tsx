import { SpotMapPage } from "@/components/spot-map-page";
import { getPublicPlaces } from "@/lib/server/public-places";
import type { Locale } from "@/lib/types";

export default async function Page({ params }: { params: Promise<{ locale: Locale }> }) {
  return <SpotMapPage locale={(await params).locale} places={await getPublicPlaces()} />;
}
