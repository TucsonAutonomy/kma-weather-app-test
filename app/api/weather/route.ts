import { NextRequest, NextResponse } from "next/server";
import { getForecast } from "@/lib/kma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const city = request.nextUrl.searchParams.get("city") ?? "seoul";

  try {
    const forecast = await getForecast(city);
    return NextResponse.json(forecast, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "예보를 불러오지 못했습니다.";

    return NextResponse.json(
      { error: message },
      { status: message.includes("인증키") ? 503 : 502 },
    );
  }
}
