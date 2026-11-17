import { query } from '../core/db.ts';
import type { TestimonialRow } from '../models/testimonial.ts';

export function listTestimonials(): Promise<TestimonialRow[]> {
  return query<TestimonialRow>('SELECT * FROM testimonials ORDER BY display_order ASC');
}
