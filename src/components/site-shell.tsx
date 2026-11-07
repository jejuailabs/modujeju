"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import {
  Compass,
  Bookmark,
  CalendarDays,
  Moon,
  Sun,
  Globe2,
  ArrowUpRight,
} from "lucide-react";
import { copy } from "@/messages/ui";
import type { Locale } from "@/lib/types";
import { useTravelStore } from "@/hooks/use-travel-store";
import { tripMessages } from "@/messages/trip";
import { designCopy } from "@/messages/design";
let memoryTheme: string | null = null;
function readTheme() {
  let saved = memoryTheme;
  try {
    saved = localStorage.getItem("modujeju.theme") || saved;
  } catch {}
  return (
    saved === "dark" ||
    (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}
function subscribeTheme(notify: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("storage", notify);
  window.addEventListener("modujeju-theme", notify);
  media.addEventListener("change", notify);
  return () => {
    window.removeEventListener("storage", notify);
    window.removeEventListener("modujeju-theme", notify);
    media.removeEventListener("change", notify);
  };
}
const serverTheme = () => false;
export function SiteShell({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const c = copy(locale),
    path = usePathname(),
    router = useRouter();
  const store = useTravelStore();
  const d = designCopy(locale);
  const isHome = path === `/${locale}` || path === `/${locale}/`;
  const dark = useSyncExternalStore(subscribeTheme, readTheme, serverTheme);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [locale, dark]);
  function toggleTheme() {
    memoryTheme = dark ? "light" : "dark";
    try {
      localStorage.setItem("modujeju.theme", memoryTheme);
    } catch {}
    window.dispatchEvent(new Event("modujeju-theme"));
  }
  const links = [
    { href: "results", label: c.navExplore, Icon: Compass },
    { href: "saved", label: c.navSaved, Icon: Bookmark },
    { href: "itinerary", label: c.navTrip, Icon: CalendarDays },
  ];
  return (
    <>
      <header className={`site-header ${isHome ? "home-header" : ""}`}>
        <div className="header-inner">
          <Link href={`/${locale}`} className="brand">
            <Image
              src="/assets/icons/logo-mark.svg"
              width={42}
              height={42}
              alt=""
            />
            <span>
              {c.brand}
              <small>GACHI JEJU</small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label={c.menu}>
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={`/${locale}/${href}`}
                className={path.includes("/" + href) ? "active" : ""}
              >
                {label}
                {href === "saved" && store.savedIds.length > 0 ? (
                  <span className="count-dot">{store.savedIds.length}</span>
                ) : null}
              </Link>
            ))}
          </nav>
          <div className="header-actions">
            <label className="language-control">
              <Globe2 size={17} />
              <span className="sr-only">{c.language}</span>
              <select
                value={locale}
                onChange={(e) =>
                  router.push(
                    path.replace(
                      /^\/(ko|en|zh|ja)(?=\/|$)/,
                      "/" + e.target.value,
                    ),
                  )
                }
              >
                <option value="ko">한국어</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
              </select>
            </label>
            <button
              className="icon-button theme-button"
              onClick={toggleTheme}
              aria-label={c.theme}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Link className="header-start" href={`/${locale}/plan`}>
              {d.start}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </header>
      {store.storageError ? (
        <div className="storage-notice" role="status">
          {tripMessages[locale].storageUnavailable}
        </div>
      ) : null}
      {children}
      <footer className="site-footer">
        <div className="footer-landscape" aria-hidden="true" />
        <div>
          <span className="footer-brand">
            GACHI JEJU<span>{c.brand}</span>
          </span>
          <p>{d.footer}</p>
        </div>
        <div className="footer-links">
          <Link href={`/${locale}/about`}>
            {c.about}
            <ArrowUpRight size={14} />
          </Link>
          <Link href={`/${locale}/privacy`}>{c.privacy}</Link>
          <Link href={`/${locale}/login`}>{c.login}</Link>
        </div>
        <small>© 2026 GACHI JEJU</small>
      </footer>
      <nav className="mobile-nav" aria-label={c.menu}>
        {links.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={`/${locale}/${href}`}
            className={path.includes("/" + href) ? "active" : ""}
          >
            <Icon size={21} />
            <span>{label}</span>
            {href === "saved" && store.savedIds.length > 0 ? (
              <i>{store.savedIds.length}</i>
            ) : null}
          </Link>
        ))}
      </nav>
    </>
  );
}
