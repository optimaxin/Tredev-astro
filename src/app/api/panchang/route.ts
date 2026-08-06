import { NextResponse } from "next/server";
import tzLookup from "tz-lookup";
import { getPanchang } from "@/lib/astro/panchang";
import { geocodePlace } from "@/lib/geocode";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city") ?? "New Delhi, India";
  const dateParam = searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : new Date();

  const location = await geocodePlace(city);
  if (!location) {
    return NextResponse.json({ error: `Could not find location for "${city}"` }, { status: 400 });
  }

  const panchang = getPanchang(date, location.lat, location.lng);
  const timeZone = tzLookup(location.lat, location.lng);
  return NextResponse.json({ city: location.displayName, timeZone, panchang });
}
