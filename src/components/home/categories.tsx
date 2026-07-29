import Link from "next/link";
import { SectionContainer, SectionHeading } from "@/components/ui/section-container";
import { categories } from "@/lib/mock-data";

export function Categories() {
  return (
    <SectionContainer>
      <SectionHeading heading="What's Troubling You?" subheading="Get expert guidance for any life challenge" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Link
            key={cat.title}
            href={cat.href}
            className={`group rounded-xl bg-gradient-to-br ${cat.gradient} p-6 text-white transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.02]`}
          >
            <span className="text-3xl">{cat.icon}</span>
            <h3 className="mt-3 text-lg font-semibold">{cat.title}</h3>
            <p className="mt-1 text-sm text-white/85">{cat.description}</p>
          </Link>
        ))}
      </div>
    </SectionContainer>
  );
}
