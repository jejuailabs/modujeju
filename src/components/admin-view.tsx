"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FilePlus2,
  LockKeyhole,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import {
  createUnknownFacts,
  placeTypes,
  regions,
  type Locale,
  type Place,
  type PlaceType,
  type Region,
} from "@/lib/types";
import { accountError, accountMessages } from "@/messages/account";
import { copy } from "@/messages/ui";
import { errorCode, requestJson } from "@/lib/firebase/requests";
import { PageIntro } from "./common";

type Status = "draft" | "published" | "hidden" | "suspended" | "closed";
type Rights = {
  status: "unverified" | "permitted" | "placeholder";
  credit: string;
  license: string;
  sourceUrl?: string;
};
type Editable = { place: Place; status: Status; imageRights: Rights };
type Entry = {
  id: string;
  place: Place | null;
  status: Status;
  imageRights: Rights;
  updatedAt: string;
};
type ReportStatus = "open" | "inProgress" | "applied" | "rejected";
type Report = {
  id: string;
  placeId: string;
  category: string;
  message: string;
  status: ReportStatus;
  createdAt: string | null;
};
const cloudEnabled = process.env.NEXT_PUBLIC_CLOUD_SERVICES_ENABLED === "true";
const reportStatuses: ReportStatus[] = [
  "open",
  "inProgress",
  "applied",
  "rejected",
];

function newDraft(): Editable {
  const blank = { ko: "", en: "", zh: "", ja: "" };
  return {
    place: {
      id: "new-place",
      slug: "new-place",
      name: blank,
      summary: blank,
      address: blank,
      district: blank,
      region: "east",
      type: "attraction",
      lat: 33.4,
      lng: 126.8,
      image: "/assets/icons/map-pin.svg",
      price: { amount: null, unit: "person", petExtra: null },
      durationMinutes: 0,
      facts: createUnknownFacts(),
      verifiedAt: null,
      dataMode: "live",
    },
    status: "draft",
    imageRights: { status: "placeholder", credit: "", license: "" },
  };
}

export function AdminView({ locale }: { locale: Locale }) {
  const c = accountMessages[locale],
    ui = copy(locale);
  const [unlocked, setUnlocked] = useState(false);
  const [places, setPlaces] = useState<Entry[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<
    "" | "savedDraft" | "reportUpdated" | "imported"
  >("");
  const [selected, setSelected] = useState<Entry | null>(null);
  const [editor, setEditor] = useState("");
  const [invalidJson, setInvalidJson] = useState(false);
  const [contentId, setContentId] = useState("");
  const [region, setRegion] = useState<Region>("east");
  const [type, setType] = useState<PlaceType>("attraction");

  async function loadData() {
    const [placeResponse, reportResponse] = await Promise.all([
      requestJson<{ places: Entry[]; hasMore: boolean }>("/api/admin/places"),
      requestJson<{ reports: Report[] }>("/api/admin/reports"),
    ]);
    setPlaces(placeResponse.places);
    setHasMore(placeResponse.hasMore);
    setReports(reportResponse.reports);
    setUnlocked(true);
    return placeResponse.places;
  }

  async function refresh() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await loadData();
      setSelected(null);
      setEditor("");
    } catch (cause) {
      setError(errorCode(cause));
      setUnlocked(false);
    } finally {
      setBusy(false);
    }
  }

  function selectPlace(entry: Entry) {
    if (!entry.place) return;
    setSelected(entry);
    setInvalidJson(false);
    setNotice("");
    setEditor(
      JSON.stringify(
        {
          place: entry.place,
          status: entry.status,
          imageRights: entry.imageRights,
        },
        null,
        2,
      ),
    );
  }

  async function save() {
    let parsed: Editable;
    try {
      parsed = JSON.parse(editor);
    } catch {
      setInvalidJson(true);
      return;
    }
    setInvalidJson(false);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await requestJson<{ id: string }>(
        selected
          ? `/api/admin/places/${encodeURIComponent(selected.id)}`
          : "/api/admin/places",
        {
          method: selected ? "PATCH" : "POST",
          body: JSON.stringify({
            ...parsed,
            ...(selected ? { expectedUpdatedAt: selected.updatedAt } : {}),
          }),
        },
      );
      const next = await loadData();
      const current = next.find((entry) => entry.id === result.id);
      if (current) selectPlace(current);
      setNotice("savedDraft");
    } catch (cause) {
      setError(errorCode(cause));
    } finally {
      setBusy(false);
    }
  }

  async function changeReport(id: string, status: ReportStatus) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requestJson("/api/admin/reports", {
        method: "PATCH",
        body: JSON.stringify({ id, status }),
      });
      setReports((previous) =>
        previous.map((report) =>
          report.id === id ? { ...report, status } : report,
        ),
      );
      setNotice("reportUpdated");
    } catch (cause) {
      setError(errorCode(cause));
    } finally {
      setBusy(false);
    }
  }

  async function importDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requestJson("/api/admin/import", {
        method: "POST",
        body: JSON.stringify({ contentId, region, type }),
      });
      await loadData();
      setContentId("");
      setNotice("imported");
    } catch (cause) {
      setError(errorCode(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page admin-page">
      <PageIntro
        locale={locale}
        title={c.adminTitle}
        description={c.adminIntro}
      />
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
      {!cloudEnabled ? (
        <section className="empty-state">
          <LockKeyhole size={36} aria-hidden="true" />
          <h2>{c.cloudOff}</h2>
          <p>{c.cloudOffBody}</p>
          <Link className="btn secondary" href={`/${locale}/results`}>
            {c.browse}
          </Link>
        </section>
      ) : !unlocked ? (
        <section className="panel">
          <LockKeyhole size={32} aria-hidden="true" />
          <h2>{c.adminLocked}</h2>
          <p className="muted">{c.adminLockedBody}</p>
          <div className="field-row">
            <Link className="btn secondary" href={`/${locale}/login`}>
              {c.google}
            </Link>
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={refresh}
            >
              {busy ? c.working : c.openAdmin}
            </button>
          </div>
        </section>
      ) : (
        <div className="stack">
          <div className="field-row">
            <ShieldCheck size={24} aria-hidden="true" />
            <button
              type="button"
              className="btn secondary"
              disabled={busy}
              onClick={refresh}
            >
              <RefreshCw size={16} aria-hidden="true" />
              {c.refresh}
            </button>
            <button
              type="button"
              className="btn secondary"
              disabled={busy}
              onClick={() => {
                setSelected(null);
                setEditor(JSON.stringify(newDraft(), null, 2));
                setInvalidJson(false);
              }}
            >
              <FilePlus2 size={16} aria-hidden="true" />
              {c.newDraft}
            </button>
          </div>
          <section className="panel">
            <h2>{c.places}</h2>
            {hasMore ? <p className="notice">{c.truncated}</p> : null}
            {places.length ? (
              <ul className="stack">
                {places.map((entry) => (
                  <li key={entry.id} className="field-row">
                    <span>
                      <strong>
                        {entry.place?.name[locale] ||
                          entry.place?.name.ko ||
                          entry.id}
                      </strong>{" "}
                      · {c[entry.status] ?? entry.status}
                    </span>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => selectPlace(entry)}
                      disabled={busy || !entry.place}
                    >
                      {c.edit}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{c.noPlaces}</p>
            )}
          </section>
          {editor ? (
            <section className="panel">
              <h2>{c.editor}</h2>
              <p className="muted">{c.editorBody}</p>
              <label className="form-field" htmlFor="place-json">
                <span>{c.jsonLabel}</span>
                <textarea
                  id="place-json"
                  value={editor}
                  onChange={(event) => setEditor(event.target.value)}
                  rows={20}
                  spellCheck={false}
                  dir="ltr"
                  disabled={busy}
                  style={{ width: "100%", fontFamily: "monospace" }}
                />
              </label>
              {invalidJson ? (
                <p role="alert" className="notice">
                  {c.invalidJson}
                </p>
              ) : null}
              <button
                type="button"
                className="btn primary"
                onClick={save}
                disabled={busy}
                aria-busy={busy}
              >
                <Save size={18} aria-hidden="true" />
                {busy ? c.working : c.saveDraft}
              </button>
            </section>
          ) : null}
          <section className="panel">
            <h2>{c.reports}</h2>
            {reports.length ? (
              <ul className="stack">
                {reports.map((report) => (
                  <li key={report.id}>
                    <p>
                      <strong>{report.placeId}</strong>
                    </p>
                    <p>{report.message}</p>
                    <label className="form-field">
                      <span>{c.reportStatus}</span>
                      <select
                        value={report.status}
                        disabled={busy}
                        onChange={(event) =>
                          void changeReport(
                            report.id,
                            event.target.value as ReportStatus,
                          )
                        }
                      >
                        {reportStatuses.map((status) => (
                          <option key={status} value={status}>
                            {c[status]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">{c.noReports}</p>
            )}
          </section>
          <section className="panel">
            <h2>{c.importTitle}</h2>
            <p className="muted">{c.importBody}</p>
            <form onSubmit={importDraft} className="stack">
              <label className="form-field">
                <span>{c.contentId}</span>
                <input
                  value={contentId}
                  onChange={(event) => setContentId(event.target.value)}
                  required
                  maxLength={100}
                  pattern="[a-zA-Z0-9_-]+"
                  disabled={busy}
                />
              </label>
              <div className="field-row">
                <label className="form-field">
                  <span>{c.region}</span>
                  <select
                    value={region}
                    onChange={(event) =>
                      setRegion(event.target.value as Region)
                    }
                    disabled={busy}
                  >
                    {regions.map((value) => (
                      <option key={value} value={value}>
                        {ui[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>{c.type}</span>
                  <select
                    value={type}
                    onChange={(event) =>
                      setType(event.target.value as PlaceType)
                    }
                    disabled={busy}
                  >
                    {placeTypes.map((value) => (
                      <option key={value} value={value}>
                        {ui[value]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button className="btn secondary" type="submit" disabled={busy}>
                {busy ? c.working : c.importButton}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
