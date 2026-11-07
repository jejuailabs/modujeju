import type { Locale, Place } from "@/lib/types";
import { catalogCopy } from "@/messages/catalog";

export function CatalogNotice({ locale, places }: { locale: Locale; places: Place[] }) {
  const actual = places.filter((place) => place.dataMode === "live");
  if (!actual.length) return null;
  const t = catalogCopy(locale);
  return (
    <aside className="catalog-notice">
      <strong>{t.source} <span>{actual.length} {t.count}</span></strong>
      <p>{t.notice}</p>
      {locale !== "ko" && <small>{t.originalLanguage}</small>}
    </aside>
  );
}
