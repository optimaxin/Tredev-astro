import Link from "next/link";
import { MessageCircle, ArrowUp, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/ui/page-hero";
import { SectionContainer } from "@/components/ui/section-container";
import { communityPosts } from "@/lib/mock-data";

const categoryColor: Record<string, string> = {
  Question: "text-[var(--color-cta)]",
  "Success Story": "text-[var(--color-success)]",
  "Daily Shloka": "text-[var(--color-gold)]",
};

export default function CommunityPage() {
  return (
    <>
      <PageHero
        eyebrow="Spiritual Discussions"
        title="Community"
        subtitle="Ask questions, share your journey, and connect with fellow seekers and verified Gurus."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Community" }]}
      />
      <SectionContainer>
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{communityPosts.length} recent discussions</p>
          <Button>Start a Discussion</Button>
        </div>
        <div className="space-y-4">
          {communityPosts.map((post) => (
            <Link
              key={post.id}
              href="#"
              className="flex gap-4 rounded-xl border p-5 transition-colors hover:border-[var(--color-gold)]"
            >
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ArrowUp className="size-4" />
                <span className="text-sm font-semibold">{post.upvotes}</span>
              </div>
              <div className="flex-1">
                <span className={`text-xs font-semibold uppercase tracking-wide ${categoryColor[post.category] ?? "text-muted-foreground"}`}>
                  {post.category}
                </span>
                <h3 className="mt-1 font-semibold">{post.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{post.excerpt}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>by {post.author}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="size-3.5" /> {post.replies} replies</span>
                  {post.isExpertAnswered && (
                    <span className="flex items-center gap-1 text-[var(--color-success)]"><BadgeCheck className="size-3.5" /> Expert Answered</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </SectionContainer>
    </>
  );
}
