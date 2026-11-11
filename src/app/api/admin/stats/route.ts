import { NextRequest } from "next/server";
import { getAdminServices } from "@/lib/firebase/admin";
import { requireSession } from "@/lib/server/session";
import { errorResponse, privateJson } from "@/lib/server/http";
import {
  countSignups,
  dailyDocId,
  dailySeries,
  lastDays,
  topSavedPlaces,
  topViewedPlaces,
  type DailyDoc,
} from "@/lib/server/stats";

export const runtime = "nodejs";

const MEMBER_CAP = 20_000;
const SAVED_SCAN_CAP = 5_000;
const DAYS = 14;

/** One failing metric must not hide the others; it reports null instead. */
async function safe<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireSession(request, true);
    const { auth, db } = getAdminServices();
    const now = new Date();
    const days = lastDays(now, DAYS);

    const dailyDocs = await safe(async () => {
      const refs = days.map((day) => db.collection("stats").doc(dailyDocId(day)));
      const snapshots = await db.getAll(...refs);
      return new Map<string, DailyDoc | undefined>(
        snapshots.map((snapshot, index) => [days[index], snapshot.data() as DailyDoc | undefined]),
      );
    });

    const members = await safe(async () => {
      const creationTimes: (string | undefined)[] = [];
      let pageToken: string | undefined;
      let truncated = false;
      do {
        const page = await auth.listUsers(1000, pageToken);
        for (const user of page.users) creationTimes.push(user.metadata.creationTime);
        pageToken = page.pageToken;
        if (creationTimes.length >= MEMBER_CAP) {
          truncated = Boolean(pageToken);
          break;
        }
      } while (pageToken);
      return { total: creationTimes.length, truncated, ...countSignups(creationTimes, now) };
    });

    const saved = await safe(async () => {
      const total = (await db.collectionGroup("saved").count().get()).data().count;
      const scan = await db.collectionGroup("saved").limit(SAVED_SCAN_CAP).get();
      return {
        total,
        scanTruncated: total > SAVED_SCAN_CAP,
        top: topSavedPlaces(scan.docs.map((doc) => doc.id)),
      };
    });

    const openReports = await safe(
      async () => (await db.collection("reports").where("status", "==", "open").count().get()).data().count,
    );
    const publishedPlaces = await safe(
      async () => (await db.collection("places").where("status", "==", "published").count().get()).data().count,
    );

    const series = dailyDocs ? dailySeries(days, dailyDocs) : null;
    return privateJson({
      generatedAt: now.toISOString(),
      members,
      views: series && {
        daily: series,
        today: series[series.length - 1].pageViews,
        total: series.reduce((sum, entry) => sum + entry.pageViews, 0),
        uniqueToday: series[series.length - 1].uniqueVisitors,
        topPlaces: topViewedPlaces(dailyDocs!.values()),
      },
      saved,
      openReports,
      publishedPlaces,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
