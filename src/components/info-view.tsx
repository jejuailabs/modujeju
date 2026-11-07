import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  HeartHandshake,
  ShieldCheck,
  Compass,
} from "lucide-react";
import type { Locale } from "@/lib/types";
import { copy } from "@/messages/ui";
import { detailCopy } from "@/messages/detail";
import { PageIntro } from "./common";

export function InfoView({
  locale,
  privacy = false,
}: {
  locale: Locale;
  privacy?: boolean;
}) {
  const c = copy(locale);
  const t = detailCopy(locale);
  const sections = privacy
    ? [
        { title: t.privacyLocalTitle, body: t.privacyLocalBody },
        { title: t.privacyCloudTitle, body: t.privacyCloudBody },
        { title: t.privacyRemoveTitle, body: t.privacyRemoveBody },
        { title: t.privacyReportTitle, body: t.privacyReportBody },
      ]
    : [
        {
          title: t.allCompanionsTitle,
          body: t.allCompanionsBody,
          icon: HeartHandshake,
        },
        { title: c.trustTitle, body: c.trustCopy, icon: ShieldCheck },
        { title: t.controlTitle, body: t.controlBody, icon: Compass },
      ];

  return (
    <main className="page info-page">
      <p className="eyebrow">{privacy ? t.privacyEyebrow : t.aboutEyebrow}</p>
      <PageIntro
        locale={locale}
        title={privacy ? c.privacy : c.aboutTitle}
        description={privacy ? t.privacyIntro : c.aboutCopy}
      />
      {!privacy && (
        <div className="info-hero">
          <Image
            src="/assets/images/header-coast.webp"
            alt={c.heroCaption}
            width={2172}
            height={724}
            sizes="(max-width: 800px) 100vw, 1100px"
          />
          <p>{c.illustration}</p>
        </div>
      )}
      <div className={privacy ? "info-sections" : "info-grid"}>
        {sections.map((section) => {
          const Icon = "icon" in section ? section.icon : null;
          return (
            <section className="panel" key={section.title}>
              {Icon && <Icon size={28} aria-hidden="true" />}
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </section>
          );
        })}
      </div>
      {!privacy && (
        <>
          <p className="notice">{t.demoAbout}</p>
          <Link href={`/${locale}/plan`} className="btn primary">
            {c.findFit}
            <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </>
      )}
    </main>
  );
}
