import { NextRequest } from "next/server";
import { z } from "zod";
import { getAdminServices } from "@/lib/firebase/admin";
import { requireSession } from "@/lib/server/session";
import {
  assertSameOrigin,
  errorResponse,
  privateJson,
  readJson,
} from "@/lib/server/http";
import { ServiceError } from "@/lib/server/errors";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireSession(request, true);
    const { db } = getAdminServices();
    const snapshot = await db
      .collection("reports")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    return privateJson({
      reports: snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          placeId: data.placeId,
          category: data.category,
          message: data.message,
          locale: data.locale,
          status: data.status,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
        };
      }),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const session = await requireSession(request, true);
    const input = await readJson(
      request,
      z
        .object({
          id: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
          status: z.enum(["open", "inProgress", "applied", "rejected"]),
        })
        .strict(),
      2048,
    );
    const { db } = getAdminServices();
    const ref = db.collection("reports").doc(input.id);
    const audit = db.collection("auditLogs").doc();
    const now = new Date().toISOString();
    await db.runTransaction(async (tx) => {
      if (!(await tx.get(ref)).exists)
        throw new ServiceError("REPORT_NOT_FOUND", 404);
      tx.update(ref, {
        status: input.status,
        updatedAt: now,
        updatedBy: session.uid,
      });
      tx.create(audit, {
        action: "report.update",
        reportId: input.id,
        actor: session.uid,
        at: now,
        status: input.status,
      });
    });
    return privateJson({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
