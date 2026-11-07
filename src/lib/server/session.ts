import "server-only";
import type { NextRequest } from "next/server";
import { getAdminServices } from "@/lib/firebase/admin";
import { ServiceError } from "./errors";

export const SESSION_COOKIE = "modujeju_session";
export const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

export async function requireSession(request: NextRequest, adminOnly = false) {
  const { auth } = getAdminServices();
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (!cookie) throw new ServiceError("UNAUTHORIZED", 401);
  let session;
  try {
    session = await auth.verifySessionCookie(cookie, true);
  } catch {
    throw new ServiceError("UNAUTHORIZED", 401);
  }
  if (adminOnly && session.admin !== true)
    throw new ServiceError("FORBIDDEN", 403);
  return session;
}
