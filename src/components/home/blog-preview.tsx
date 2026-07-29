import Link from "next/link";
import { SectionContainer, SectionHeading } from "@/components/ui/section-container";
import { blogPosts } from "@/lib/mock-data";

export function BlogPreview() {
  return (
    <SectionContainer>
      <SectionHeading heading="📚 Learn Astrology" subheading="Expert articles, guides & remedies" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {blogPosts.map((post) => (
          <Link key={post.href} href={post.href} className="group rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
            <div className="aspect-video rounded-lg bg-gradient-to-br from-[var(--color-cosmic)] to-[var(--color-cta)]" />
            <span className="mt-3 inline-block text-xs font-medium text-[var(--color-cta)]">{post.category}</span>
            <h3 className="mt-1 font-semibold leading-snug group-hover:text-[var(--color-gold)]">{post.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
            <p className="mt-3 text-xs text-muted-foreground">{post.author} • {post.readTime}</p>
          </Link>
        ))}
      </div>
    </SectionContainer>
  );
}
