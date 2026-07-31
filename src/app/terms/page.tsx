import { StaticContentPage } from "@/components/ui/static-content-page";

export default function TermsPage() {
  return (
    <StaticContentPage
      title="Terms & Conditions"
      subtitle="Last updated July 2026"
      sections={[
        {
          heading: "Nature of Service",
          body: [
            "AstroTredev provides astrological guidance for entertainment and personal insight purposes. Predictions are based on Vedic astrological principles and should not be treated as a substitute for professional medical, legal, or financial advice.",
          ],
        },
        {
          heading: "Consultation Billing",
          body: [
            "New users receive a free 3-minute trial with any astrologer. Billing begins automatically after the trial period ends, based on the astrologer's listed per-minute rate, deducted from your wallet balance.",
          ],
        },
        {
          heading: "Astrologer Conduct",
          body: [
            "All astrologers agree to a code of conduct prohibiting inappropriate behavior, fear-based selling tactics, and guarantees of specific outcomes. Violations can be reported from any consultation screen.",
          ],
        },
        {
          heading: "Account Termination",
          body: [
            "We reserve the right to suspend accounts that violate these terms, including fraudulent payment activity or abuse toward astrologers or staff.",
          ],
        },
      ]}
    />
  );
}
