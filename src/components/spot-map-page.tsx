"use client";

import type { Locale, Place } from "@/lib/types";
import { spotMapCopy } from "@/messages/spot-map";
import { PageIntro } from "./common";
import { SpotMap } from "./spot-map";

export function SpotMapPage({ locale, places }: { locale: Locale; places: Place[] }) {
  const t = spotMapCopy(locale);
  return (
    <main className="page results-page">
      <PageIntro locale={locale} title={t.title} description={t.intro} />
      <SpotMap locale={locale} places={places} />
    </main>
  );
}
