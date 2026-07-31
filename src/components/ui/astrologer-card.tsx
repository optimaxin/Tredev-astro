"use client";

import { Star, Phone, MessageCircle, Heart, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Astrologer } from "@/lib/mock-data";

const tierColor: Record<Astrologer["tier"], string> = {
  Maharishi: "border-[var(--color-gold)]",
  Acharya: "border-[var(--color-brass)]",
  Pandit: "border-[var(--color-silver)]",
  Vidyarthi: "border-emerald-400",
};

export function AstrologerCard({ astrologer }: { astrologer: Astrologer }) {
  return (
    <div className="group flex flex-col rounded-xl border bg-card p-5 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-gold)]">
      <div className="flex items-start gap-2">
        {astrologer.online && (
          <Badge className="gap-1 bg-[var(--color-success)]/15 text-[var(--color-success)] hover:bg-[var(--color-success)]/15">
            <span className="size-1.5 animate-breathing rounded-full bg-[var(--color-success)]" />
            Online
          </Badge>
        )}
        <Badge variant="secondary" className="gap-1">
          <Gift className="size-3" /> Free 3 Min
        </Badge>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Avatar className={`size-16 border-2 ${tierColor[astrologer.tier]}`}>
          <AvatarFallback className="bg-[var(--color-cosmic)] text-white">
            {astrologer.initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold leading-tight">{astrologer.name}</p>
          <div className="mt-0.5 flex items-center gap-1 text-sm">
            <Star className="size-3.5 fill-[var(--color-gold)] text-[var(--color-gold)]" />
            <span className="font-medium">{astrologer.rating}</span>
            <span className="text-muted-foreground">({astrologer.reviews.toLocaleString()})</span>
          </div>
          <p className="text-xs text-muted-foreground">{astrologer.tier} • {astrologer.experience} yrs</p>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {astrologer.languages.join(", ")}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {astrologer.specialties.map((s) => (
          <Badge key={s} variant="outline" className="text-xs font-normal">
            {s}
          </Badge>
        ))}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{astrologer.consultations} consultations</p>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-lg font-bold text-[var(--color-gold)]">₹{astrologer.price}/min</span>
        <button aria-label="Save to favorites" className="text-muted-foreground transition-colors hover:text-[var(--color-error)]">
          <Heart className="size-5" />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" className="flex-1 gap-1.5 animate-glow-pulse">
          <Phone className="size-4" /> Call
        </Button>
        <Button size="sm" variant="outline" className="flex-1 gap-1.5">
          <MessageCircle className="size-4" /> Chat
        </Button>
      </div>
    </div>
  );
}
