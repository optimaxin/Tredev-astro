import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";
import { blogPosts } from "@/lib/mock-data";

export function BlogPreview() {
  return (
    <Section>
      <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-[var(--color-marigold)]/10 text-[var(--color-marigold)]">
        <BookOpen className="size-5" />
      </div>
      <SectionHeading heading="Learn Astrology" subheading="Expert articles, guides & remedies" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {blogPosts.map((post) => (
          <Link key={post.href} href={post.href} className="group rounded-xl border p-5 transition-colors hover:border-[var(--color-marigold)]">
            <div className="aspect-video rounded-lg bg-gradient-to-br from-[var(--color-ink)] to-[var(--color-sindoor)]" />
            <span className="mt-3 inline-block text-xs font-medium text-[var(--color-sindoor)]">{post.category}</span>
            <h3 className="mt-1 font-semibold leading-snug group-hover:text-[var(--color-marigold)]">{post.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
            <p className="mt-3 text-xs text-muted-foreground">{post.author} • {post.readTime}</p>
          </Link>
        ))}
      </div>
    </Section>
  );
}
