import { calculatorService } from '../services/calculatorService';
import type { BirthDetailsInput } from '../services/calculatorService';
import type { AuthUser, BirthProfile } from '../context/AppContext';

// This app's default demo profile ("New Delhi, India") is India-based, so
// that's the sane fallback when a logged-in user hasn't saved a timezone —
// AIAstrology and MySky both need a real BirthDetailsInput (lat/long +
// timezone offset) from the lighter, no-coordinates BirthProfile the rest of
// the app carries around.
const DEFAULT_TIMEZONE_OFFSET_MINUTES = 330;

export async function resolveBirthDetailsInput(profile: BirthProfile, currentUser: AuthUser | null): Promise<BirthDetailsInput> {
  const geo = await calculatorService.geocode(profile.place);
  return {
    date: profile.dob,
    time: profile.tob,
    timezoneOffsetMinutes: currentUser?.birthTimezoneOffsetMinutes ?? DEFAULT_TIMEZONE_OFFSET_MINUTES,
    latitude: geo.latitude,
    longitude: geo.longitude,
  };
}
