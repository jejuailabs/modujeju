"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { companions, type Companion, type Locale, type Place } from "@/lib/types";
import { browsePlaceTypes, browseCategory, type BrowsePlaceType } from "@/lib/place-categories";
import { companionStatuses, matchesCompanions, type CombineMode } from "@/lib/spot-map-filter";
import { copy } from "@/messages/ui";
import { spotMapCopy } from "@/messages/spot-map";
import { hasPlaceCoordinates } from "./osm-map";
import { FeatureIcon } from "./feature-icon";
import { PlaceImage } from "./place-image";
import { typeIcons } from "./common";
import styles from "./spot-map.module.css";

const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
// Whole island, including 우도 and 마라도; users cannot drift far off Jeju.
const JEJU_BOUNDS: Leaflet.LatLngBoundsLiteral = [[33.1, 126.14], [33.6, 126.98]];
const PAN_LIMIT: Leaflet.LatLngBoundsLiteral = [[32.9, 125.9], [33.8, 127.2]];
const CATEGORY_COLOR: Record<BrowsePlaceType, string> = {
  restaurant: "#b65936", cafe: "#926735", stay: "#55718d", attraction: "#567a46",
};

export function SpotMap({ locale, places, className }: { locale: Locale; places: Place[]; className?: string }) {
  const t = spotMapCopy(locale);
  const c = copy(locale);
  const container = useRef<HTMLDivElement>(null);
  const runtime = useRef<{ L: typeof Leaflet; map: Leaflet.Map; layer: Leaflet.LayerGroup } | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selectedCompanions, setSelectedCompanions] = useState<Companion[]>([]);
  const [mode, setMode] = useState<CombineMode>("and");
  const [includeConditional, setIncludeConditional] = useState(true);
  const [category, setCategory] = useState<BrowsePlaceType | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const evaluated = useMemo(() => places
    .filter((place) => place.facts.operating.value !== "closed" && place.facts.operating.value !== "suspended")
    .map((place) => ({ place, statuses: companionStatuses(place) })), [places]);

  const counts = useMemo(() => Object.fromEntries(companions.map((companion) => [
    companion,
    evaluated.filter(({ statuses }) => statuses[companion] === "yes" || (includeConditional && statuses[companion] === "conditional")).length,
  ])) as Record<Companion, number>, [evaluated, includeConditional]);

  const visible = useMemo(() => evaluated.filter(({ place, statuses }) =>
    (category === "all" || browseCategory(place.type) === category)
    && matchesCompanions(statuses, selectedCompanions, mode, includeConditional)), [evaluated, category, selectedCompanions, mode, includeConditional]);
  const mapped = useMemo(() => visible.filter(({ place }) => hasPlaceCoordinates(place)), [visible]);
  const selected = selectedId ? visible.find(({ place }) => place.id === selectedId) : undefined;

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false;
    let instance: Leaflet.Map | undefined;
    void import("leaflet").then((L) => {
      if (cancelled) return;
      const map = L.map(element, {
        zoomControl: true, scrollWheelZoom: true, preferCanvas: true, minZoom: 9, maxZoom: 18,
        maxBounds: PAN_LIMIT, maxBoundsViscosity: 0.8, zoomSnap: 0.5, wheelPxPerZoomLevel: 90,
      });
      instance = map;
      map.attributionControl.setPrefix(false);
      L.tileLayer(OSM_TILE_URL, {
        minZoom: 9, maxZoom: 18, updateWhenIdle: true, keepBuffer: 1,
        referrerPolicy: "strict-origin-when-cross-origin",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);
      map.fitBounds(JEJU_BOUNDS);
      runtime.current = { L, map, layer: L.layerGroup().addTo(map) };
      setReady(true);
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; runtime.current = null; instance?.remove(); };
  }, []);

  useEffect(() => {
    const current = runtime.current;
    if (!ready || !current) return;
    const { L, layer } = current;
    layer.clearLayers();
    const renderer = L.canvas({ padding: 0.3 });
    for (const { place, statuses } of mapped) {
      const conditionalOnly = selectedCompanions.length > 0
        && selectedCompanions.every((companion) => statuses[companion] === "conditional");
      const color = CATEGORY_COLOR[browseCategory(place.type)];
      const active = place.id === selectedId;
      L.circleMarker([place.lat as number, place.lng as number], {
        renderer, radius: active ? 11 : 6, color: active ? "#342a25" : "#ffffff", weight: active ? 3 : 1.5,
        fillColor: color, fillOpacity: conditionalOnly ? 0.45 : 0.92,
      }).on("click", () => setSelectedId(place.id)).bindTooltip(place.name[locale], { direction: "top" }).addTo(layer);
    }
  }, [ready, mapped, selectedCompanions, selectedId, locale]);

  function reset() {
    setSelectedCompanions([]);
    setCategory("all");
    setMode("and");
    setIncludeConditional(true);
    setSelectedId(null);
    runtime.current?.map.fitBounds(JEJU_BOUNDS);
  }

  const statusLabel = (status: string) => status === "yes" ? t.yes : status === "conditional" ? t.conditionalStatus : status === "no" ? t.no : t.unknown;

  return (
    <section className={`${styles.root} ${className ?? ""}`} aria-label={t.title}>
      <div className={styles.controls}>
        <div className={styles.group}>
          <strong>{t.who}</strong>
          <div className={styles.companions}>
            {companions.map((companion) => (
              <button
                key={companion}
                type="button"
                className={styles.companion}
                aria-pressed={selectedCompanions.includes(companion)}
                onClick={() => setSelectedCompanions((current) => current.includes(companion) ? current.filter((value) => value !== companion) : [...current, companion])}
              >
                <FeatureIcon feature={companion} size={44} aria-hidden="true" />
                <span>{c[companion]}</span>
                <small>{counts[companion]} {c.countSuffix}</small>
              </button>
            ))}
          </div>
        </div>
        <div className={styles.group}>
          <strong>{t.mode}</strong>
          <div className={styles.segment} role="group" aria-label={t.mode}>
            <button type="button" aria-pressed={mode === "and"} onClick={() => setMode("and")}>{t.and}</button>
            <button type="button" aria-pressed={mode === "or"} onClick={() => setMode("or")}>{t.or}</button>
          </div>
          <p className={styles.note}>{mode === "and" ? t.andNote : t.orNote}</p>
          <label className={styles.check}>
            <input type="checkbox" checked={includeConditional} onChange={(event) => setIncludeConditional(event.target.checked)} />
            {t.conditional}
          </label>
        </div>
        <div className={styles.group}>
          <strong>{t.category}</strong>
          <div className={styles.chips}>
            <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>{t.all}</button>
            {browsePlaceTypes.map((type) => {
              const Icon = typeIcons[type];
              return (
                <button key={type} type="button" aria-pressed={category === type} onClick={() => setCategory(type)}>
                  <i style={{ background: CATEGORY_COLOR[type] }} aria-hidden="true" />
                  <Icon size={16} aria-hidden="true" />{c[type]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.status} role="status" aria-live="polite">
        <span><strong>{mapped.length}</strong> {t.shown} · {t.ofTotal} {evaluated.length}</span>
        {visible.length > mapped.length && <span>{t.noCoordinates} ({visible.length - mapped.length})</span>}
        <button type="button" onClick={reset}><RotateCcw size={15} aria-hidden="true" />{t.reset}</button>
      </div>

      <div className={styles.mapWrap}>
        <div ref={container} className={styles.map} role="region" aria-label={t.mapLabel} />
        {(!ready || failed) && <p className={styles.overlay} role="status">{failed ? t.error : t.loading}</p>}
        {ready && mapped.length === 0 && <p className={styles.overlay} role="status">{t.none}</p>}
      </div>

      <div className={styles.detail} aria-live="polite">
        {selected ? (
          <article className={styles.card}>
            <div className={styles.thumb}><PlaceImage place={selected.place} locale={locale} variant="thumbnail" thumbnailWidth={96} thumbnailHeight={96} /></div>
            <div className={styles.cardBody}>
              <small>{selected.place.district[locale]} · {c[selected.place.type]}</small>
              <h3>{selected.place.name[locale]}</h3>
              <ul className={styles.statusList}>
                {companions.map((companion) => (
                  <li key={companion} data-status={selected.statuses[companion]}>{c[companion]} · {statusLabel(selected.statuses[companion])}</li>
                ))}
              </ul>
              {selected.place.summary[locale] && <p>{selected.place.summary[locale]}</p>}
            </div>
            <Link href={`/${locale}/places/${selected.place.slug}`} className="btn secondary">{t.open}<ArrowUpRight size={18} aria-hidden="true" /></Link>
          </article>
        ) : <p className={styles.pick}>{t.pick}</p>}
      </div>
    </section>
  );
}
