import { SavedView } from "@/components/saved-view";
import { getPublicPlaces } from "@/lib/server/public-places";
import type { Locale } from "@/lib/types";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  return (
    <SavedView
      locale={(await params).locale}
      places={await getPublicPlaces()}
    />
  );
}
