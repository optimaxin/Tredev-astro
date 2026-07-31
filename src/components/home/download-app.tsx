import { Star, Smartphone, Check } from "lucide-react";
import { SectionContainer } from "@/components/ui/section-container";

const features = [
  "Faster call connection",
  "Offline Kundli access",
  "Daily horoscope widget",
  "Exclusive app-only offers",
  "Biometric security lock",
];

export function DownloadApp() {
  return (
    <SectionContainer>
      <div className="cosmic-bg grid gap-8 overflow-hidden rounded-2xl px-6 py-12 text-white sm:px-12 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="flex items-center gap-3 text-3xl font-bold">
            <Smartphone className="size-7 text-[var(--color-gold)]" /> Get the AstroTredev App
          </h2>
          <p className="mt-2 text-white/80">Consult astrologers on the go. Available on iOS &amp; Android.</p>
          <ul className="mt-6 space-y-2">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-white/85">
                <Check className="size-4 text-[var(--color-success)]" /> {f}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-2 text-sm text-white/70">
            <Star className="size-4 fill-[var(--color-gold)] text-[var(--color-gold)]" />
            4.8 • 100K+ Downloads
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <div className="size-40 rounded-xl glass" aria-hidden />
          <div className="flex gap-3">
            <span className="rounded-lg glass px-4 py-2 text-sm">Google Play</span>
            <span className="rounded-lg glass px-4 py-2 text-sm">Apple App Store</span>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}
