"use client";
import { useParams } from "next/navigation";
import { copy } from "@/messages/ui";
import type { Locale } from "@/lib/types";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { locale } = useParams<{ locale: Locale }>();
  const c = copy(locale || "ko");
  return (
    <main className="page empty-state">
      <h1>{c.errorTitle}</h1>
      <button className="btn primary" onClick={reset}>
        {c.retry}
      </button>
    </main>
  );
}
