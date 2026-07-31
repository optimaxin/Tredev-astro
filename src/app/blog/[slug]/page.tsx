import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SectionContainer } from "@/components/ui/section-container";
import { blogPosts } from "@/lib/mock-data";

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = blogPosts.find((p) => p.slug === slug);
  if (!post) notFound();

  const related = blogPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <SectionContainer className="max-w-3xl">
      <nav className="mb-6 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> {" / "}
        <Link href="/blog" className="hover:text-foreground">Blog</Link> {" / "}
        <span className="text-foreground">{post.title}</span>
      </nav>

      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--color-cta)]">{post.category}</span>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{post.title}</h1>

      <div className="mt-4 flex items-center gap-3">
        <Avatar><AvatarFallback>{post.author.charAt(0)}</AvatarFallback></Avatar>
        <div className="text-sm">
          <p className="font-medium">{post.author}</p>
          <p className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar className="size-3.5" /> {post.date}</span>
            <span className="flex items-center gap-1"><Clock className="size-3.5" /> {post.readTime}</span>
          </p>
        </div>
      </div>

      <div className="mt-8 aspect-video rounded-xl bg-gradient-to-br from-[var(--color-cosmic)] to-[var(--color-cta)]" />

      <div className="prose prose-neutral dark:prose-invert mt-8 max-w-none space-y-4 text-[15px] leading-relaxed text-foreground">
        {post.content.map((para, i) => <p key={i}>{para}</p>)}
      </div>

      {related.length > 0 && (
        <div className="mt-14 border-t pt-8">
          <h2 className="mb-4 text-xl font-bold">Related Articles</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((p) => (
              <Link key={p.href} href={p.href} className="rounded-xl border p-4 transition-colors hover:border-[var(--color-gold)]">
                <span className="text-xs text-[var(--color-cta)]">{p.category}</span>
                <h3 className="mt-1 text-sm font-semibold leading-snug">{p.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      )}
    </SectionContainer>
  );
}
