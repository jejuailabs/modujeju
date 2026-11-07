import { PlanView } from "@/components/plan-view";
import type { Locale } from "@/lib/types";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  return <PlanView locale={(await params).locale} />;
}
