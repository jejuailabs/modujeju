import { InfoView } from "@/components/info-view";
import type { Locale } from "@/lib/types";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  return <InfoView locale={(await params).locale} />;
}
