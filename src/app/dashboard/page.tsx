import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHero } from "@/components/ui/page-hero";
import { Section } from "@/components/ui/section";
import { WalletCard } from "@/components/dashboard/wallet-card";

export const metadata: Metadata = {
  title: "Dashboard — AstroTredev",
};

const KIND_LABEL: Record<string, string> = {
  consultation: "Consultation",
  puja: "Puja Booking",
  course: "Course Enrollment",
  report: "Premium Report",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let bookings: any[] = [];
  try {
    bookings = await db.booking.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
  } catch (e) {
    console.warn("[dashboard] Could not fetch user bookings:", e);
  }

  return (
    <>
      <PageHero eyebrow="Account" title="Your Dashboard" breadcrumb={[{ label: "Home", href: "/" }, { label: "Dashboard" }]} />
      <Section>
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6">
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <p className="mt-1 text-lg font-semibold">{user.phone}</p>
            </div>
            <WalletCard balancePaise={user.wallet?.balancePaise ?? 0} />
          </div>

          <div>
            <h2 className="font-heading text-xl">Your Bookings</h2>
            {bookings.length === 0 ? (
              <div className="mt-4 rounded-xl border bg-card p-8 text-center text-muted-foreground">
                No bookings yet. Talk to an astrologer to get started.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {bookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-xl border bg-card p-4">
                    <div>
                      <p className="font-medium">{KIND_LABEL[b.kind] ?? b.kind}</p>
                      <p className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm">₹{(b.amountPaise / 100).toFixed(2)}</p>
                      <p className="text-xs capitalize text-[var(--color-success)]">{b.paymentStatus.replace("_", " ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>
    </>
  );
}
