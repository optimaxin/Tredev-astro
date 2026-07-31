"use client";

import { useState } from "react";
import { BookOpen, Heart, Briefcase, HeartPulse, Calendar, Gem, Video, Smartphone, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OmMark } from "@/components/ui/om-mark";
import { SectionContainer, SectionHeading } from "@/components/ui/section-container";
import { faqs } from "@/lib/mock-data";

const problems = [
  "Career stuck? No growth in sight?",
  "Marriage getting delayed?",
  "Financial problems never ending?",
  "Health issues troubling you?",
  "Relationship conflicts?",
];

const features = [
  { icon: BookOpen, title: "Complete Birth Chart Analysis", points: ["Lagna & all 12 Houses deep dive", "9 Planets positions & effects", "Nakshatra & Dasha timeline"] },
  { icon: Heart, title: "Marriage & Relationship Prediction", points: ["Marriage timing (exact period)", "Spouse characteristics", "Mangal Dosha check & remedies"] },
  { icon: Briefcase, title: "Career & Finance Prediction", points: ["Best career fields", "Wealth accumulation periods", "Foreign settlement chances"] },
  { icon: HeartPulse, title: "Health & Wellness Analysis", points: ["Health vulnerabilities", "Disease-prone periods", "Preventive measures"] },
  { icon: Calendar, title: "5 Years Detailed Prediction", points: ["Year-wise breakdown", "Auspicious & caution periods"] },
  { icon: Gem, title: "Personalized Remedies", points: ["Gemstone recommendation", "Mantra & Pooja suggestions"] },
  { icon: Video, title: "Personal Video Explanation", points: ["10–15 min video by expert astrologer", "Delivered via WhatsApp/Email"] },
  { icon: Smartphone, title: "Lifetime Digital Access", points: ["PDF report in your email", "Access via mobile app"] },
];

const packages = [
  { name: "Basic Kundli", price: 199, original: 999, features: ["Birth Chart", "Planet Details", "10 Pages", "PDF Only"] },
  { name: "Premium Kundli", price: 499, original: 2999, popular: true, features: ["Everything in Basic", "5 Years Prediction", "Marriage Timing", "Gemstone Suggestion", "Personal Video", "25+ Pages", "Lifetime Access"] },
  { name: "Combo: Kundli + Call", price: 799, original: 1399, features: ["Premium Kundli", "+ 30 Min Phone Call"] },
];

export default function PremiumKundliOrderPage() {
  const [selectedPkg, setSelectedPkg] = useState("Premium Kundli");
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <section className="cosmic-bg relative overflow-hidden py-16 text-center text-white sm:py-24">
        <SectionContainer className="relative py-0">
          <OmMark className="mx-auto text-5xl" />
          <h1 className="mt-4 font-heading text-4xl font-semibold sm:text-5xl">
            Get Your PREMIUM Personalized Kundli Report
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-white/80">
            Handwritten by Expert Astrologers • 25+ Pages • Personal Video • 5 Years Prediction
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="text-4xl font-bold text-[var(--color-gold)]">₹499</span>
            <span className="text-lg text-white/50 line-through">₹2,999</span>
            <span className="rounded-full bg-[var(--color-error)]/20 px-2.5 py-1 text-sm font-semibold text-[var(--color-error)]">83% OFF</span>
          </div>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-[var(--color-gold)]"><Clock className="size-4" /> Offer expires in 08:45:32</p>
          <Button size="lg" variant="gold" className="mt-6 animate-glow-pulse" render={<a href="#order-form" />}>
            Get Your Premium Kundli @ ₹499
          </Button>
        </SectionContainer>
      </section>

      <SectionContainer className="max-w-3xl text-center">
        <SectionHeading heading="Are You Facing These Problems?" />
        <ul className="mx-auto max-w-md space-y-2 text-left">
          {problems.map((p) => (
            <li key={p} className="flex items-center gap-2 text-muted-foreground">
              <span className="size-1.5 rounded-full bg-[var(--color-error)]" /> {p}
            </li>
          ))}
        </ul>
        <p className="mt-6 font-semibold">The root cause of all these problems is in your Kundli.</p>
      </SectionContainer>

      <SectionContainer>
        <SectionHeading heading="What's Included in Your Premium Report?" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title} className="rounded-xl border p-5">
              <f.icon className="size-7 text-[var(--color-gold)]" />
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {f.points.map((pt) => <li key={pt}>• {pt}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </SectionContainer>

      <SectionContainer id="order-form" className="max-w-4xl">
        <SectionHeading heading="Choose Your Package" />
        <div className="grid gap-5 sm:grid-cols-3">
          {packages.map((pkg) => (
            <button
              key={pkg.name}
              onClick={() => setSelectedPkg(pkg.name)}
              className={`rounded-xl border p-5 text-left transition-all ${
                selectedPkg === pkg.name ? "border-[var(--color-gold)] ring-2 ring-[var(--color-gold)]/30" : "hover:border-[var(--color-gold)]/50"
              }`}
            >
              {pkg.popular && <span className="rounded-full bg-[var(--color-gold)] px-2 py-0.5 text-xs font-semibold text-[#2b0b0e]">Popular</span>}
              <p className="mt-2 font-semibold">{pkg.name}</p>
              <p className="mt-1"><span className="text-2xl font-bold text-[var(--color-gold)]">₹{pkg.price}</span> <span className="text-sm text-muted-foreground line-through">₹{pkg.original}</span></p>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {pkg.features.map((f) => <li key={f} className="flex items-center gap-1"><Check className="size-3 text-[var(--color-success)]" /> {f}</li>)}
              </ul>
            </button>
          ))}
        </div>

        {submitted ? (
          <div className="mt-8 rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/5 p-6 text-center">
            <p className="font-semibold text-[var(--color-success)]">Thank you! Your order has been received.</p>
            <p className="mt-1 text-sm text-muted-foreground">Our team will begin preparing your {selectedPkg} and reach out within 24 hours.</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
            className="mt-8 grid gap-4 rounded-xl border p-6 sm:grid-cols-2"
          >
            <div><Label htmlFor="ok-name" className="mb-1.5">Full Name</Label><Input id="ok-name" required /></div>
            <div><Label htmlFor="ok-dob" className="mb-1.5">Date of Birth</Label><Input id="ok-dob" type="date" required /></div>
            <div><Label htmlFor="ok-phone" className="mb-1.5">Phone Number</Label><Input id="ok-phone" type="tel" required /></div>
            <div><Label htmlFor="ok-email" className="mb-1.5">Email</Label><Input id="ok-email" type="email" required /></div>
            <Button type="submit" size="lg" variant="gold" className="sm:col-span-2">
              Proceed to Pay ₹{packages.find((p) => p.name === selectedPkg)?.price}
            </Button>
          </form>
        )}
      </SectionContainer>

      <SectionContainer className="max-w-3xl">
        <SectionHeading heading="Frequently Asked Questions" />
        <div className="space-y-4">
          {faqs.slice(0, 4).map((f) => (
            <div key={f.question} className="rounded-xl border p-5">
              <p className="font-semibold">{f.question}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.answer}</p>
            </div>
          ))}
        </div>
      </SectionContainer>
    </>
  );
}
