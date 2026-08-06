import "server-only";

export type GeocodeResult = { lat: number; lng: number; displayName: string };

// Fast local lookup for common cities so the astro tools work even when the
// Nominatim network call is slow, rate-limited, or unreachable (sandboxed
// dev environments in particular often block arbitrary outbound HTTPS).
const KNOWN_CITIES: Record<string, GeocodeResult> = {
  "new delhi": { lat: 28.6139, lng: 77.209, displayName: "New Delhi, India" },
  delhi: { lat: 28.6139, lng: 77.209, displayName: "Delhi, India" },
  mumbai: { lat: 19.076, lng: 72.8777, displayName: "Mumbai, India" },
  bangalore: { lat: 12.9716, lng: 77.5946, displayName: "Bangalore, India" },
  bengaluru: { lat: 12.9716, lng: 77.5946, displayName: "Bengaluru, India" },
  chennai: { lat: 13.0827, lng: 80.2707, displayName: "Chennai, India" },
  kolkata: { lat: 22.5726, lng: 88.3639, displayName: "Kolkata, India" },
  hyderabad: { lat: 17.385, lng: 78.4867, displayName: "Hyderabad, India" },
  pune: { lat: 18.5204, lng: 73.8567, displayName: "Pune, India" },
  ahmedabad: { lat: 23.0225, lng: 72.5714, displayName: "Ahmedabad, India" },
  jaipur: { lat: 26.9124, lng: 75.7873, displayName: "Jaipur, India" },
  lucknow: { lat: 26.8467, lng: 80.9462, displayName: "Lucknow, India" },
  varanasi: { lat: 25.3176, lng: 82.9739, displayName: "Varanasi, India" },
  kochi: { lat: 9.9312, lng: 76.2673, displayName: "Kochi, India" },
  chandigarh: { lat: 30.7333, lng: 76.7794, displayName: "Chandigarh, India" },
  surat: { lat: 21.1702, lng: 72.8311, displayName: "Surat, India" },
  patna: { lat: 25.5941, lng: 85.1376, displayName: "Patna, India" },
  bhopal: { lat: 23.2599, lng: 77.4126, displayName: "Bhopal, India" },
  nagpur: { lat: 21.1458, lng: 79.0882, displayName: "Nagpur, India" },
  indore: { lat: 22.7196, lng: 75.8577, displayName: "Indore, India" },
  "new york": { lat: 40.7128, lng: -74.006, displayName: "New York, USA" },
  london: { lat: 51.5072, lng: -0.1276, displayName: "London, UK" },
  dubai: { lat: 25.2048, lng: 55.2708, displayName: "Dubai, UAE" },
  singapore: { lat: 1.3521, lng: 103.8198, displayName: "Singapore" },
};

function lookupKnownCity(query: string): GeocodeResult | null {
  const key = query.trim().toLowerCase().split(",")[0].trim();
  return KNOWN_CITIES[key] ?? null;
}

// Free OpenStreetMap Nominatim lookup — no API key needed. Respects their
// usage policy (custom User-Agent, one request per call, no client-side use).
async function geocodeViaNominatim(query: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AstroTredev/1.0 (astrology birth-chart lookup)" },
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) return null;
    const results = (await res.json()) as { lat: string; lon: string; display_name: string }[];
    const first = results[0];
    if (!first) return null;
    return { lat: parseFloat(first.lat), lng: parseFloat(first.lon), displayName: first.display_name };
  } catch {
    // ponytail: network unreachable / TLS blocked in this environment falls
    // back to the KNOWN_CITIES table above instead of failing the request.
    return null;
  }
}

export async function geocodePlace(query: string): Promise<GeocodeResult | null> {
  return lookupKnownCity(query) ?? (await geocodeViaNominatim(query));
}
