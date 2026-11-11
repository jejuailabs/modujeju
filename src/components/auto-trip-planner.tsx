"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, LogIn, Wand2 } from "lucide-react";
import type { Locale, Place } from "@/lib/types";
import { recommendSavedTrip } from "@/lib/trip/recommend";
import { suggestedTripDays } from "@/lib/trip/auto-days";
import { requestJson } from "@/lib/firebase/requests";
import { useTravelStore } from "@/hooks/use-travel-store";
import { recommendationCopy } from "@/messages/recommendation";
import styles from "./auto-trip-planner.module.css";

const cloudEnabled = process.env.NEXT_PUBLIC_CLOUD_SERVICES_ENABLED === "true";

/** Signed-in travellers get a one-click plan from every spot they saved. */
export function AutoTripPlanner({ places, locale }: { places: Place[]; locale: Locale }) {
  const store = useTravelStore();
  const t = recommendationCopy(locale);
  const [signedIn, setSignedIn] = useState<boolean | null>(cloudEnabled ? null : false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<"" | "done" | "empty" | "failed">("");
  const [summary, setSummary] = useState({ count: 0, days: 0 });

  useEffect(() => {
    if (!cloudEnabled) return;
    let disposed = false;
    requestJson("/api/session")
      .then(() => { if (!disposed) setSignedIn(true); })
      .catch(() => { if (!disposed) setSignedIn(false); });
    return () => { disposed = true; };
  }, []);

  async function plan() {
    setBusy(true);
    setMessage("");
    try {
      const live = new Map(places.filter((place) => place.dataMode === "live").map((place) => [place.id, place]));
      const ids = new Set(store.savedIds);
      // Merge the spots saved to the account into this device's collection.
      const saved = await import("@/lib/firebase/saved");
      for (const id of await saved.getCloudSavedPlaceIds()) {
        if (live.has(id) && !ids.has(id)) { store.toggleSaved(id); ids.add(id); }
      }
      const savedPlaces = [...ids].flatMap((id) => live.get(id) ?? []);
      if (!savedPlaces.length) { setMessage("empty"); return; }
      const daytime = savedPlaces.filter((place) => place.type !== "stay").length;
      const relaxed = store.profile.shortWalk || store.profile.companions.includes("kids");
      const days = suggestedTripDays(daytime, relaxed);
      const recommendation = recommendSavedTrip({ places, savedIds: [...ids], profile: store.profile, nights: days - 1 });
      if (!store.applyRecommendedTrip(recommendation)) { setMessage("failed"); return; }
      setSummary({ count: savedPlaces.length, days: recommendation.tripDays });
      setMessage("done");
    } catch {
      setMessage("failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.box}>
      <div className={styles.copy}>
        <Wand2 size={26} aria-hidden="true" />
        <div>
          <h3>{t.autoTitle}</h3>
          <p>{cloudEnabled ? t.autoIntro : t.autoCloudOff}</p>
        </div>
      </div>
      {signedIn === false && cloudEnabled && (
        <Link href={`/${locale}/login`} className="btn primary"><LogIn size={18} aria-hidden="true" />{t.autoLogin}</Link>
      )}
      {signedIn === true && (
        <button type="button" className="btn primary" disabled={busy} aria-busy={busy} onClick={plan}>
          <CalendarCheck size={18} aria-hidden="true" />{busy ? t.autoBusy : t.autoButton}
        </button>
      )}
      <p className={styles.result} role="status">
        {message === "done" && t.autoDone.replace("{count}", String(summary.count)).replace("{days}", String(summary.days))}
        {message === "empty" && t.autoEmpty}
        {message === "failed" && t.autoFailed}
      </p>
    </div>
  );
}
