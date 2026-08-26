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

// ── Live "as you type" suggestions ──────────────────────────────────────
// A free-text field lets someone type "Bombay" and get nothing, or a vague
// "Springfield" and get the wrong one of 30 — geocoding only runs once, at
// submit, so there's no chance to correct course. Suggest resolves this by
// returning real, disambiguated candidates as the user types, so they pick
// a specific place instead of hoping their spelling/phrasing resolves
// correctly later.
//
// AWS's Suggest results carry a PlaceId but NOT coordinates (confirmed by
// calling it directly — its response has no Position field at all); a
// second GetPlace(placeId) call is required to resolve one to a lat/lng.
// Only doing that on actual selection (not for all 6 suggestions on every
// keystroke) is also just the cheaper/faster design. Nominatim has no such
// two-step API, so its suggestions carry coordinates directly.
export interface PlaceSuggestion {
  label: string;
  placeId?: string; // present for AWS results — resolve via resolvePlaceId()
  latitude?: number; // present for Nominatim results — already final
  longitude?: number;
}

// AWS requires exactly one of BiasPosition/Filter.BoundingBox/Filter.Circle
// on every Suggest call (a 400 otherwise) — this site's users are
// overwhelmingly asking about Indian birth places (IST is the default
// timezone, "New Delhi, India" is the default Panchang place), so biasing
// toward India's geographic center improves ranking for short/ambiguous
// queries without excluding anywhere else (bias only re-ranks, unlike a
// bounding-box filter which would actually exclude results outside it).
const INDIA_CENTER: [number, number] = [78.9629, 20.5937];

async function suggestWithAws(query: string, maxResults: number): Promise<PlaceSuggestion[]> {
  const url = `https://places.geo.${config.aws.locationRegion}.api.aws/v2/suggest?key=${encodeURIComponent(config.aws.locationApiKey!)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ QueryText: query, MaxResults: maxResults, BiasPosition: INDIA_CENTER }),
  });
  if (!response.ok) throw new Error(`AWS Location suggest failed: ${response.status} ${await response.text()}`);
  const body = (await response.json()) as {
    ResultItems?: Array<{
      Title?: string;
      SuggestResultItemType?: string;
      Place?: { PlaceId?: string; Address?: { Label?: string } };
    }>;
  };
  // Suggest also returns bare "query refinement" items (e.g. a corrected
  // search term with no place attached) alongside real place candidates —
  // only the latter (type "Place", with a PlaceId) are selectable here.
  return (body.ResultItems || [])
    .filter(item => item.SuggestResultItemType === 'Place' && item.Place?.PlaceId)
    .map(item => ({ label: item.Place!.Address?.Label || item.Title || query, placeId: item.Place!.PlaceId }));
}

async function suggestWithNominatim(query: string, limit: number): Promise<PlaceSuggestion[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=${limit}&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { 'User-Agent': 'TredevAstro/1.0 (astrology calculator birth-place lookup)' } });
  const results = (await response.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  return results.map(r => ({ latitude: Number(r.lat), longitude: Number(r.lon), label: r.display_name }));
}

export async function suggestPlaces(query: string): Promise<PlaceSuggestion[]> {
  if (config.aws.locationApiKey) {
    try {
      return await suggestWithAws(query, 6);
    } catch (e) {
      console.error('AWS Location suggest failed, falling back to Nominatim:', e);
    }
  }
  return suggestWithNominatim(query, 6);
}

export async function resolvePlaceId(placeId: string): Promise<GeocodeResult | null> {
  if (!config.aws.locationApiKey) return null; // placeId only ever comes from an AWS-sourced suggestion
  const url = `https://places.geo.${config.aws.locationRegion}.api.aws/v2/place/${encodeURIComponent(placeId)}?key=${encodeURIComponent(config.aws.locationApiKey)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`AWS Location GetPlace failed: ${response.status} ${await response.text()}`);
  const body = (await response.json()) as { Position?: [number, number]; Address?: { Label?: string }; Title?: string };
  if (!body.Position) return null;
  const [longitude, latitude] = body.Position;
  return { latitude, longitude, displayName: body.Address?.Label || body.Title || '' };
}
