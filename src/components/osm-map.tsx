"use client";

import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { regions, type Locale, type Place, type Region } from "@/lib/types";
import { browseCategory } from "@/lib/place-categories";
import { copy } from "@/messages/ui";
import styles from "./osm-map.module.css";

// Standard OSM tiles are loaded by the browser only for the visible viewport.
// No proxy, prefetch, API key, paid fallback, or cache-busting parameters.
const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const REGION_CENTERS: Record<Region, Leaflet.LatLngTuple> = {
  north: [33.49, 126.53], east: [33.39, 126.81],
  south: [33.26, 126.51], west: [33.36, 126.27],
};
const mapCopy = {
  ko: { loading: "제주 지도를 불러오는 중이에요.", error: "지도를 불러오지 못했어요. 장소 목록은 계속 이용할 수 있어요.", tilesError: "일부 지도 배경을 불러오지 못했어요.", group: "권역 묶음 · 정확 위치 아님", exact: "장소 위치", region: "좌표 없는 장소 · 권역별 모음", route: "점선은 방문 순서를 잇는 직선이며 실제 이동 경로가 아니에요.", issue: "지도 오류 제보", zoomIn: "지도 확대", zoomOut: "지도 축소" },
  en: { loading: "Loading the Jeju map…", error: "The map could not load. The place list is still available.", tilesError: "Some map tiles could not load.", group: "Area group · not an exact location", exact: "Place location", region: "No coordinates · grouped by area", route: "Dashed lines show visit order, not a road route.", issue: "Report a map issue", zoomIn: "Zoom in", zoomOut: "Zoom out" },
  zh: { loading: "正在加载济州地图…", error: "地图无法加载，地点列表仍可使用。", tilesError: "部分地图背景无法加载。", group: "区域分组 · 非精确位置", exact: "地点位置", region: "无坐标地点 · 按区域分组", route: "虚线连接参观顺序，并非实际道路路线。", issue: "报告地图问题", zoomIn: "放大地图", zoomOut: "缩小地图" },
  ja: { loading: "済州の地図を読み込み中です。", error: "地図を読み込めませんでした。スポット一覧は引き続き利用できます。", tilesError: "地図背景の一部を読み込めませんでした。", group: "エリアのグループ・正確な位置ではありません", exact: "スポットの位置", region: "座標なし・地域別のグループ", route: "点線は訪問順を示す直線で、道路の経路ではありません。", issue: "地図の問題を報告", zoomIn: "拡大", zoomOut: "縮小" },
};

export function hasPlaceCoordinates(place: Place): place is Place & { lat: number; lng: number } {
  return typeof place.lat === "number" && typeof place.lng === "number" && Number.isFinite(place.lat) && Number.isFinite(place.lng) && place.lat >= -90 && place.lat <= 90 && place.lng >= -180 && place.lng <= 180;
}

interface OsmMapProps {
  locale: Locale;
  places: Place[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  selectedRegion?: Region | null;
  onSelectRegion?: (region: Region) => void;
  /** Optional visit order. Connecting lines are explicitly not driving routes. */
  routePlaceIds?: string[];
  className?: string;
}

interface MapRuntime {
  L: typeof import("leaflet");
  map: Leaflet.Map;
  locale: Locale;
}

function textNode(tag: "span" | "strong" | "small" | "div", text: string, className?: string) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

export function OsmMap({ locale, places, selectedId = null, onSelect, selectedRegion = null, onSelectRegion, routePlaceIds, className }: OsmMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onSelect, onSelectRegion });
  const markers = useRef(new Map<string, Leaflet.Marker>());
  const groupMarkers = useRef(new Map<Region, Leaflet.Marker>());
  const lastBounds = useRef("");
  const [runtime, setRuntime] = useState<MapRuntime | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [tileError, setTileError] = useState(false);
  const t = mapCopy[locale];
  const hasGroups = places.some((place) => !hasPlaceCoordinates(place));

  useEffect(() => { callbacks.current = { onSelect, onSelectRegion }; }, [onSelect, onSelectRegion]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false;
    let instance: Leaflet.Map | undefined;
    let observer: ResizeObserver | undefined;
    // Leaflet accesses window at module evaluation: never import it on the server.
    void import("leaflet").then((L) => {
      if (cancelled) return;
      const map = L.map(element, { zoomControl: false, scrollWheelZoom: false, keyboard: true, zoomAnimation: false, fadeAnimation: false, markerZoomAnimation: false });
      instance = map;
      map.attributionControl.setPrefix(false);
      L.control.zoom({ position: "topright", zoomInTitle: mapCopy[locale].zoomIn, zoomOutTitle: mapCopy[locale].zoomOut }).addTo(map);
      L.tileLayer(OSM_TILE_URL, {
        minZoom: 3, maxZoom: 19, updateWhenIdle: true, updateWhenZooming: false, keepBuffer: 0,
        referrerPolicy: "strict-origin-when-cross-origin",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      }).on("tileerror", () => { if (!cancelled) setTileError(true); }).on("tileload", () => { if (!cancelled) setTileError(false); }).addTo(map);
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(() => { if (map.getZoom() !== undefined) map.invalidateSize({ pan: false, animate: false }); });
        observer.observe(element);
      }
      lastBounds.current = "";
      setLoadError(false);
      setRuntime({ L, map, locale });
    }).catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; observer?.disconnect(); instance?.remove(); };
  }, [locale]);

  useEffect(() => {
    if (!runtime || runtime.locale !== locale) return;
    const { L, map } = runtime;
    const c = copy(locale);
    const words = mapCopy[locale];
    const layer = L.layerGroup().addTo(map);
    const bounds: Leaflet.LatLngTuple[] = [];
    markers.current.clear();
    groupMarkers.current.clear();

    function accessibleMarker(marker: Leaflet.Marker, label: string, activate: () => void) {
      marker.on("click", activate);
      const attach = () => {
        const element = marker.getElement();
        if (!element) return;
        element.setAttribute("role", "button");
        element.setAttribute("aria-label", label);
        element.setAttribute("aria-pressed", "false");
        // A marker may be queued until the first fitBounds loads the map.
        element.addEventListener("keydown", (event) => {
          if (event.key === " ") { event.preventDefault(); event.stopPropagation(); activate(); }
        });
      };
      marker.on("add", attach);
      attach();
    }

    let pinNumber = 0;
    places.forEach((place) => {
      if (!hasPlaceCoordinates(place)) return;
      pinNumber += 1;
      const position: Leaflet.LatLngTuple = [place.lat, place.lng];
      bounds.push(position);
      const category = browseCategory(place.type);
      const label = `${pinNumber}. ${place.name[locale]} · ${c[category]}`;
      const iconContent = textNode("div", "", `${styles.pin} ${styles[category]}`);
      iconContent.append(textNode("strong", String(pinNumber)));
      const marker = L.marker(position, { icon: L.divIcon({ html: iconContent, className: styles.marker, iconSize: [36, 42], iconAnchor: [18, 42] }), title: label, keyboard: true, riseOnHover: true }).addTo(layer);
      marker.bindTooltip(textNode("span", label), { direction: "top", offset: [0, -36] });
      accessibleMarker(marker, label, () => callbacks.current.onSelect?.(place.id));
      markers.current.set(place.id, marker);
    });

    for (const region of regions) {
      const members = places.filter((place) => place.region === region && !hasPlaceCoordinates(place));
      if (!members.length) continue;
      const position = REGION_CENTERS[region];
      bounds.push(position);
      const label = `${c[region]} ${members.length} · ${words.group}`;
      const content = textNode("div", "", styles.groupPin);
      content.append(textNode("strong", `${c[region]} ${members.length}`), textNode("small", words.group));
      const marker = L.marker(position, { icon: L.divIcon({ html: content, className: styles.groupMarker, iconSize: [146, 48], iconAnchor: [73, 24] }), keyboard: true, title: label, zIndexOffset: -100 }).addTo(layer);
      accessibleMarker(marker, label, () => {
        if (callbacks.current.onSelectRegion) callbacks.current.onSelectRegion(region);
        else callbacks.current.onSelect?.(members[0].id);
      });
      groupMarkers.current.set(region, marker);
    }

    const route = routePlaceIds?.flatMap((id) => {
      const place = places.find((candidate) => candidate.id === id);
      return place && hasPlaceCoordinates(place) ? [[place.lat, place.lng] as Leaflet.LatLngTuple] : [];
    }) ?? [];
    if (route.length > 1) L.polyline(route, { color: "#315e46", weight: 3, dashArray: "7 7", opacity: 0.8, interactive: false }).addTo(layer);
    const boundsKey = JSON.stringify(bounds);
    if (lastBounds.current !== boundsKey) {
      lastBounds.current = boundsKey;
      if (bounds.length) map.fitBounds(L.latLngBounds(bounds), { padding: [48, 50], maxZoom: hasGroups ? 11 : 14, animate: false });
      else map.setView([33.38, 126.55], 10, { animate: false });
    }
    return () => { layer.remove(); };
  }, [runtime, places, locale, routePlaceIds, hasGroups]);

  useEffect(() => {
    if (!runtime || runtime.locale !== locale) return;
    for (const [id, marker] of markers.current) {
      const active = id === selectedId;
      marker.getElement()?.classList.toggle(styles.selected, active);
      marker.getElement()?.setAttribute("aria-pressed", String(active));
      marker.setZIndexOffset(active ? 1000 : 0);
      if (active && !runtime.map.getBounds().contains(marker.getLatLng())) runtime.map.panTo(marker.getLatLng(), { animate: false });
    }
    for (const [region, marker] of groupMarkers.current) {
      const active = region === selectedRegion;
      marker.getElement()?.classList.toggle(styles.selected, active);
      marker.getElement()?.setAttribute("aria-pressed", String(active));
      marker.setZIndexOffset(active ? 900 : -100);
    }
  }, [runtime, selectedId, selectedRegion, places, locale, routePlaceIds]);

  return (
    <div className={`${styles.frame} ${className ?? ""}`}>
      <div className={styles.mapWrap}>
        <div ref={container} className={styles.map} role="region" aria-label={`${copy(locale).map} · OpenStreetMap`} />
        {(!runtime || loadError) && <p className={styles.status} role="status">{loadError ? t.error : t.loading}</p>}
        {tileError && <p className={styles.tileError} role="status">{t.tilesError}</p>}
      </div>
      <div className={styles.legend}><span><i className={styles.exactDot} />{t.exact}</span>{hasGroups && <span><i className={styles.groupDot} />{t.region}</span>}<a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noopener noreferrer">{t.issue}</a></div>
      {!!routePlaceIds && routePlaceIds.length > 1 && <p className={styles.routeNote}>{t.route}</p>}
    </div>
  );
}
