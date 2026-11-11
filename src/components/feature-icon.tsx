import type { CSSProperties, ReactNode, SVGProps } from "react";
import Image from "next/image";
import {
  Accessibility,
  Armchair,
  Baby,
  BedSingle,
  Bone,
  CircleParking,
  Dog,
  Fence,
  Footprints,
  HeartHandshake,
  Milk,
  PawPrint,
  SquareParking,
  Toilet,
  ToyBrick,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey } from "@/lib/place-features";
import { companionImages } from "@/messages/ui";

export type FeatureIconProps = Pick<SVGProps<SVGSVGElement>, "className" | "style" | "aria-hidden" | "aria-label"> & {
  feature: FeatureKey;
  size?: number | string;
  strokeWidth?: number | string;
};

type IconDefinition =
  | { kind: "lucide"; component: LucideIcon }
  | { kind: "custom"; paths: ReactNode }
  | { kind: "artwork"; image: string };

const icons: Record<FeatureKey, IconDefinition> = {
  kids: { kind: "artwork", image: companionImages.kids },
  pet: { kind: "artwork", image: companionImages.pet },
  senior: { kind: "artwork", image: companionImages.senior },
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
  strollerRental: {
    kind: "custom",
    paths: (
      <>
        <path d="M10 4a6 6 0 0 1 6 6h-6V4Z" />
        <path d="M4 10h13a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6Zm0 0L3 7H1" />
        <circle cx="6" cy="19" r="1.5" />
        <circle cx="15" cy="19" r="1.5" />
        <path d="M19 3v6m0 0 2-2m-2 2-2-2" />
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
  kidsTableware: { kind: "lucide", component: Utensils },
  nursingRoom: { kind: "lucide", component: Milk },
  diaperTable: { kind: "lucide", component: Baby },
  kidsPlay: { kind: "lucide", component: ToyBrick },
  babyBed: { kind: "lucide", component: BedSingle },
  petWelcome: { kind: "lucide", component: HeartHandshake },
  petLargeDog: { kind: "lucide", component: Dog },
  petAmenity: { kind: "lucide", component: Bone },
  petPlayground: { kind: "lucide", component: Fence },
  petRoom: { kind: "lucide", component: PawPrint },
  ramp: {
    kind: "custom",
    paths: (
      <>
        <path d="M2 20h20M4 20 20 11v9" />
        <circle cx="9" cy="6" r="1.5" />
        <path d="M9 8v4h3l1.5 3" />
      </>
    ),
  },
  elevator: {
    kind: "custom",
    paths: (
      <>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M12 3v18M7.5 10 9 8l1.5 2m3 4 1.5 2 1.5-2" />
      </>
    ),
  },
  accessibleToilet: { kind: "lucide", component: Accessibility },
  accessibleParking: { kind: "lucide", component: SquareParking },
  wheelchairRental: {
    kind: "custom",
    paths: (
      <>
        <circle cx="10" cy="4" r="1.5" />
        <path d="M10 7v6h5l2 5h2" />
        <path d="M7 10.5a5.5 5.5 0 1 0 8 6.2" />
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
  if (icon.kind === "artwork") {
    return (
      <Image
        src={`/assets/images/${icon.image}.webp`}
        width={128}
        height={128}
        alt={ariaHidden === true || ariaHidden === "true" ? "" : (props["aria-label"] ?? "")}
        unoptimized
        draggable={false}
        aria-hidden={ariaHidden}
        {...props}
        className={`companion-artwork${props.className ? ` ${props.className}` : ""}`}
        style={{
          "--companion-size": typeof size === "number" ? `${size}px` : size,
          ...props.style,
        } as CSSProperties}
      />
    );
  }
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
