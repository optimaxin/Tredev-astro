import { StaticContentPage } from "@/components/ui/static-content-page";

export default function PrivacyPage() {
  return (
    <StaticContentPage
      title="Privacy Policy"
      subtitle="Last updated July 2026"
      sections={[
        {
          heading: "What We Collect",
          body: [
            "We collect the information you provide directly — name, contact details, and birth data (date, time, place) used to generate your Kundli and match you with astrologers.",
            "We also collect basic usage data (pages visited, consultation duration) to improve the platform.",
          ],
        },
        {
          heading: "How We Use Your Data",
          body: [
            "Birth details are used solely to generate astrological charts and are shared only with the astrologer you actively consult.",
            "We never sell your personal data to third parties, and marketing communications are opt-in only.",
          ],
        },
        {
          heading: "Data Security",
          body: [
            "All birth details and consultation records are encrypted at rest and in transit. Call and chat recordings are retained for 30 days for quality purposes and then deleted, unless you opt out of recording entirely.",
          ],
        },
        {
          heading: "Your Rights",
          body: [
            "You can request a copy of your data, ask us to correct it, or request full deletion of your account and associated data at any time from your dashboard settings or by contacting support.",
          ],
        },
      ]}
    />
  );
}
