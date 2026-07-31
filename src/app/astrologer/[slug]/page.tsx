import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, MessageCircle, Gift, Heart, Star, MapPin, Award, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionContainer } from "@/components/ui/section-container";
import { AstrologerCard } from "@/components/ui/astrologer-card";
import { astrologers } from "@/lib/mock-data";

export function generateStaticParams() {
  return astrologers.map((a) => ({ slug: a.slug }));
}

export default async function AstrologerProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const astrologer = astrologers.find((a) => a.slug === slug);
  if (!astrologer) notFound();

  const similar = astrologers.filter((a) => a.id !== astrologer.id).slice(0, 3);

  const packages = [
    { name: "Quick Question", duration: "5 min", price: astrologer.price * 5 },
    { name: "Detailed Consult", duration: "15 min", price: astrologer.price * 15, popular: true },
    { name: "Deep Dive", duration: "30 min", price: astrologer.price * 30 },
  ];

  return (
    <>
      <section className="cosmic-bg relative overflow-hidden py-14 text-white">
        <SectionContainer className="relative py-0">
          <nav className="mb-6 text-xs text-white/60">
            <Link href="/" className="hover:text-white">Home</Link> {" / "}
            <Link href="/talk-to-astrologer" className="hover:text-white">Talk to Astrologer</Link> {" / "}
            <span className="text-white/90">{astrologer.name}</span>
          </nav>
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
            <Avatar className="size-32 border-4 border-[var(--color-gold)] shadow-lg">
              <AvatarFallback className="bg-[var(--color-cosmic)] text-3xl text-white">
                {astrologer.initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <Badge className="bg-[var(--color-gold)]/20 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/20">{astrologer.tier}</Badge>
                {astrologer.online && (
                  <Badge className="gap-1 bg-[var(--color-success)]/20 text-[var(--color-success)] hover:bg-[var(--color-success)]/20">
                    <span className="size-1.5 animate-breathing rounded-full bg-[var(--color-success)]" /> Online
                  </Badge>
                )}
              </div>
              <h1 className="mt-2 font-heading text-3xl font-semibold sm:text-4xl">{astrologer.name}</h1>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-white/75 sm:justify-start">
                {astrologer.city && (
                  <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {astrologer.city}, India</span>
                )}
                <span className="flex items-center gap-1">
                  <Star className="size-3.5 fill-[var(--color-gold)] text-[var(--color-gold)]" /> {astrologer.rating} ({astrologer.reviews.toLocaleString()} reviews)
                </span>
                <span className="flex items-center gap-1"><Award className="size-3.5" /> {astrologer.experience}+ years</span>
                <span className="flex items-center gap-1"><PhoneCall className="size-3.5" /> {astrologer.consultations} consultations</span>
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
                <Button size="lg" className="gap-2 animate-glow-pulse">
                  <Phone className="size-4" /> Call Now @ ₹{astrologer.price}/min
                </Button>
                <Button size="lg" variant="outline" className="gap-2 border-white/30 bg-white/5 text-white hover:bg-white/10">
                  <MessageCircle className="size-4" /> Chat Now
                </Button>
                <Button size="lg" variant="secondary" className="gap-2">
                  <Gift className="size-4" /> Free 3 Min Trial
                </Button>
                <Button size="icon" variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/10" aria-label="Save to favorites">
                  <Heart className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </SectionContainer>
      </section>

      <SectionContainer>
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <Tabs defaultValue="about">
            <TabsList variant="line" className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="specialties">Specialties</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-6 space-y-6">
              <p className="text-muted-foreground">{astrologer.bio}</p>
              {astrologer.gurukul && (
                <div>
                  <h3 className="font-semibold">Vedic Lineage</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{astrologer.gurukul}</p>
                </div>
              )}
              {astrologer.education && astrologer.education.length > 0 && (
                <div>
                  <h3 className="font-semibold">Education</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {astrologer.education.map((e) => <li key={e}>• {e}</li>)}
                  </ul>
                </div>
              )}
              {astrologer.awards && astrologer.awards.length > 0 && (
                <div>
                  <h3 className="font-semibold">Awards</h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {astrologer.awards.map((a) => <li key={a}>🏆 {a}</li>)}
                  </ul>
                </div>
              )}
              <div>
                <h3 className="font-semibold">Languages</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {astrologer.languages.map((l) => <Badge key={l} variant="outline">{l}</Badge>)}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="specialties" className="mt-6">
              <div className="flex flex-wrap gap-2">
                {astrologer.specialties.map((s) => (
                  <span key={s} className="rounded-full border border-[var(--color-gold)]/40 bg-[var(--color-gold)]/10 px-4 py-1.5 text-sm font-medium text-[var(--color-gold)]">
                    {s}
                  </span>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reviews" className="mt-6 space-y-4">
              <div className="flex items-center gap-4 rounded-xl border p-5">
                <p className="font-heading text-4xl font-bold text-[var(--color-gold)]">{astrologer.rating}</p>
                <div>
                  <div className="flex text-[var(--color-gold)]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`size-4 ${i < Math.round(astrologer.rating) ? "fill-current" : ""}`} />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">{astrologer.reviews.toLocaleString()} verified reviews</p>
                </div>
              </div>
              <div className="rounded-xl border p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="size-9"><AvatarFallback>P</AvatarFallback></Avatar>
                  <div>
                    <p className="text-sm font-semibold">Priya M. <Badge variant="secondary" className="ml-1 text-[0.65rem]">Verified</Badge></p>
                    <div className="flex text-[var(--color-gold)]">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-3 fill-current" />)}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  &ldquo;{astrologer.name.split(" ")[0]} predicted my job change exactly as it happened. Incredibly precise and warm consultation.&rdquo;
                </p>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="mt-6">
              <div className="grid gap-4 sm:grid-cols-3">
                {packages.map((pkg) => (
                  <div
                    key={pkg.name}
                    className={`rounded-xl border p-5 ${pkg.popular ? "border-[var(--color-gold)]" : ""}`}
                  >
                    {pkg.popular && <Badge className="mb-2 bg-[var(--color-gold)] text-[#2b0b0e] hover:bg-[var(--color-gold)]">Popular</Badge>}
                    <p className="font-semibold">{pkg.name}</p>
                    <p className="text-sm text-muted-foreground">{pkg.duration}</p>
                    <p className="mt-3 text-2xl font-bold text-[var(--color-gold)]">₹{pkg.price}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="faq" className="mt-6 space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">How accurate are your predictions?</p>
                <p className="mt-1">Accuracy depends on precise birth details and my connection to the classical texts I was trained in — I maintain a high accuracy rate across {astrologer.consultations} consultations.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground">Can you suggest remedies?</p>
                <p className="mt-1">Yes, including gemstones, mantras, and lifestyle adjustments tailored to your chart.</p>
              </div>
            </TabsContent>
          </Tabs>

          <aside className="space-y-6">
            <div className="rounded-xl border p-5">
              <h3 className="font-semibold">Quick Stats</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-muted-foreground">Response Time</dt><dd>&lt; 2 min</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Satisfaction Rate</dt><dd>98.4%</dd></div>
                <div className="flex justify-between"><dt className="text-muted-foreground">Repeat Clients</dt><dd>65%</dd></div>
              </dl>
            </div>
            <div>
              <h3 className="mb-3 font-semibold">Similar Astrologers</h3>
              <div className="space-y-3">
                {similar.map((a) => (
                  <Link key={a.id} href={`/astrologer/${a.slug}`} className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-[var(--color-gold)]">
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-[var(--color-cosmic)] text-xs text-white">{a.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">₹{a.price}/min • {a.rating}★</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </SectionContainer>

      <SectionContainer className="border-t">
        <h2 className="mb-5 text-2xl font-bold">You May Also Like</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {similar.map((a) => <AstrologerCard key={a.id} astrologer={a} />)}
        </div>
      </SectionContainer>
    </>
  );
}
