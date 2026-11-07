import { NextRequest } from "next/server";
import { z } from "zod";
import {
  assertSameOrigin,
  errorResponse,
  privateJson,
  readJson,
} from "@/lib/server/http";
import { requireSession } from "@/lib/server/session";
import { ServiceError } from "@/lib/server/errors";
import { fetchVisitJejuPage } from "@/lib/visitjeju/client";
import { importVisitJejuDraft } from "@/lib/visitjeju/import";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireSession(request, true);
    const input = await readJson(
      request,
      z
        .object({
          contentId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
          region: z.enum(["east", "west", "south", "north"]),
          type: z.enum([
            "restaurant",
            "cafe",
            "stay",
            "attraction",
            "experience",
            "walk",
          ]),
        })
        .strict(),
      2048,
    );
    const page = await fetchVisitJejuPage({
      contentId: input.contentId,
      locale: "ko",
    });
    const raw = page.items.find(
      (item) =>
        item &&
        typeof item === "object" &&
        "contentsid" in item &&
        item.contentsid === input.contentId,
    );
    if (!raw) throw new ServiceError("SOURCE_NOT_FOUND", 404);
    const result = await importVisitJejuDraft(raw, input, request);
    return privateJson(result, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
