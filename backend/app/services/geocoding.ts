// Place → coordinates. A birth chart's Ascendant/houses depend on exact
// latitude/longitude, so "City, Country" typed into a form is useless
// without geocoding it first.
//
// Primary provider: Amazon Location Service's Geo Places Geocode API
// (https://docs.aws.amazon.com/location/latest/APIReference/API_geoplaces_Geocode.html),
// authenticated via an API key (query param, no SigV4/IAM signing needed —
// this is the newer API-key auth mode Location Service added specifically
// to allow plain HTTPS calls like this one) rather than the AWS SDK, since
// that's all a single REST call needs. More accurate/complete geocoding
// than the free fallback, which is why this is used whenever configured.
//
// Fallback provider: OpenStreetMap Nominatim (free, no API key) — used when
// AWS_LOCATION_API_KEY isn't set (e.g. local dev with no AWS account) or if
// the AWS call itself fails, so geocoding never goes fully offline.
import { config } from '../core/config.ts';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

async function geocodeWithAws(place: string): Promise<GeocodeResult | null> {
  const url = `https://places.geo.${config.aws.locationRegion}.api.aws/v2/geocode?key=${encodeURIComponent(config.aws.locationApiKey!)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ QueryText: place, MaxResults: 1 }),
  });
  if (!response.ok) throw new Error(`AWS Location geocode failed: ${response.status}`);
  const body = (await response.json()) as { ResultItems?: Array<{ Position: [number, number]; Address?: { Label?: string }; Title?: string }> };
  const top = body.ResultItems?.[0];
  if (!top) return null;
  const [longitude, latitude] = top.Position; // AWS returns [lng, lat] (WGS 84), the opposite order from most other providers
  return { latitude, longitude, displayName: top.Address?.Label || top.Title || place };
}

async function geocodeWithNominatim(place: string): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'TredevAstro/1.0 (astrology calculator birth-place lookup)' } });
  const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  if (!results.length) return null;
  return { latitude: Number(results[0].lat), longitude: Number(results[0].lon), displayName: results[0].display_name };
}

export async function geocodePlace(place: string): Promise<GeocodeResult | null> {
  if (config.aws.locationApiKey) {
    try {
      return await geocodeWithAws(place);
    } catch (e) {
      console.error('AWS Location geocode failed, falling back to Nominatim:', e);
    }
  }
  return geocodeWithNominatim(place);
}
