"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const cloudEnabled = process.env.NEXT_PUBLIC_CLOUD_SERVICES_ENABLED === "true";
const DAY_KEY = "modujeju.visit-day";

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

/** Anonymous page-view counter. Sends only the page kind and a place slug. */
export function PageTracker() {
  const path = usePathname();
  useEffect(() => {
    if (!cloudEnabled || !path || /^\/[a-z]{2}\/admin(\/|$)/.test(path)) return;
    const place = /^\/[a-z]{2}\/places\/([a-z0-9-]{1,120})\/?$/.exec(path);
    let newVisitor = false;
    try {
      const day = today();
      if (window.localStorage.getItem(DAY_KEY) !== day) {
        window.localStorage.setItem(DAY_KEY, day);
        newVisitor = true;
      }
    } catch {
      // Without storage a visit is counted as a page view only.
    }
    void fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({
        kind: place ? "place" : "page",
        ...(place ? { placeSlug: place[1] } : {}),
        ...(newVisitor ? { newVisitor } : {}),
      }),
    }).catch(() => undefined);
  }, [path]);
  return null;
}
