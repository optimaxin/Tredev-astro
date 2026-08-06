import { NextResponse } from "next/server";
import { generateKundli } from "@/lib/astro/kundli";
import { geocodePlace } from "@/lib/geocode";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const { name, dob, timeOfBirth, place } = body as { name: string; dob: string; timeOfBirth: string; place: string };

  if (!name || !dob || !timeOfBirth || !place) {
    return NextResponse.json({ error: "name, dob, timeOfBirth, and place are required" }, { status: 400 });
  }

  const location = await geocodePlace(place);
  if (!location) {
    return NextResponse.json({ error: `Could not find location for "${place}"` }, { status: 400 });
  }

  const birthDate = new Date(`${dob}T${timeOfBirth}:00`);
  if (Number.isNaN(birthDate.getTime())) {
    return NextResponse.json({ error: "Invalid date or time" }, { status: 400 });
  }

  const chart = generateKundli({ date: birthDate, latitude: location.lat, longitude: location.lng });

  const user = await getCurrentUser();
  await db.kundliChart.create({
    data: {
      userId: user?.id,
      name,
      dob: birthDate,
      timeOfBirth,
      placeName: location.displayName,
      lat: location.lat,
      lng: location.lng,
      ayanamsa: chart.ascendant.tropicalLongitude - chart.ascendant.siderealLongitude,
      chartJson: JSON.stringify(chart),
    },
  });

  return NextResponse.json({ name, place: location.displayName, chart });
}
