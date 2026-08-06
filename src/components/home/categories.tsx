import Link from "next/link";
import { Heart, Briefcase, Coins, Gem, HeartPulse, Plane } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";
import { categories } from "@/lib/mock-data";

const icons = { heart: Heart, briefcase: Briefcase, coins: Coins, gem: Gem, "heart-pulse": HeartPulse, plane: Plane };

export function Categories() {
  return (
    <Section>
      <SectionHeading heading="What's Troubling You?" subheading="Get expert guidance for any life challenge" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat, i) => {
          const Icon = icons[cat.icon as keyof typeof icons];
          const isFeatured = i === 0;
          return (
            <Link
              key={cat.title}
              href={cat.href}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${cat.gradient} p-6 text-white transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.02] ${isFeatured ? "sm:col-span-2 lg:col-span-2 lg:row-span-2" : ""}`}
            >
              <Icon className={isFeatured ? "size-10" : "size-7"} strokeWidth={1.75} />
              <h3 className={`mt-3 font-semibold ${isFeatured ? "text-2xl" : "text-lg"}`}>{cat.title}</h3>
              <p className={`mt-1 text-white/85 ${isFeatured ? "max-w-sm text-base" : "text-sm"}`}>{cat.description}</p>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}
