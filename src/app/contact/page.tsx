"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHero } from "@/components/ui/page-hero";
import { SectionContainer } from "@/components/ui/section-container";
import { faqs } from "@/lib/mock-data";

const contactInfo = [
  { icon: Mail, label: "Email", value: "hello@astrotredev.com" },
  { icon: Phone, label: "Phone", value: "+91 98765 43210" },
  { icon: MapPin, label: "Office", value: "Connaught Place, New Delhi, India" },
  { icon: Clock, label: "Support Hours", value: "5:00 AM – 11:00 PM IST, every day" },
];

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <PageHero
        title="Get in Touch"
        subtitle="Questions about a consultation, an order, or a partnership? We're here to help."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />

      <SectionContainer>
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          {submitted ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success)]/5 p-10 text-center">
              <CheckCircle2 className="size-10 text-[var(--color-success)]" />
              <p className="mt-3 font-semibold">Message sent successfully</p>
              <p className="mt-1 text-sm text-muted-foreground">We&apos;ll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
              className="grid gap-4 rounded-xl border p-6 sm:grid-cols-2 sm:p-8"
            >
              <div><Label htmlFor="c-name" className="mb-1.5">Full Name</Label><Input id="c-name" required /></div>
              <div><Label htmlFor="c-email" className="mb-1.5">Email</Label><Input id="c-email" type="email" required /></div>
              <div className="sm:col-span-2"><Label htmlFor="c-subject" className="mb-1.5">Subject</Label><Input id="c-subject" required /></div>
              <div className="sm:col-span-2">
                <Label htmlFor="c-message" className="mb-1.5">Message</Label>
                <textarea
                  id="c-message"
                  required
                  rows={5}
                  className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
              <Button type="submit" size="lg" className="gap-2 sm:col-span-2">
                <Send className="size-4" /> Send Message
              </Button>
            </form>
          )}

          <aside className="space-y-4">
            {contactInfo.map((c) => (
              <div key={c.label} className="flex gap-3 rounded-xl border p-4">
                <c.icon className="size-5 shrink-0 text-[var(--color-gold)]" />
                <div>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                  <p className="text-sm font-medium">{c.value}</p>
                </div>
              </div>
            ))}
          </aside>
        </div>

        <div id="faq" className="mt-14 max-w-3xl">
          <h2 className="mb-5 text-2xl font-bold">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.question} className="rounded-xl border p-5">
                <p className="font-semibold">{f.question}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionContainer>
    </>
  );
}
