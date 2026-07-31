import Link from "next/link";
import { PageHero } from "@/components/ui/page-hero";
import { SectionContainer } from "@/components/ui/section-container";

const groups = [
  {
    title: "Consultation",
    links: [
      ["Talk to Astrologer", "/talk-to-astrologer"],
      ["Chat with Astrologer", "/chat-with-astrologer"],
      ["Premium Kundli Order", "/premium-kundli/order"],
    ],
  },
  {
    title: "Free Tools",
    links: [
      ["Free Kundli", "/free-kundli"],
      ["Kundli Matching", "/kundli-matching"],
      ["Daily Horoscope", "/horoscope/daily"],
    ],
  },
  {
    title: "Shop",
    links: [["Shop", "/shop"]],
  },
  {
    title: "Content",
    links: [
      ["Blog", "/blog"],
      ["Community", "/community"],
      ["About", "/about"],
      ["Pricing", "/pricing"],
      ["Contact", "/contact"],
      ["FAQ", "/faq"],
    ],
  },
  {
    title: "Legal",
    links: [
      ["Privacy Policy", "/privacy"],
      ["Terms & Conditions", "/terms"],
      ["Refund & Cancellation", "/refund-policy"],
    ],
  },
];

export default function SitemapPage() {
  return (
    <>
      <PageHero title="Sitemap" breadcrumb={[{ label: "Home", href: "/" }, { label: "Sitemap" }]} />
      <SectionContainer>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <div key={g.title}>
              <h2 className="mb-2 font-semibold">{g.title}</h2>
              <ul className="space-y-1.5">
                {g.links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-muted-foreground hover:text-[var(--color-gold)]">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionContainer>
    </>
  );
}
