"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const QUICK_AMOUNTS = [200, 500, 1000];

export function WalletCard({ balancePaise }: { balancePaise: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState<number | null>(null);

  async function topUp(amount: number) {
    setLoading(amount);
    await fetch("/api/wallet/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountPaise: amount * 100 }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Wallet className="size-4" /> Wallet Balance
      </div>
      <p className="mt-1 font-heading text-3xl">₹{(balancePaise / 100).toFixed(2)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {QUICK_AMOUNTS.map((amount) => (
          <Button key={amount} size="sm" variant="outline" disabled={loading !== null} onClick={() => topUp(amount)}>
            {loading === amount ? <Loader2 className="size-3.5 animate-spin" /> : `+ ₹${amount}`}
          </Button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Stub top-up — no payment gateway connected yet.</p>
    </div>
  );
}
