import { AccountView } from "@/components/account-view";
import type { Locale } from "@/lib/types";
export default async function Page({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  return <AccountView locale={(await params).locale} />;
}
