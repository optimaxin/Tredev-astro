import { StaticContentPage } from "@/components/ui/static-content-page";

export default function PressPage() {
  return (
    <StaticContentPage
      title="Press & News"
      subtitle="Media coverage and announcements from AstroTredev."
      sections={[
        {
          heading: "Media Inquiries",
          body: [
            "For interviews, data requests, or media partnerships, reach out to press@astrotredev.com. We typically respond within 2 business days.",
          ],
        },
        {
          heading: "Brand Assets",
          body: [
            "Logos and brand guidelines are available on request for approved press and partner use.",
          ],
        },
      ]}
    />
  );
}
