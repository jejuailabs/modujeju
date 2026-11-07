import { TripBoard } from "@/components/trip-board";
import { getPublicPlaces } from "@/lib/server/public-places";
import type { Locale } from "@/lib/types";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  return (
    <TripBoard
      locale={(await params).locale}
      places={await getPublicPlaces()}
    />
  );
}
