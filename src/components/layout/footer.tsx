import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OmMark } from "@/components/ui/om-mark";
import { ShieldCheck, BadgeCheck, Lock, Smartphone } from "lucide-react";

const socialGlyphs = ["f", "@", "▶", "𝕏", "in"];

const trustRow = [
  { icon: Lock, label: "Private & Confidential" },
  { icon: BadgeCheck, label: "Verified Astrologers" },
  { icon: ShieldCheck, label: "Secure Payments" },
];

const columns = [
  {
    title: "About AstroTredev",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Press & News", href: "/press" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "Consultation",
    links: [
      { label: "Talk to Astrologer", href: "/talk-to-astrologer" },
      { label: "Chat with Astrologer", href: "/chat-with-astrologer" },
      { label: "Premium Kundli Report", href: "/premium-kundli/order" },
      { label: "Kundli Matching", href: "/kundli-matching" },
    ],
  },
  {
    title: "Free Tools",
    links: [
      { label: "Free Kundli", href: "/free-kundli" },
      { label: "Daily Horoscope", href: "/horoscope/daily" },
      { label: "Shop", href: "/shop" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center / FAQ", href: "/faq" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Refund & Cancellation", href: "/refund-policy" },
      { label: "Sitemap", href: "/sitemap" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="ink-bg relative border-t border-white/10 text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-sm font-semibold text-[var(--color-marigold)]">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-white/70 transition-colors hover:text-white">
                      {link.label}
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

        <div className="mt-10 grid grid-cols-1 gap-4 border-t border-white/10 pt-8 sm:grid-cols-3">
          {trustRow.map((t) => (
            <div key={t.label} className="flex items-center gap-2 text-sm text-white/70">
              <t.icon className="size-5 text-[var(--color-marigold)]" /> {t.label}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-8">
          <span className="flex items-center gap-2 rounded-full glass px-4 py-2 text-sm">
            <Smartphone className="size-4" /> Get it on Google Play
          </span>
          <span className="flex items-center gap-2 rounded-full glass px-4 py-2 text-sm">
            <Smartphone className="size-4" /> Download on the App Store
          </span>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-8 sm:flex-row">
          <Link href="/" className="flex items-center gap-2 font-heading tracking-wide">
            <span className="flex size-8 items-center justify-center rounded-full border border-[var(--color-sindoor)]/50 text-[var(--color-sindoor)]">
              <OmMark className="text-sm" />
            </span>
            AstroTredev
          </Link>
          <div className="flex gap-3">
            {socialGlyphs.map((glyph, i) => (
              <span key={i} className="flex size-8 items-center justify-center rounded-full glass text-sm font-semibold text-white/70 hover:text-white">
                {glyph}
              </span>
            ))}
          </div>
          <p className="text-sm text-white/50">© {new Date().getFullYear()} AstroTredev. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
