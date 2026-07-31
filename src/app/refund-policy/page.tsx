import { StaticContentPage } from "@/components/ui/static-content-page";

export default function RefundPolicyPage() {
  return (
    <StaticContentPage
      title="Refund & Cancellation Policy"
      subtitle="Last updated July 2026"
      sections={[
        {
          heading: "Consultation Refunds",
          body: [
            "If you're not satisfied with a consultation, you can request a full refund or a free follow-up session with a senior astrologer within 24 hours of the session ending.",
          ],
        },
        {
          heading: "Premium Kundli Reports",
          body: [
            "Digital Premium Kundli reports are refundable before delivery. Once the report has been generated and delivered, refunds are considered case-by-case for quality issues only.",
          ],
        },
        {
          heading: "Store Orders",
          body: [
            "Physical products (gemstones, rudraksha, yantras) can be returned within 7 days of delivery if unused and in original packaging. Energized items cannot be exchanged once opened.",
          ],
        },
        {
          heading: "Wallet Balance",
          body: [
            "Wallet top-ups are non-refundable but never expire, and can be used toward any consultation or store purchase on the platform.",
          ],
        },
      ]}
    />
  );
}
