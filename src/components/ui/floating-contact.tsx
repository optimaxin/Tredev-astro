"use client";

import { useState } from "react";
import Link from "next/link";
import { Phone, MessageCircle, X, Sparkles } from "lucide-react";

export function FloatingContact() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="flex flex-col gap-2 rounded-2xl border bg-card p-3 shadow-lg">
          <Link href="/talk-to-astrologer" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-muted">
            <Phone className="size-4 text-[var(--color-success)]" /> Call an Astrologer
          </Link>
          <Link href="/chat-with-astrologer" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-muted">
            <MessageCircle className="size-4 text-[var(--color-marigold)]" /> Chat Now
          </Link>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close contact menu" : "Open contact menu"}
        className="animate-glow-pulse flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-sindoor)] to-[var(--color-marigold)] text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X className="size-6" /> : <Sparkles className="size-6" />}
      </button>
    </div>
  );
}
