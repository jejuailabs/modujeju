import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminServices } from "@/lib/firebase/admin";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/server/http";
import { enforceRateLimit, requestRateKey } from "@/lib/server/rate-limit";
import { dailyDocId, isBotUserAgent, SLUG_PATTERN, seoulDay } from "@/lib/server/stats";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    kind: z.enum(["page", "place"]),
    placeSlug: z.string().regex(SLUG_PATTERN).optional(),
    /** True only for the browser's first view of the Seoul day. */
    newVisitor: z.boolean().optional(),
  })
  .strict()
  .refine((value) => value.kind === "place" || value.placeSlug === undefined);

/** Anonymous counters only: no user id, IP, path history or user agent is stored. */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    if (isBotUserAgent(request.headers.get("user-agent")))
      return new NextResponse(null, { status: 204 });
    const { db } = getAdminServices();
    enforceRateLimit(requestRateKey(request, "track"), 120, 60_000);
    const input = await readJson(request, bodySchema, 512);
    const update: Record<string, unknown> = { pageViews: FieldValue.increment(1) };
    if (input.newVisitor) update.uniqueVisitors = FieldValue.increment(1);
    if (input.kind === "place" && input.placeSlug)
      update.placeViews = { [input.placeSlug]: FieldValue.increment(1) };
    await db
      .collection("stats")
      .doc(dailyDocId(seoulDay(new Date())))
      .set(update, { merge: true });
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
