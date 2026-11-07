import type { ReactNode, SVGProps } from "react";
import {
  Accessibility,
  Armchair,
  Baby,
  CircleParking,
  Dog,
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
  | { kind: "custom"; paths: ReactNode };

const icons: Record<FeatureKey, IconDefinition> = {
  kids: { kind: "lucide", component: Baby },
  pet: { kind: "lucide", component: Dog },
  senior: { kind: "lucide", component: Accessibility },
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
      viewBox="0 0 24 24"
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
