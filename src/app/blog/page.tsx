import Link from "next/link";
import { PageHero } from "@/components/ui/page-hero";
import { SectionContainer } from "@/components/ui/section-container";
import { blogPosts } from "@/lib/mock-data";

export default function BlogPage() {
  const [featured, ...rest] = blogPosts;

  return (
    <>
      <PageHero
        eyebrow="Knowledge"
        title="Learn Astrology"
        subtitle="Expert articles, guides, and remedies from our verified Gurus."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Blog" }]}
      />
      <SectionContainer>
        <Link
          href={featured.href}
          className="group grid gap-6 rounded-2xl border p-6 transition-colors hover:border-[var(--color-gold)] sm:grid-cols-2 sm:p-8"
        >
          <div className="aspect-video rounded-xl bg-gradient-to-br from-[var(--color-cosmic)] to-[var(--color-cta)]" />
          <div className="flex flex-col justify-center">
            <span className="text-xs font-medium text-[var(--color-cta)]">{featured.category}</span>
            <h2 className="mt-1 text-2xl font-bold leading-snug group-hover:text-[var(--color-gold)]">{featured.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{featured.excerpt}</p>
            <p className="mt-3 text-xs text-muted-foreground">{featured.author} • {featured.date} • {featured.readTime}</p>
          </div>
        </Link>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((post) => (
            <Link key={post.href} href={post.href} className="group rounded-xl border p-5 transition-colors hover:border-[var(--color-gold)]">
              <div className="aspect-video rounded-lg bg-gradient-to-br from-[var(--color-cosmic)] to-[var(--color-cta)]" />
              <span className="mt-3 inline-block text-xs font-medium text-[var(--color-cta)]">{post.category}</span>
              <h3 className="mt-1 font-semibold leading-snug group-hover:text-[var(--color-gold)]">{post.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
              <p className="mt-3 text-xs text-muted-foreground">{post.author} • {post.readTime}</p>
            </Link>
          ))}
        </div>
      </SectionContainer>
    </>
  );
}
