import type { Metadata } from "next";
import type { Locale } from "@/lib/types";
import { AdminView } from "@/components/admin-view";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  return <AdminView locale={(await params).locale} />;
}
