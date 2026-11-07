import "server-only";
import { getAdminServices } from "@/lib/firebase/admin";
import type { PlaceType, Region } from "@/lib/types";
import { assertVisitJejuEnabled } from "./client";
import { normalizeVisitJejuRecord } from "./normalize";
import { ServiceError } from "@/lib/server/errors";
import type { NextRequest } from "next/server";
import { requireSession } from "@/lib/server/session";
import { assertSameOrigin } from "@/lib/server/http";

/** Import never publishes and never overwrites existing editorial verification. */
export async function importVisitJejuDraft(
  raw: unknown,
  mapping: { region: Region; type: PlaceType },
  request: NextRequest,
) {
  assertSameOrigin(request);
  assertVisitJejuEnabled();
  const actor = await requireSession(request, true);
  const actorUid = actor.uid;
  const { db } = getAdminServices();
  const now = new Date().toISOString();
  const draft = normalizeVisitJejuRecord(raw, { ...mapping, retrievedAt: now });
  const ref = db.collection("places").doc(draft.place.id);
  const audit = db.collection("auditLogs").doc();
  await db.runTransaction(async (tx) => {
    if ((await tx.get(ref)).exists) throw new ServiceError("PLACE_EXISTS", 409);
    tx.create(ref, {
      ...draft.place,
      status: "draft",
      imageRights: { status: "placeholder", credit: "", license: "" },
      candidatePhotoUrl: draft.candidatePhotoUrl,
      reviewWarnings: draft.reviewWarnings,
      createdAt: now,
      updatedAt: now,
      createdBy: actorUid,
      updatedBy: actorUid,
    });
    tx.create(audit, {
      action: "visitjeju.import",
      placeId: ref.id,
      actor: actorUid,
      at: now,
    });
  });
  return { id: ref.id, status: "draft" as const };
}
