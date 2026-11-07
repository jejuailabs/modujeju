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
  placeUpdateSchema,
} from "@/lib/server/place-schema";
import { ServiceError } from "@/lib/server/errors";
import { invalidatePublicPlaces } from "@/lib/server/public-places";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const session = await requireSession(request, true);
    const { id } = await context.params;
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id))
      throw new ServiceError("INVALID_ID", 400);
    const input = await readJson(request, placeUpdateSchema);
    if (input.place.id !== id) throw new ServiceError("ID_MISMATCH", 400);
    assertPublishingReady(input);
    const { db } = getAdminServices();
    const ref = db.collection("places").doc(id);
    const audit = db.collection("auditLogs").doc();
    const now = new Date().toISOString();
    const changedPublicData = await db.runTransaction(async (tx) => {
      const current = await tx.get(ref);
      if (!current.exists) throw new ServiceError("PLACE_NOT_FOUND", 404);
      if (current.data()?.updatedAt !== input.expectedUpdatedAt)
        throw new ServiceError("EDIT_CONFLICT", 409);
      tx.update(ref, {
        ...input.place,
        status: input.status,
        imageRights: input.imageRights,
        updatedAt: now,
        updatedBy: session.uid,
      });
      tx.create(audit, {
        action: "place.update",
        placeId: id,
        actor: session.uid,
        at: now,
        previousStatus: current.data()?.status ?? "draft",
        status: input.status,
      });
      return (
        current.data()?.status === "published" || input.status === "published"
      );
    });
    if (changedPublicData) invalidatePublicPlaces();
    return privateJson({ id, updatedAt: now });
  } catch (error) {
    return errorResponse(error);
  }
}
