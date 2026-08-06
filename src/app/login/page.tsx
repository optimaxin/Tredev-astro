import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { Section } from "@/components/ui/section";
import { OtpLoginForm } from "@/components/auth/otp-login-form";

export const metadata: Metadata = {
  title: "Login — AstroTredev",
  description: "Sign in to AstroTredev with your phone number.",
};

export default function LoginPage() {
  return (
    <>
      <PageHero
        eyebrow="Account"
        title="Welcome Back"
        subtitle="Sign in with your phone number — no password to remember."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Login" }]}
      />
      <Section className="flex justify-center">
        <div className="w-full max-w-sm rounded-xl border bg-card p-6">
          <OtpLoginForm />
        </div>
      </Section>
    </>
  );
}
