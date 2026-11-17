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
  // A logged-in user's own saved birth details always win over `profile`
  // (the browser-local, account-independent "last Kundli generated on this
  // device" scratch value) — otherwise a new account on a shared browser
  // computes its chart from whoever used this device before it.
  if (currentUser?.birthDate && currentUser?.birthTime && currentUser?.birthLatitude != null && currentUser?.birthLongitude != null) {
    return {
      date: currentUser.birthDate,
      time: currentUser.birthTime,
      timezoneOffsetMinutes: currentUser.birthTimezoneOffsetMinutes ?? DEFAULT_TIMEZONE_OFFSET_MINUTES,
      latitude: currentUser.birthLatitude,
      longitude: currentUser.birthLongitude,
    };
  }
  const geo = await calculatorService.geocode(profile.place);
  return {
    date: profile.dob,
    time: profile.tob,
    timezoneOffsetMinutes: currentUser?.birthTimezoneOffsetMinutes ?? DEFAULT_TIMEZONE_OFFSET_MINUTES,
    latitude: geo.latitude,
    longitude: geo.longitude,
  };
}
