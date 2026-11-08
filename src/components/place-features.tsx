"use client";
import {
  Check,
  HelpCircle,
  Minus,
  ExternalLink,
  CircleAlert,
  ChevronDown,
} from "lucide-react";
import type { Companion, Locale, Place } from "@/lib/types";
import { getPlaceFeatures, type FeatureStatus } from "@/lib/place-features";
import { featureUi } from "@/messages/feature-ui";
import { FeatureIcon } from "./feature-icon";
import { copy } from "@/messages/ui";

function FeatureState({ status }: { status: FeatureStatus }) {
  const Icon = {
    yes: Check,
    no: Minus,
    conditional: CircleAlert,
    unknown: HelpCircle,
  }[status];
  return <Icon size={11} strokeWidth={2} aria-hidden="true" />;
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
  const all = getPlaceFeatures(place).filter(
    (feature) => feature.status === "yes" || feature.status === "conditional",
  );
  const ui = featureUi(locale);
  const c = copy(locale);
  if (!all.length)
    return compact ? null : <p className="feature-empty">{ui.noConfirmed}</p>;
  const companionFeatures = all.filter((feature) =>
    ["kids", "pet", "senior"].includes(feature.key),
  );
  const amenities = all.filter(
    (feature) => !["kids", "pet", "senior"].includes(feature.key),
  );
  const rankedAmenities = [...amenities].sort((a, b) => {
    const order = { yes: 0, conditional: 1, unknown: 2, no: 3 };
    return order[a.status] - order[b.status];
  });
  if (compact)
    return (
      <div className="place-feature-summary" aria-label={ui.subtitle}>
        {companionFeatures.length > 0 && (
          <div className="companion-signals">
            {companionFeatures.map((feature) => (
              <div
                key={feature.key}
                className={`companion-signal companion-${feature.key} feature-${feature.status}`}
                title={feature.description[locale]}
              >
                <span className="signal-icon">
                  <FeatureIcon feature={feature.key} size={64} />
                  <i>
                    <FeatureState status={feature.status} />
                  </i>
                </span>
                <span>{c[feature.key as Companion]}</span>
                <small className="companion-status">{ui[feature.status]}</small>
              </div>
            ))}
          </div>
        )}
        {rankedAmenities.length > 0 && (
          <div className="amenity-signals">
            {rankedAmenities.map((feature) => (
              <span
                key={feature.key}
                className={`amenity-signal feature-${feature.status}`}
                title={feature.description[locale]}
              >
                <FeatureIcon feature={feature.key} size={17} />
                <span>
                  {feature.label[locale]}
                  <small>{ui[feature.status]}</small>
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  return (
    <section
      className="feature-overview"
      aria-labelledby="feature-overview-title"
    >
      <div className="feature-section-title">
        <div>
          <span className="eyebrow">MADE FOR YOUR PEOPLE</span>
          <h2 id="feature-overview-title">{ui.title}</h2>
        </div>
      </div>
      <p className="feature-legend">
        <span className="legend-dot yes" />
        {ui.yes}
        <span className="legend-dot conditional" />
        {ui.conditional}
      </p>
      {[companionFeatures, amenities].map((group, groupIndex) => {
        if (!group.length) return null;
        return (
          <div
            key={groupIndex}
            className={
              groupIndex === 0 ? "companion-detail-grid" : "feature-detail-grid"
            }
          >
            {group.map((feature) => (
              <details
                className={`feature-tile feature-${feature.status} ${groupIndex === 0 ? `companion-tile companion-${feature.key}` : ""}`}
                key={feature.key}
              >
                <summary>
                  <ChevronDown
                    className="feature-expand"
                    size={13}
                    aria-hidden="true"
                  />
                  <span className="feature-tile-icon">
                    <FeatureIcon
                      feature={feature.key}
                      size={groupIndex === 0 ? 96 : 36}
                    />
                  </span>
                  <span className="feature-tile-label">
                    {groupIndex === 0
                      ? c[feature.key as Companion]
                      : feature.label[locale]}
                    {groupIndex === 0 && (
                      <span className="companion-context">
                        {feature.label[locale]}
                      </span>
                    )}
                    <small
                      className={
                        groupIndex === 0 ? "companion-status" : undefined
                      }
                    >
                      <FeatureState status={feature.status} />
                      {ui[feature.status]}
                    </small>
                  </span>
                </summary>
                <div className="feature-evidence">
                  <p>{feature.description[locale]}</p>
                  {feature.evidence
                    .filter(
                      (evidence, index, items) =>
                        items.findIndex(
                          (item) =>
                            item.sourceUrl === evidence.sourceUrl &&
                            item.checkedAt === evidence.checkedAt,
                        ) === index,
                    )
                    .map((evidence, index) => (
                      <div key={index}>
                        <small>
                          {evidence.checkedAt
                            ? `${ui.date} ${evidence.checkedAt}`
                            : ui.noDate}
                        </small>
                        {evidence.sourceUrl &&
                          /^https:\/\//.test(evidence.sourceUrl) && (
                            <a
                              className="text-link"
                              href={evidence.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {ui.evidence}
                              <ExternalLink size={12} />
                            </a>
                          )}
                      </div>
                    ))}
                </div>
              </details>
            ))}
          </div>
        );
      })}
      <p className="feature-footnote">{ui.note}</p>
    </section>
  );
}
