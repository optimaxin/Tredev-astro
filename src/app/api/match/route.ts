import { NextResponse } from "next/server";
import { getPlanetaryPositions } from "@/lib/astro/ephemeris";
import { calculateGunaMilan } from "@/lib/astro/guna-milan";
import { geocodePlace } from "@/lib/geocode";

type PersonInput = { name: string; dob: string; timeOfBirth: string; place: string };

async function toMoonPlacement(person: PersonInput) {
  const location = await geocodePlace(person.place);
  if (!location) throw new Error(`Could not find location for "${person.place}"`);
  const birthDate = new Date(`${person.dob}T${person.timeOfBirth}:00`);
  if (Number.isNaN(birthDate.getTime())) throw new Error("Invalid date or time");

  const moon = getPlanetaryPositions(birthDate).find((p) => p.name === "Moon")!;
  return { nakshatraIndex: moon.nakshatraIndex, rashiIndex: moon.rashiIndex, moon, place: location.displayName };
}

export async function POST(req: Request) {
  const { boy, girl } = (await req.json()) as { boy: PersonInput; girl: PersonInput };
  if (!boy?.dob || !girl?.dob) {
    return NextResponse.json({ error: "Both partners' birth details are required" }, { status: 400 });
  }

  try {
    const [boyMoon, girlMoon] = await Promise.all([toMoonPlacement(boy), toMoonPlacement(girl)]);
    const result = calculateGunaMilan(boyMoon, girlMoon);
    return NextResponse.json({
      boy: { name: boy.name, moonSign: boyMoon.moon.rashi, nakshatra: boyMoon.moon.nakshatra },
      girl: { name: girl.name, moonSign: girlMoon.moon.rashi, nakshatra: girlMoon.moon.nakshatra },
      result,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Calculation failed" }, { status: 400 });
  }
}
