import { query, queryOne } from '../core/db.ts';
import type { BlogPostRow } from '../models/blogPost.ts';

export function listBlogPosts(): Promise<BlogPostRow[]> {
  return query<BlogPostRow>('SELECT * FROM blog_posts ORDER BY published_at DESC');
}

export function findBlogPostById(id: number): Promise<BlogPostRow | undefined> {
  return queryOne<BlogPostRow>('SELECT * FROM blog_posts WHERE id = $1', [id]);
}
