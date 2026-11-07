import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminServices } from "@/lib/firebase/admin";
import { assertSameOrigin, errorResponse, readJson } from "@/lib/server/http";
import { ServiceError } from "@/lib/server/errors";
import { enforceRateLimit, requestRateKey } from "@/lib/server/rate-limit";
import {
  requireSession,
  SESSION_COOKIE,
  SESSION_DURATION_MS,
} from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession(request);
    return NextResponse.json(
      {
        user: {
          uid: session.uid,
          email: session.email ?? null,
          admin: session.admin === true,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const { auth } = getAdminServices();
    enforceRateLimit(requestRateKey(request, "session"), 15, 60_000);
    const { idToken } = await readJson(
      request,
      z.object({ idToken: z.string().min(20).max(8192) }).strict(),
      10_240,
    );
    let claims;
    try {
      claims = await auth.verifyIdToken(idToken, true);
    } catch {
      throw new ServiceError("INVALID_TOKEN", 401);
    }
    const age = Date.now() / 1000 - claims.auth_time;
    if (!Number.isFinite(age) || age < -60 || age > 300)
      throw new ServiceError("RECENT_LOGIN_REQUIRED", 401);
    const value = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
    const response = NextResponse.json(
      { user: { uid: claims.uid, admin: claims.admin === true } },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(SESSION_COOKIE, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_MS / 1000,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
