import Link from "next/link";
import { ClipboardCheck, MessageSquareText, NotebookPen, Video } from "lucide-react";
import type { Locale } from "@/lib/types";
import { storyCopy, storyTabs, type StoryTab } from "@/messages/stories";
import { PageIntro } from "./common";
import styles from "./stories-view.module.css";

const tabIcons = { reviews: MessageSquareText, visits: NotebookPen, videos: Video } as const;

/** Field notes hub: visitor reviews, staff visit reports and visit videos. Content is not wired yet. */
export function StoriesView({ locale, tab }: { locale: Locale; tab: StoryTab }) {
  const t = storyCopy(locale);
  const EmptyIcon = tabIcons[tab];
  return (
    <main className="page info-page">
      <p className="eyebrow">{t.eyebrow}</p>
      <PageIntro locale={locale} title={t.title} description={t.intro} />
      <nav className={styles.tabs} aria-label={t.title}>
        {storyTabs.map((key) => {
          const Icon = tabIcons[key];
          return (
            <Link
              key={key}
              href={`/${locale}/stories?tab=${key}`}
              className={key === tab ? `${styles.tab} ${styles.active}` : styles.tab}
              aria-current={key === tab ? "page" : undefined}
            >
              <Icon size={18} aria-hidden="true" />
              {t.tabs[key]}
            </Link>
          );
        })}
      </nav>
      <p className={styles.tabIntro}>{t.tabIntro[tab]}</p>
      <section className="empty-state" aria-live="polite">
        <EmptyIcon size={40} aria-hidden="true" />
        <h2>{t.emptyTitle[tab]}</h2>
        <p>{t.emptyBody[tab]}</p>
      </section>
      {tab !== "reviews" && (
        <section className={`panel ${styles.checks}`}>
          <h2>
            <ClipboardCheck size={20} aria-hidden="true" />
            {t.checksTitle}
          </h2>
          <ul>
            {t.checks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
