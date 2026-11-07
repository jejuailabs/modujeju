"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Cloud,
  HardDrive,
  LogOut,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Locale, Place } from "@/lib/types";
import { accountError, accountMessages } from "@/messages/account";
import { requestJson, errorCode } from "@/lib/firebase/requests";
import { useTravelStore } from "@/hooks/use-travel-store";
import { PageIntro } from "./common";

type SessionUser = { uid: string; email: string | null; admin: boolean };
const cloudEnabled = process.env.NEXT_PUBLIC_CLOUD_SERVICES_ENABLED === "true";

export function AccountView({ locale }: { locale: Locale }) {
  const c = accountMessages[locale];
  const { savedIds, toggleSaved } = useTravelStore();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(cloudEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<"" | "synced" | "signedOut">("");

  useEffect(() => {
    if (!cloudEnabled) return;
    let disposed = false;
    async function restore() {
      try {
        const firebase = await import("@/lib/firebase/client");
        if (disposed) return;
        await firebase.finishGoogleRedirect();
        const result = await requestJson<{ user: SessionUser }>("/api/session");
        if (!disposed) setUser(result.user);
      } catch (cause) {
        const code = errorCode(cause);
        if (!disposed && code !== "UNAUTHORIZED") setError(code);
      } finally {
        if (!disposed) setChecking(false);
      }
    }
    void restore();
    return () => {
      disposed = true;
    };
  }, []);

  async function connect() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const firebase = await import("@/lib/firebase/client");
      const signedIn = await firebase.signInWithGoogle();
      if (signedIn) {
        const result = await requestJson<{ user: SessionUser }>("/api/session");
        setUser(result.user);
      }
    } catch (cause) {
      setError(errorCode(cause));
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await (await import("@/lib/firebase/client")).signOutFromApp();
      setUser(null);
      setNotice("signedOut");
    } catch (cause) {
      setError(errorCode(cause));
    } finally {
      setBusy(false);
    }
  }

  async function mergeSaved() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await import("@/lib/firebase/saved");
      const [remoteIds, catalog] = await Promise.all([
        saved.getCloudSavedPlaceIds(),
        requestJson<{ places: Place[] }>("/api/places"),
      ]);
      const live = new Map(
        catalog.places
          .filter((place) => place.dataMode === "live")
          .map((place) => [place.id, place]),
      );
      const remote = new Set(remoteIds);
      // Only upload genuine published places. Keep demo IDs entirely local.
      for (const id of savedIds) {
        const place = live.get(id);
        if (place && !remote.has(id))
          await saved.saveCloudPlace(
            id,
            place.verifiedAt ?? place.retrievedAt ?? "",
          );
      }
      const local = new Set(savedIds);
      for (const id of remoteIds)
        if (live.has(id) && !local.has(id)) {
          toggleSaved(id);
          local.add(id);
        }
      setNotice("synced");
    } catch (cause) {
      const code = errorCode(cause);
      setError(code);
      if (code === "UNAUTHORIZED") setUser(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page account-page">
      <PageIntro locale={locale} title={c.title} description={c.intro} />
      <div className="stack">
        <section className="panel">
          <HardDrive size={28} aria-hidden="true" />
          <h2>{c.localTitle}</h2>
          <p className="muted">{c.localBody}</p>
          <div className="field-row">
            <Link className="btn secondary" href={`/${locale}/results`}>
              {c.browse}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="btn secondary" href={`/${locale}/saved`}>
              {c.saved}
            </Link>
          </div>
        </section>
        {!cloudEnabled ? (
          <section className="panel">
            <Cloud size={28} aria-hidden="true" />
            <h2>{c.cloudOff}</h2>
            <p className="muted">{c.cloudOffBody}</p>
          </section>
        ) : checking ? (
          <p className="notice" role="status">
            {c.loading}
          </p>
        ) : user ? (
          <section className="panel">
            <ShieldCheck size={30} aria-hidden="true" />
            <h2>{c.signedIn}</h2>
            {user.email ? <p>{user.email}</p> : null}
            <p className="muted">{c.syncBody}</p>
            <div className="field-row">
              <button
                type="button"
                className="btn primary"
                onClick={mergeSaved}
                disabled={busy}
                aria-busy={busy}
              >
                {busy ? c.working : c.sync}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={disconnect}
                disabled={busy}
              >
                <LogOut size={18} aria-hidden="true" />
                {c.signOut}
              </button>
            </div>
            {user.admin ? (
              <p>
                <Link href={`/${locale}/admin`}>
                  {c.adminLink}
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </p>
            ) : null}
          </section>
        ) : (
          <section className="panel">
            <UserRound size={30} aria-hidden="true" />
            <h2>{c.google}</h2>
            <p className="muted">{c.loginBody}</p>
            <button
              type="button"
              className="btn primary"
              onClick={connect}
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? c.working : c.google}
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </section>
        )}
        {error ? (
          <p className="notice" role="alert">
            {accountError(error, locale)}
          </p>
        ) : null}
        {notice ? (
          <p className="notice" role="status">
            {c[notice]}
          </p>
        ) : null}
      </div>
    </main>
  );
}
