import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function healthResponse() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return new NextResponse(null, {
      status: 204,
      headers: { "Cache-Control": "no-store" },
    });
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      method: "GET",
      headers: { apikey: anonKey },
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    return new NextResponse(null, {
      status: response.ok ? 204 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return new NextResponse(null, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function GET() {
  return healthResponse();
}

export async function HEAD() {
  return healthResponse();
}
