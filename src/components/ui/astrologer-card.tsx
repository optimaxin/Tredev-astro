"use client";

import { Star, Phone, MessageCircle, Heart, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Astrologer } from "@/lib/mock-data";

const tierColor: Record<Astrologer["tier"], string> = {
  Maharishi: "border-[var(--color-marigold)]",
  Acharya: "border-[var(--color-sindoor)]/60",
  Pandit: "border-[var(--color-mist)]",
  Vidyarthi: "border-emerald-400",
};

export function AstrologerCard({ astrologer }: { astrologer: Astrologer }) {
  return (
    <div className="group flex flex-col items-center rounded-2xl border bg-card p-5 text-center transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-marigold)]">
      <div className="relative">
        <Avatar className={`size-20 border-[3px] ${tierColor[astrologer.tier]}`}>
          <AvatarFallback className="bg-[var(--color-ink)] text-lg text-white">{astrologer.initials}</AvatarFallback>
        </Avatar>
        {astrologer.online && (
          <span className="absolute bottom-0 right-0 size-4 animate-breathing rounded-full border-2 border-card bg-[var(--color-success)]" />
        )}
      </div>

      <p className="mt-3 font-semibold leading-tight">{astrologer.name}</p>
      <div className="mt-0.5 flex items-center gap-1 text-sm">
        <Star className="size-3.5 fill-[var(--color-marigold)] text-[var(--color-marigold)]" />
        <span className="font-medium">{astrologer.rating}</span>
        <span className="text-muted-foreground">({astrologer.reviews.toLocaleString()})</span>
      </div>
      <p className="text-xs text-muted-foreground">{astrologer.tier} • {astrologer.experience} yrs</p>

      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {astrologer.specialties.slice(0, 3).map((s) => (
          <Badge key={s} variant="outline" className="text-xs font-normal">{s}</Badge>
        ))}
      </div>

      <div className="mt-3 flex w-full items-center justify-between">
        <Badge className="gap-1 bg-[var(--color-marigold)]/15 text-[var(--color-marigold)] hover:bg-[var(--color-marigold)]/15">
          <Gift className="size-3" /> Free 3 Min
        </Badge>
        <span className="text-lg font-bold text-[var(--color-marigold)]">₹{astrologer.price}/min</span>
      </div>

      <div className="mt-3 flex w-full gap-2">
        <Button size="sm" className="flex-1 gap-1.5 animate-glow-pulse"><Phone className="size-4" /> Call</Button>
        <Button size="sm" variant="outline" className="flex-1 gap-1.5"><MessageCircle className="size-4" /> Chat</Button>
        <Button size="icon" variant="outline" aria-label="Save to favorites"><Heart className="size-4" /></Button>
      </div>
    </div>
  );
}
