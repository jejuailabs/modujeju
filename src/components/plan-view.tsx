"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import Image from "next/image";
import { designCopy } from "@/messages/design";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  SlidersHorizontal,
  Compass,
} from "lucide-react";
import type { Locale, Profile } from "@/lib/types";
import { placeTypes } from "@/lib/types";
import { copy } from "@/messages/ui";
import { useTravelStore } from "@/hooks/use-travel-store";
import { CompanionPicker, RegionPicker, TypePicker } from "./common";

export function NeedFields({ locale }: { locale: Locale }) {
  const { profile, setProfile } = useTravelStore(),
    c = copy(locale);
  const checks: {
    key: keyof Pick<
      Profile,
      "stroller" | "indoorPet" | "stepFree" | "shortWalk"
    >;
    show: boolean;
  }[] = [
    {
      key: "stroller",
      show: profile.companions.includes("kids") || profile.stroller,
    },
    { key: "indoorPet", show: profile.companions.includes("pet") },
    { key: "stepFree", show: true },
    { key: "shortWalk", show: true },
  ];
  return (
    <div className="needs-fields">
      <div className="field-row">
        {profile.companions.includes("kids") && (
          <label className="form-field">
            {c.childAge}
            <select
              value={profile.childAge ?? ""}
              onChange={(e) =>
                setProfile({
                  childAge:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
            >
              <option value="">{c.unspecified}</option>
              {Array.from({ length: 18 }, (_, n) => (
                <option value={n} key={n}>
                  {n} {c.ageUnit}
                </option>
              ))}
            </select>
          </label>
        )}
        {profile.companions.includes("pet") && (
          <label className="form-field">
            {c.dogWeight}
            <span className="input-unit">
              <input
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                placeholder={c.unspecified}
                value={profile.dogWeight ?? ""}
                onChange={(e) =>
                  setProfile({
                    dogWeight:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <span>kg</span>
            </span>
          </label>
        )}
      </div>
      <div className="check-grid">
        {checks
          .filter((x) => x.show)
          .map(({ key }) => (
            <label className="check-option" key={key}>
              <input
                type="checkbox"
                checked={profile[key]}
                onChange={(e) => setProfile({ [key]: e.target.checked })}
              />
              <span>{c[key]}</span>
            </label>
          ))}
      </div>
    </div>
  );
}
export function BudgetFields({ locale }: { locale: Locale }) {
  const { profile, setProfile } = useTravelStore(),
    c = copy(locale);
  return (
    <div className="budget-grid">
      {placeTypes
        .filter((t) => profile.types.length === 0 || profile.types.includes(t))
        .map((t) => (
          <label className="form-field" key={t}>
            {c[t]}
            <select
              value={profile.budgets[t] ?? ""}
              onChange={(e) => {
                const budgets = { ...profile.budgets };
                if (e.target.value === "") delete budgets[t];
                else budgets[t] = Number(e.target.value);
                setProfile({ budgets });
              }}
            >
              <option value="">{c.unlimited}</option>
              {(t === "stay"
                ? [50000, 100000, 150000, 200000, 300000]
                : [0, 5000, 10000, 20000, 30000, 50000]
              ).map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? c.free : "≤ ₩" + n.toLocaleString(locale)}
                </option>
              ))}
            </select>
          </label>
        ))}
    </div>
  );
}
export function PlanView({ locale }: { locale: Locale }) {
  const c = copy(locale),
    d = designCopy(locale),
    router = useRouter();
  const { profile } = useTravelStore();
  const [step, setStep] = useState(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const steps = [c.withWho, c.where, c.what];
  function moveStep(next: number) {
    setStep(next);
    requestAnimationFrame(() => titleRef.current?.focus());
  }
  return (
    <main className="page plan-page">
      <aside className="planner-story">
        <Image
          src="/assets/images/region-east.webp"
          alt={c.heroCaption}
          fill
          priority
          sizes="(max-width:800px) 100vw, 42vw"
        />
        <div className="planner-story-shade" />
        <div className="planner-story-copy">
          <span className="eyebrow light">MADE FOR YOUR PEOPLE</span>
          <h1>{d.planTitle}</h1>
          <p>{d.planNote}</p>
        </div>
        <div className="planner-preview">
          <Compass size={25} />
          <div>
            <small>{d.yourTrip}</small>
            <strong>
              {profile.companions.length
                ? profile.companions.map((id) => c[id]).join(" · ")
                : d.allWelcome}
            </strong>
            <span>
              {profile.regions.length
                ? profile.regions.map((id) => c[id]).join(" · ")
                : d.freeDirection}
            </span>
          </div>
        </div>
        <span className="hero-art-note">{c.illustration}</span>
      </aside>
      <div className="planner-workspace">
        <div className="planner-topline">
          <span>{d.journey}</span>
          <span>0{step + 1} / 03</span>
        </div>
        <ol className="planner-steps" aria-label={c.planTitle}>
          {[c.step1, d.regionStep, d.typeStep].map((label, i) => (
            <li
              key={label}
              className={i === step ? "active" : i < step ? "complete" : ""}
            >
              <button
                type="button"
                disabled={i > 0 && !profile.companions.length}
                aria-current={i === step ? "step" : undefined}
                onClick={() => moveStep(i)}
              >
                <span>{i < step ? <Check size={15} /> : `0${i + 1}`}</span>
                {label}
              </button>
            </li>
          ))}
        </ol>
        <section className="plan-panel" aria-labelledby="plan-step-title">
          <div className="number-title">
            <span>0{step + 1}</span>
            <div>
              <h2 id="plan-step-title" tabIndex={-1} ref={titleRef}>
                {steps[step]}
              </h2>
              <p>{[c.multiple, c.regionCopy, c.allTypes][step]}</p>
            </div>
          </div>
          {step === 0 && (
            <>
              <CompanionPicker locale={locale} />
              <details className="need-details" open>
                <summary>
                  <SlidersHorizontal size={17} />
                  {c.details}
                </summary>
                <NeedFields locale={locale} />
              </details>
            </>
          )}
          {step === 1 && (
            <>
              <RegionPicker locale={locale} />
              <p className="planner-help">
                {c.allRegions} · {c.multiple}
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <TypePicker locale={locale} />
              <details className="need-details" open>
                <summary>{c.budget}</summary>
                <p className="muted">{c.budgetCopy}</p>
                <BudgetFields locale={locale} />
              </details>
            </>
          )}
        </section>
        <div className="plan-action">
          {step > 0 ? (
            <button
              className="btn secondary"
              onClick={() => moveStep(step - 1)}
            >
              <ArrowLeft size={18} />
              {d.previous}
            </button>
          ) : (
            <span className="planner-help">
              {profile.companions.length === 0 ? c.chooseOne : c.heroBadge}
            </span>
          )}
          <button
            className="btn primary"
            disabled={!profile.companions.length}
            onClick={() =>
              step < 2 ? moveStep(step + 1) : router.push(`/${locale}/results`)
            }
          >
            {step < 2 ? d.next : c.findFit}
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
    </main>
  );
}
