import Link from "next/link";
import { Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OmMark } from "@/components/ui/om-mark";
import { SectionContainer } from "@/components/ui/section-container";

export default function LoginPage() {
  return (
    <SectionContainer className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border p-8 text-center">
        <OmMark className="mx-auto text-3xl" />
        <h1 className="mt-3 text-2xl font-bold">Welcome Back</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to continue your journey.</p>

        <form className="mt-6 space-y-4 text-left">
          <div>
            <Label htmlFor="login-phone" className="mb-1.5">Phone Number</Label>
            <Input id="login-phone" type="tel" placeholder="+91 98765 43210" />
          </div>
          <Button type="submit" size="lg" className="w-full gap-2">
            <Phone className="size-4" /> Send OTP
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
        </div>

        <Button variant="outline" className="w-full gap-2">
          <Mail className="size-4" /> Continue with Email
        </Button>

        <p className="mt-6 text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link> and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>
    </SectionContainer>
  );
}
