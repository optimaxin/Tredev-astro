import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OmMark } from "@/components/ui/om-mark";
import { CosmicBackground } from "@/components/ui/cosmic-background";

const suggestions = [
  { label: "Talk to an Astrologer", href: "/talk-to-astrologer" },
  { label: "Generate Free Kundli", href: "/free-kundli" },
  { label: "Today's Horoscope", href: "/horoscope/daily" },
];

export default function NotFound() {
  return (
    <section className="relative flex min-h-[80vh] items-center overflow-hidden text-white">
      <CosmicBackground />
      <div className="relative mx-auto max-w-xl px-4 text-center">
        <OmMark className="mx-auto text-5xl opacity-70" />
        <h1 className="mt-4 font-heading text-6xl font-bold text-[var(--color-gold)] sm:text-7xl">404</h1>
        <p className="mt-3 text-xl font-semibold">Even the stars couldn&apos;t chart this page.</p>
        <p className="mt-2 text-white/70">The page you&apos;re looking for has drifted beyond this realm. Let&apos;s guide you back.</p>

        <Button size="lg" className="mt-8" render={<Link href="/" />}>
          Go Back Home
        </Button>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {suggestions.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/80 transition-colors hover:border-[var(--color-gold)] hover:text-white"
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
