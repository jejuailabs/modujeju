"use client";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, SlidersHorizontal } from "lucide-react";
import type { Locale, Profile } from "@/lib/types";
import { placeTypes } from "@/lib/types";
import { copy } from "@/messages/ui";
import { useTravelStore } from "@/hooks/use-travel-store";
import { CompanionPicker, RegionPicker, TypePicker, PageIntro } from "./common";

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
    router = useRouter(),
    { profile } = useTravelStore();
  return (
    <main className="page plan-page">
      <PageIntro
        locale={locale}
        title={c.planTitle}
        description={c.planCopy}
        back=""
      />
      <ol className="progress-steps">
        {[c.step1, c.step2, c.step3].map((s, i) => (
          <li key={s} className={i === 1 ? "active" : ""}>
            <span>{i === 0 ? <Check size={16} /> : i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <section className="panel plan-panel">
        <div className="number-title">
          <span>01</span>
          <div>
            <h2>{c.withWho}</h2>
            <p>{c.multiple}</p>
          </div>
        </div>
        <CompanionPicker locale={locale} />
        <details className="need-details" open>
          <summary>
            <SlidersHorizontal size={17} />
            {c.details}
          </summary>
          <NeedFields locale={locale} />
        </details>
      </section>
      <section className="panel plan-panel">
        <div className="number-title">
          <span>02</span>
          <div>
            <h2>{c.where}</h2>
            <p>{c.allRegions}</p>
          </div>
        </div>
        <RegionPicker locale={locale} />
      </section>
      <section className="panel plan-panel">
        <div className="number-title">
          <span>03</span>
          <div>
            <h2>{c.what}</h2>
            <p>{c.allTypes}</p>
          </div>
        </div>
        <TypePicker locale={locale} />
        <details className="need-details">
          <summary>{c.budget}</summary>
          <p className="muted">{c.budgetCopy}</p>
          <BudgetFields locale={locale} />
        </details>
      </section>
      <div className="plan-action">
        {profile.companions.length === 0 && <p>{c.chooseOne}</p>}
        <button
          className="btn primary"
          disabled={!profile.companions.length}
          onClick={() => router.push(`/${locale}/results`)}
        >
          {c.findFit}
          <ArrowRight size={20} />
        </button>
      </div>
    </main>
  );
}
