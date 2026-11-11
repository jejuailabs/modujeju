"use client";
import {
  Ban,
  Check,
  HelpCircle,
  Minus,
  ExternalLink,
  CircleAlert,
  ChevronDown,
} from "lucide-react";
import type { Locale, Place } from "@/lib/types";
import { visibleSourceLink } from "@/lib/external-link";
import {
  getCompanionFeatureRows,
  type CompanionFeatureRow,
  type FeatureStatus,
  type PlaceFeature,
} from "@/lib/place-features";
import { featureUi } from "@/messages/feature-ui";
import { quantityShort } from "@/messages/features";
import { FeatureIcon } from "./feature-icon";
import { copy } from "@/messages/ui";

function FeatureState({ status, size = 11 }: { status: FeatureStatus; size?: number }) {
  const Icon = {
    yes: Check,
    no: Minus,
    conditional: CircleAlert,
    unknown: HelpCircle,
  }[status];
  return <Icon size={size} strokeWidth={2} aria-hidden="true" />;
}

function chipLabel(feature: PlaceFeature, locale: Locale) {
  return feature.quantity
    ? `${feature.label[locale]} ${quantityShort(feature.quantity)[locale]}`
    : feature.label[locale];
}

/** Latest operator check date among the facilities shown on the card. */
function latestCheck(features: PlaceFeature[]): string | null {
  const dates = features
    .flatMap((feature) => feature.evidence.map((evidence) => evidence.checkedAt))
    .filter((value): value is string => !!value)
    .sort();
  return dates.at(-1) ?? null;
}

function FacilityChip({ feature, locale }: { feature: PlaceFeature; locale: Locale }) {
  const ui = featureUi(locale);
  return (
    <li className={`facility-chip feature-${feature.status}`} title={feature.description[locale]}>
      <FeatureIcon feature={feature.key} size={20} />
      <span>{chipLabel(feature, locale)}</span>
      {feature.status === "conditional" && <small>{ui.conditional}</small>}
    </li>
  );
}

function RowHead({ row, locale, size }: { row: CompanionFeatureRow; locale: Locale; size: number }) {
  const ui = featureUi(locale);
  const c = copy(locale);
  return (
    <div className="companion-row-head">
      <FeatureIcon feature={row.companion} size={size} />
      <strong>{c[row.companion]}</strong>
      <small className={`companion-status feature-${row.status}`}>
        <FeatureState status={row.status} />
        {ui.admission[row.status]}
      </small>
    </div>
  );
}

function Restrictions({ locale, restricted }: { locale: Locale; restricted: ReturnType<typeof getCompanionFeatureRows>["restricted"] }) {
  const ui = featureUi(locale);
  if (!restricted.length) return null;
  return (
    <ul className="restriction-chips">
      {restricted.map((companion) => (
        <li key={companion} className="restriction-chip">
          <Ban size={18} aria-hidden="true" />
          {ui.restricted[companion]}
        </li>
      ))}
    </ul>
  );
}

function Evidence({ feature, locale }: { feature: PlaceFeature; locale: Locale }) {
  const ui = featureUi(locale);
  const unique = feature.evidence.filter(
    (evidence, index, items) =>
      items.findIndex(
        (item) => item.sourceUrl === evidence.sourceUrl && item.checkedAt === evidence.checkedAt,
      ) === index,
  );
  return (
    <div className="feature-evidence">
      <p>{feature.description[locale]}</p>
      {unique.map((evidence, index) => (
        <div key={index}>
          {evidence.kind && <span className={`evidence-kind evidence-${evidence.kind}`}>{ui.sourceKind[evidence.kind]}</span>}
          <small>{evidence.checkedAt ? `${ui.date} ${evidence.checkedAt}` : ui.noDate}</small>
          {evidence.publishedAt && <small>{`${ui.published} ${evidence.publishedAt}`}</small>}
          {evidence.quote && <q className="evidence-quote">{evidence.quote}</q>}
          {visibleSourceLink(evidence.sourceUrl) && (
            <a className="text-link" href={visibleSourceLink(evidence.sourceUrl)!} target="_blank" rel="noopener noreferrer">
              {ui.evidence}
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function FeatureTile({ feature, locale }: { feature: PlaceFeature; locale: Locale }) {
  const ui = featureUi(locale);
  return (
    <details className={`feature-tile feature-${feature.status}`}>
      <summary>
        <ChevronDown className="feature-expand" size={13} aria-hidden="true" />
        <span className="feature-tile-icon">
          <FeatureIcon feature={feature.key} size={36} />
        </span>
        <span className="feature-tile-label">
          {chipLabel(feature, locale)}
          <small>
            <FeatureState status={feature.status} />
            {ui[feature.status]}
          </small>
        </span>
      </summary>
      <Evidence feature={feature} locale={locale} />
    </details>
  );
}

export function PlaceFeatures({
  place,
  locale,
  compact = false,
}: {
  place: Place;
  locale: Locale;
  compact?: boolean;
}) {
  const { rows, restricted, common } = getCompanionFeatureRows(place);
  const ui = featureUi(locale);
  const shown =[...rows.flatMap((row) => row.features), ...common];

  if (compact) {
    if (!rows.length && !restricted.length && !common.length) return null;
    const checked = latestCheck(shown);
    return (
      <div className="place-feature-summary" aria-label={ui.subtitle}>
        {rows.map((row) => (
          <div key={row.companion} className={`companion-row companion-${row.companion}`} title={row.description[locale]}>
            <RowHead row={row} locale={locale} size={40} />
            {(row.highlight || row.features.length > 0) && (
              <ul className="facility-chips">
                {row.highlight && (
                  <li className={`facility-chip feature-${row.highlight === "indoor" ? "yes" : "conditional"}`}>
                    <FeatureIcon feature="pet" size={20} />
                    <span>{ui[row.highlight]}</span>
                  </li>
                )}
                {row.features.map((feature) => (
                  <FacilityChip key={feature.key} feature={feature} locale={locale} />
                ))}
              </ul>
            )}
          </div>
        ))}
        {common.length > 0 && (
          <ul className="facility-chips common-chips" aria-label={ui.commonFacilities}>
            {common.map((feature) => (
              <FacilityChip key={feature.key} feature={feature} locale={locale} />
            ))}
          </ul>
        )}
        <Restrictions locale={locale} restricted={restricted} />
        {checked && <p className="facility-checked">{`${ui.facilitiesChecked} ${checked}`}</p>}
      </div>
    );
  }

  return (
    <section className="feature-overview" aria-labelledby="feature-overview-title">
      <div className="feature-section-title">
        <div>
          <span className="eyebrow">MADE FOR YOUR PEOPLE</span>
          <h2 id="feature-overview-title">{ui.title}</h2>
        </div>
      </div>
      {!rows.length && !restricted.length && !common.length ? (
        <p className="feature-empty">{ui.noConfirmed}</p>
      ) : (
        <>
          <p className="feature-legend">
            <span className="legend-dot yes" />
            {ui.yes}
            <span className="legend-dot conditional" />
            {ui.conditional}
          </p>
          <Restrictions locale={locale} restricted={restricted} />
          {rows.map((row) => (
            <div key={row.companion} className={`companion-section companion-${row.companion}`}>
              <details className={`feature-tile companion-tile companion-${row.companion} feature-${row.status}`}>
                <summary>
                  <ChevronDown className="feature-expand" size={13} aria-hidden="true" />
                  <RowHead row={row} locale={locale} size={64} />
                  {row.highlight && <span className="companion-context">{ui[row.highlight]}</span>}
                </summary>
                <div className="feature-evidence">
                  <p>{row.description[locale]}</p>
                </div>
              </details>
              {row.features.length > 0 && (
                <div className="feature-detail-grid">
                  {row.features.map((feature) => (
                    <FeatureTile key={feature.key} feature={feature} locale={locale} />
                  ))}
                </div>
              )}
            </div>
          ))}
          {common.length > 0 && (
            <div className="companion-section">
              <h3 className="common-heading">{ui.commonFacilities}</h3>
              <div className="feature-detail-grid">
                {common.map((feature) => (
                  <FeatureTile key={feature.key} feature={feature} locale={locale} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
      <p className="feature-footnote">{ui.note}</p>
    </section>
  );
}
