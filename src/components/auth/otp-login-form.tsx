"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OtpLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Something went wrong");
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/otp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    setLoading(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Invalid code");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  if (step === "phone") {
    return (
      <form onSubmit={requestCode} className="space-y-4">
        <div>
          <Label htmlFor="phone" className="mb-1.5">Phone number</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              required
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
          {loading ? "Sending code..." : "Send OTP"} <ArrowRight className="size-4" />
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          No SMS provider configured yet — check the server console for your code.
        </p>
      </form>
    );
  }

  return (
    <form onSubmit={verifyCode} className="space-y-4">
      <div>
        <Label htmlFor="code" className="mb-1.5">Enter the 6-digit code</Label>
        <div className="relative">
          <ShieldCheck className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="code"
            required
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="pl-9 tracking-[0.3em]"
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
        {loading ? "Verifying..." : "Verify & Continue"} <ArrowRight className="size-4" />
      </Button>
      <button
        type="button"
        onClick={() => { setStep("phone"); setCode(""); setError(null); }}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
      >
        Use a different number
      </button>
    </form>
  );
}
