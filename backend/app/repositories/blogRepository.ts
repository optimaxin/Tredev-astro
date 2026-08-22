import { query, queryOne } from '../core/db.ts';
import type { BlogPostRow } from '../models/blogPost.ts';

export function listBlogPosts(): Promise<BlogPostRow[]> {
  return query<BlogPostRow>('SELECT * FROM blog_posts ORDER BY published_at DESC');
}

export function findBlogPostById(id: number): Promise<BlogPostRow | undefined> {
  return queryOne<BlogPostRow>('SELECT * FROM blog_posts WHERE id = $1', [id]);
}

export async function createBlogPost(params: {
  title: string; category: string; readTime: string; excerpt: string; content: string; tag: string; featured: boolean;
}): Promise<BlogPostRow> {
  const row = await queryOne<BlogPostRow>(
    `INSERT INTO blog_posts (title, category, read_time, excerpt, content, tag, featured, published_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING *`,
    [params.title, params.category, params.readTime, params.excerpt, params.content, params.tag, params.featured ? 1 : 0, Date.now()]
  );
  return row!;
}

export async function deleteBlogPost(id: number) {
  await query('DELETE FROM blog_posts WHERE id = $1', [id]);
}
