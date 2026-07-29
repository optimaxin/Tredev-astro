import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OmMark } from "@/components/ui/om-mark";

// lucide-react dropped brand/social icons; single-path glyphs stand in for them.
const socialGlyphs = ["f", "@", "▶", "𝕏", "in"];

const columns = [
  {
    title: "About CosmicConnect",
    links: ["About Us", "Our Story", "Careers", "Press & News", "Contact Us"],
  },
  {
    title: "Consultation Services",
    links: ["Talk to Astrologer", "Chat with Astrologer", "Video Consultation", "Premium Kundli Report", "Marriage Astrology"],
  },
  {
    title: "Free Tools",
    links: ["Free Kundli", "Kundli Matching", "Daily Horoscope", "Numerology Calculator", "Panchang Today"],
  },
  {
    title: "Shop",
    links: ["Gemstones", "Rudraksha", "Yantras", "Pooja Items", "Books & Courses"],
  },
  {
    title: "Support",
    links: ["Help Center / FAQ", "Privacy Policy", "Terms & Conditions", "Refund & Cancellation", "Sitemap"],
  },
];

export function Footer() {
  return (
    <footer className="cosmic-bg relative border-t border-white/10 text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-gold)]">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-sm text-white/70 transition-colors hover:text-white">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-4 rounded-xl glass p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Get Daily Astrology Tips</p>
            <p className="text-sm text-white/60">Subscribe to our newsletter</p>
          </div>
          <form className="flex w-full max-w-sm gap-2">
            <Input type="email" placeholder="Enter your email" className="bg-white/5 text-white placeholder:text-white/40" />
            <Button type="submit" className="shrink-0">Subscribe</Button>
          </form>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 sm:flex-row">
          <Link href="/" className="flex items-center gap-2 font-display tracking-wide">
            <OmMark className="text-xl" />
            CosmicConnect
          </Link>

          <div className="flex gap-3">
            {socialGlyphs.map((glyph, i) => (
              <span
                key={i}
                className="flex size-8 items-center justify-center rounded-full glass text-sm font-semibold text-white/70 hover:text-white"
              >
                {glyph}
              </span>
            ))}
          </div>

          <p className="text-sm text-white/50">
            © {new Date().getFullYear()} CosmicConnect. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
