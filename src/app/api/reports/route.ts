import { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { getAdminServices } from "@/lib/firebase/admin";
import {
  assertSameOrigin,
  errorResponse,
  privateJson,
  readJson,
} from "@/lib/server/http";
import { enforceRateLimit, requestRateKey } from "@/lib/server/rate-limit";
import { ServiceError } from "@/lib/server/errors";

export const runtime = "nodejs";
const reportSchema = z
  .object({
    placeId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    category: z.enum(["entry", "operation", "facility", "closed", "other"]),
    message: z.string().trim().min(5).max(500),
    locale: z.enum(["ko", "en", "zh", "ja"]).default("ko"),
  })
  .strict();

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const { db } = getAdminServices();
    enforceRateLimit(requestRateKey(request, "report"), 5, 60_000);
    const input = await readJson(request, reportSchema, 4096);
    const place = await db.collection("places").doc(input.placeId).get();
    if (!place.exists || place.data()?.status !== "published")
      throw new ServiceError("PLACE_NOT_FOUND", 404);
    const doc = await db
      .collection("reports")
      .add({
        ...input,
        status: "open",
        createdAt: FieldValue.serverTimestamp(),
      });
    return privateJson({ id: doc.id, status: "open" }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
