"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import type { Locale } from "@/lib/types";
import { dashboardMessages } from "@/messages/dashboard";
import { requestJson } from "@/lib/firebase/requests";
import styles from "./admin-dashboard.module.css";

type Ranked = { id: string; count: number };
type Stats = {
  generatedAt: string;
  members: { total: number; truncated: boolean; last7: number; last30: number } | null;
  views: {
    daily: { day: string; pageViews: number; uniqueVisitors: number }[];
    today: number;
    total: number;
    uniqueToday: number;
    topPlaces: Ranked[];
  } | null;
  saved: { total: number; scanTruncated: boolean; top: Ranked[] } | null;
  openReports: number | null;
  publishedPlaces: number | null;
};

export function AdminDashboard({ locale }: { locale: Locale }) {
  const t = dashboardMessages[locale];
  const [stats, setStats] = useState<Stats | null>(null);
  const [busy, setBusy] = useState(true);
  const [failed, setFailed] = useState(false);
  const number = new Intl.NumberFormat(locale);

  const load = useCallback(() => {
    return requestJson<Stats>("/api/admin/stats")
      .then((next) => {
        setStats(next);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    let active = true;
    requestJson<Stats>("/api/admin/stats")
      .then((next) => {
        if (active) setStats(next);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // A metric that could not be counted is shown as unavailable, never as 0.
  const show = (value: number | null | undefined) =>
    value === null || value === undefined ? t.unavailable : number.format(value);
  const peak = Math.max(1, ...(stats?.views?.daily.map((entry) => entry.pageViews) ?? [1]));
  const tiles: { label: string; value: string; note?: string }[] = stats
    ? [
        { label: t.members, value: show(stats.members?.total), note: stats.members?.truncated ? t.membersTruncated : undefined },
        { label: t.signups7, value: show(stats.members?.last7) },
        { label: t.signups30, value: show(stats.members?.last30) },
        { label: t.viewsToday, value: show(stats.views?.today) },
        { label: t.uniqueToday, value: show(stats.views?.uniqueToday) },
        { label: t.views14, value: show(stats.views?.total) },
        { label: t.savedTotal, value: show(stats.saved?.total) },
        { label: t.openReports, value: show(stats.openReports) },
        { label: t.publishedPlaces, value: show(stats.publishedPlaces) },
      ]
    : [];

  function ranking(title: string, items: Ranked[] | undefined, suffix: string, note?: string) {
    return (
      <section className="panel">
        <h3>{title}</h3>
        {items?.length ? (
          <ol className={styles.rank}>
            {items.map((item) => (
              <li key={item.id}>
                <span>{item.id}</span>
                <b>{number.format(item.count)} {suffix}</b>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">{items ? t.none : t.unavailable}</p>
        )}
        {note && <p className="muted">{note}</p>}
      </section>
    );
  }

  return (
    <section className="stack" aria-labelledby="admin-dashboard-title">
      <div className={styles.head}>
        <h2 id="admin-dashboard-title">{t.title}</h2>
        <button type="button" className="btn secondary" disabled={busy} onClick={() => { setBusy(true); void load(); }}>
          <RefreshCw size={16} aria-hidden="true" />
          {t.refresh}
        </button>
      </div>
      {busy && !stats && <p className="muted" role="status">{t.loading}</p>}
      {failed && <p className="notice" role="alert">{t.failed}</p>}
      {stats && (
        <>
          <div className={styles.tiles}>
            {tiles.map((tile) => (
              <div key={tile.label} className={styles.tile}>
                <span>{tile.label}</span>
                <strong>{tile.value}</strong>
                {tile.note && <small>{tile.note}</small>}
              </div>
            ))}
          </div>
          <section className="panel">
            <h3>{t.chartTitle}</h3>
            {stats.views ? (
              <div className={styles.chart} role="img" aria-label={t.chartTitle}>
                {stats.views.daily.map((entry, index, all) => (
                  <div key={entry.day} className={`${styles.bar} ${index === all.length - 1 ? styles.today : ""}`} title={`${entry.day}: ${entry.pageViews}`}>
                    <div className={styles.barTrack}>
                      <div className={styles.fill} style={{ height: `${(entry.pageViews / peak) * 100}%` }} />
                    </div>
                    <small>{entry.day.slice(8)}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted">{t.unavailable}</p>
            )}
            <p className="muted">{t.chartNote}</p>
          </section>
          <div className={styles.lists}>
            {ranking(t.topViewed, stats.views?.topPlaces, t.countSuffix)}
            {ranking(t.topSaved, stats.saved?.top, t.savedSuffix, stats.saved?.scanTruncated ? t.savedScanNote : undefined)}
          </div>
          <p className="muted">{t.generatedAt}: {new Date(stats.generatedAt).toLocaleString(locale)}</p>
        </>
      )}
    </section>
  );
}
