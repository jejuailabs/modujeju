import { NextResponse } from "next/server";
import { getPublicPlaces } from "@/lib/server/public-places";

export const runtime = "nodejs";

export async function GET() {
  try {
    // The shared server Data Cache is invalidated on publication changes.
    // A separate CDN/browser cache could continue serving hidden places.
    return NextResponse.json(
      { places: await getPublicPlaces() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: { code: "CATALOG_UNAVAILABLE" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
