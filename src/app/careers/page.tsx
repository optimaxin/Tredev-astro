import { StaticContentPage } from "@/components/ui/static-content-page";

export default function CareersPage() {
  return (
    <StaticContentPage
      title="Careers at AstroTredev"
      subtitle="Help us make ancient wisdom accessible to the modern world."
      sections={[
        {
          heading: "Open Roles",
          body: [
            "We're a small, focused team building at the intersection of technology and tradition. We're currently hiring for Backend Engineer (Node.js), Vedic Astrology Content Editor, and Customer Support (Hindi/English).",
          ],
        },
        {
          heading: "How We Work",
          body: [
            "Remote-first, with quarterly in-person gatherings. We move quickly, ship often, and treat astrologer and customer feedback as our primary source of truth.",
          ],
        },
        {
          heading: "Apply",
          body: [
            "Send your resume and a short note about why you're interested to careers@astrotredev.com — we read every application personally.",
          ],
        },
      ]}
    />
  );
}
