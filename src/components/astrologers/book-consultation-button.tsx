"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BookConsultationButton({
  astrologerId,
  amountPaise,
  children,
  ...buttonProps
}: {
  astrologerId: string;
  amountPaise: number;
} & React.ComponentProps<typeof Button>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleBook() {
    setLoading(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "consultation", refId: astrologerId, amountPaise }),
    });
    setLoading(false);
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.ok) router.push("/dashboard");
  }

  return (
    <Button onClick={handleBook} disabled={loading} {...buttonProps}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : children}
    </Button>
  );
}
