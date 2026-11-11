import { StoriesView } from "@/components/stories-view";
import type { Locale } from "@/lib/types";
import { storyTabs, type StoryTab } from "@/messages/stories";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  const { tab } = await searchParams;
  const current: StoryTab = storyTabs.includes(tab as StoryTab) ? (tab as StoryTab) : "reviews";
  return <StoriesView locale={locale} tab={current} />;
}
