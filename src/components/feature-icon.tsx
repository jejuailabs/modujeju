import type { ReactNode, SVGProps } from "react";
import {
  Armchair,
  CircleParking,
  Footprints,
  Toilet,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey } from "@/lib/place-features";

export type FeatureIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & {
  feature: FeatureKey;
  size?: number | string;
};

type IconDefinition =
  | { kind: "lucide"; component: LucideIcon }
  | { kind: "custom" | "portrait"; paths: ReactNode };

const icons: Record<FeatureKey, IconDefinition> = {
  kids: {
    kind: "portrait",
    paths: (
      <g stroke="none">
        <circle cx="32" cy="32" r="31" fill="#FBE5D9" />
        <path d="M12 61c1-11 8-17 20-17s19 6 20 17" fill="#E78469" />
        <path d="m25 47 7 6 7-6" fill="#FFF8E9" />
        <ellipse cx="32" cy="28" rx="20" ry="22" fill="#674634" />
        <circle cx="14" cy="31" r="5" fill="#F5C6A0" />
        <circle cx="50" cy="31" r="5" fill="#F5C6A0" />
        <path
          d="M15 24c0-11 34-11 34 0v10c0 11-8 17-17 17s-17-6-17-17Z"
          fill="#FFDAB5"
        />
        <path
          d="M13 26c0-13 7-20 19-20 13 0 20 8 20 20-9-1-15-5-17-11-4 7-11 11-22 11Z"
          fill="#674634"
        />
        <path
          d="M23 12c3-3 8-4 12-3"
          fill="none"
          stroke="#93654A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <ellipse cx="21" cy="37" rx="4" ry="2.5" fill="#EEA28F" />
        <ellipse cx="43" cy="37" rx="4" ry="2.5" fill="#EEA28F" />
        <ellipse cx="25" cy="32" rx="1.7" ry="2.2" fill="#493D34" />
        <ellipse cx="39" cy="32" rx="1.7" ry="2.2" fill="#493D34" />
        <path
          d="M27 40c3 3 7 3 10 0"
          fill="none"
          stroke="#A45749"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </g>
    ),
  },
  pet: {
    kind: "portrait",
    paths: (
      <g stroke="none">
        <circle cx="32" cy="32" r="31" fill="#FFF0CE" />
        <path d="M15 61c1-11 6-17 17-17s16 6 17 17" fill="#DDA65D" />
        <path d="M20 47h24v8H20Z" fill="#477262" />
        <circle cx="32" cy="55" r="4" fill="#F6CE73" />
        <path
          d="M21 13C10 9 5 18 4 29 3 39 5 45 10 45c7 0 11-17 14-24Zm22 0c11-4 16 5 17 16 1 10-1 16-6 16-7 0-11-17-14-24Z"
          fill="#B87F43"
        />
        <path
          d="M15 28c0-14 7-20 17-20s17 6 17 20v8c0 10-7 17-17 17s-17-7-17-17Z"
          fill="#F6CF8F"
        />
        <path
          d="M31 10c-5 7-5 17-2 23-8 0-12 5-12 10 3 7 8 10 15 10s12-3 15-10c0-5-4-10-12-10 3-6 3-16-2-23Z"
          fill="#FFF9ED"
        />
        <ellipse cx="24" cy="29" rx="2" ry="2.5" fill="#493D34" />
        <ellipse cx="40" cy="29" rx="2" ry="2.5" fill="#493D34" />
        <path d="M27 36c0-3 10-3 10 0 0 2-3 4-5 4s-5-2-5-4Z" fill="#493D34" />
        <path d="M28 43h8v4a4 4 0 0 1-8 0Z" fill="#E79388" />
        <path
          d="M32 40v2m0 0c-2 4-6 3-8 1m8-1c2 4 6 3 8 1"
          fill="none"
          stroke="#755D45"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </g>
    ),
  },
  senior: {
    kind: "portrait",
    paths: (
      <g stroke="none">
        <circle cx="32" cy="32" r="31" fill="#E4EEDC" />
        <path d="M11 61c2-11 9-17 21-17s19 6 21 17" fill="#638874" />
        <path d="m25 46 7 6 7-6-2 15H27Z" fill="#FFF8E9" />
        <path d="M12 29c-2-15 6-24 20-24 15 0 23 10 20 25" fill="#A9B3AD" />
        <circle cx="14" cy="33" r="5" fill="#EDBD9D" />
        <circle cx="50" cy="33" r="5" fill="#EDBD9D" />
        <path
          d="M15 24c0-11 34-11 34 0v11c0 10-8 17-17 17s-17-7-17-17Z"
          fill="#F8D1AE"
        />
        <path
          d="M12 27c0-14 7-22 20-22 13 0 21 8 20 22-6-1-9-5-10-10-7 6-16 6-24 3-1 4-3 6-6 7Z"
          fill="#D4DBD3"
        />
        <path
          d="M21 13c5-5 13-6 20-1"
          fill="none"
          stroke="#F1F4EB"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <ellipse cx="21" cy="39" rx="3.5" ry="2" fill="#E7A28D" />
        <ellipse cx="43" cy="39" rx="3.5" ry="2" fill="#E7A28D" />
        <g fill="none" stroke="#4A5B51" strokeWidth="1.8">
          <rect
            x="17"
            y="27"
            width="12"
            height="10"
            rx="4"
            fill="#FFF9ED"
            fillOpacity="0.35"
          />
          <rect
            x="35"
            y="27"
            width="12"
            height="10"
            rx="4"
            fill="#FFF9ED"
            fillOpacity="0.35"
          />
          <path d="M29 31h6m-21-2 3 1m30 0 3-1" />
        </g>
        <path
          d="M21 32h4m14 0h4"
          fill="none"
          stroke="#493D34"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M27 43c3 3 7 3 10 0"
          fill="none"
          stroke="#A46E55"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="m24 40-1 1m17-1 1 1"
          fill="none"
          stroke="#CB9573"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </g>
    ),
  },
  highChair: {
    kind: "custom",
    paths: (
      <>
        <path d="M7 9V4a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5" />
        <path d="M5 9h14a1 1 0 0 1 0 2H7v3h9v-3" />
        <path d="m8 14-2 7m9-7 3 7M7 18h10" />
      </>
    ),
  },
  floorSeating: {
    kind: "custom",
    paths: (
      <>
        <rect x="5" y="9" width="14" height="3" rx="1" />
        <path d="M8 12v5m8-5v5M2 21h20" />
        <rect x="2" y="17" width="5" height="3" rx="1" />
        <rect x="17" y="17" width="5" height="3" rx="1" />
      </>
    ),
  },
  groundFloor: {
    kind: "custom",
    paths: (
      <>
        <path d="m3 9 9-6 9 6M5 8v13h14V8M2 21h20" />
        <path d="M8 21v-8h5v8m2-11 1.5-1v5M15 14h3" />
      </>
    ),
  },
  stroller: {
    kind: "custom",
    paths: (
      <>
        <path d="M12 3a7 7 0 0 1 7 7h-7V3Z" />
        <path d="M5 10h15a7 7 0 0 1-7 7h-1a7 7 0 0 1-7-7Zm0 0L4 6H2" />
        <path d="m9 17-1 2m8-2 1 2" />
        <circle cx="7" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
      </>
    ),
  },
  stepFree: {
    kind: "custom",
    paths: (
      <>
        <path d="M3 20h18V9L3 20Z" />
        <path d="m5 12 10-6m-4-1 4 1-1 4" />
      </>
    ),
  },
  tableSeating: { kind: "lucide", component: Armchair },
  parking: { kind: "lucide", component: CircleParking },
  toilet: { kind: "lucide", component: Toilet },
  shortWalk: { kind: "lucide", component: Footprints },
};

/** Decorative beside a visible feature label; pass aria-hidden=false and aria-label when standalone. */
export function FeatureIcon({
  feature,
  size = 24,
  strokeWidth = 1.75,
  "aria-hidden": ariaHidden = true,
  ...props
}: FeatureIconProps) {
  const icon = icons[feature];
  if (icon.kind === "lucide") {
    const Icon = icon.component;
    return (
      <Icon
        size={size}
        strokeWidth={strokeWidth}
        aria-hidden={ariaHidden}
        focusable="false"
        {...props}
      />
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={icon.kind === "portrait" ? "0 0 64 64" : "0 0 24 24"}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={ariaHidden}
      focusable="false"
      {...props}
    >
      {icon.paths}
    </svg>
  );
}
