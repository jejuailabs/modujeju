import { NextRequest } from "next/server";
import { getAdminServices } from "@/lib/firebase/admin";
import { requireSession } from "@/lib/server/session";
import {
  assertSameOrigin,
  errorResponse,
  privateJson,
  readJson,
} from "@/lib/server/http";
import {
  assertPublishingReady,
  placeWriteSchema,
  toPublicPlace,
} from "@/lib/server/place-schema";
import { ServiceError } from "@/lib/server/errors";
import { invalidatePublicPlaces } from "@/lib/server/public-places";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireSession(request, true);
    const { db } = getAdminServices();
    const snapshot = await db.collection("places").limit(250).get();
    return privateJson({
      places: snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          place: toPublicPlace(data),
          status: data.status,
          imageRights: data.imageRights,
          updatedAt: data.updatedAt,
          id: doc.id,
        };
      }),
      hasMore: snapshot.size === 250,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await requireSession(request, true);
    const input = await readJson(request, placeWriteSchema);
    assertPublishingReady(input);
    const { db } = getAdminServices();
    const ref = db.collection("places").doc(input.place.id);
    const audit = db.collection("auditLogs").doc();
    const now = new Date().toISOString();
    await db.runTransaction(async (tx) => {
      if ((await tx.get(ref)).exists)
        throw new ServiceError("PLACE_EXISTS", 409);
      tx.create(ref, {
        ...input.place,
        status: input.status,
        imageRights: input.imageRights,
        createdAt: now,
        updatedAt: now,
        createdBy: session.uid,
        updatedBy: session.uid,
      });
      tx.create(audit, {
        action: "place.create",
        placeId: ref.id,
        actor: session.uid,
        at: now,
        status: input.status,
      });
    });
    if (input.status === "published") invalidatePublicPlaces();
    return privateJson({ id: ref.id, updatedAt: now }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
