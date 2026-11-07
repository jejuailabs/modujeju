import { Suspense } from "react";
import { ResultsView } from "@/components/results-view";
import { getPublicPlaces } from "@/lib/server/public-places";
import type { Locale } from "@/lib/types";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  return (
    <Suspense>
      <ResultsView
        locale={(await params).locale}
        places={await getPublicPlaces()}
      />
    </Suspense>
  );
}
