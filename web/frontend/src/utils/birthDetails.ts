import type { AuthUser } from '../context/AppContext';
import type { BirthDetailsInitialValues } from '../components/BirthDetailsForm/BirthDetailsForm';

// Lets every calculator prefill from the birth details a user already gave
// at registration, instead of asking them to retype it each time.
export function toSavedBirthDetails(currentUser: AuthUser | null): BirthDetailsInitialValues | undefined {
  if (!currentUser?.birthDate) return undefined;
  return {
    name: currentUser.name,
    date: currentUser.birthDate,
    time: currentUser.birthTime || undefined,
    place: currentUser.birthPlace || undefined,
    timezoneOffsetMinutes: currentUser.birthTimezoneOffsetMinutes ?? undefined,
  };
}
