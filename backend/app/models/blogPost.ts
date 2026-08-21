export interface BlogPostRow {
  id: number;
  title: string;
  category: string;
  read_time: string;
  excerpt: string;
  content: string;
  tag: string;
  featured: number;
  published_at: number;
  created_at: number;
}

export interface PublicBlogPost {
  id: number;
  title: string;
  category: string;
  readTime: string;
  excerpt: string;
  content: string;
  tag: string;
  featured: boolean;
  date: string;
}

export function toPublicBlogPost(row: BlogPostRow): PublicBlogPost {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    readTime: row.read_time,
    excerpt: row.excerpt,
    content: row.content,
    tag: row.tag,
    featured: !!row.featured,
    date: new Date(Number(row.published_at)).toISOString().slice(0, 10),
  };
}
