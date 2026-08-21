export interface TestimonialRow {
  id: number;
  name: string;
  location: string;
  service: string;
  rating: number;
  text: string;
  avatar: string;
  display_order: number;
  created_at: number;
}

export interface PublicTestimonial {
  id: number;
  name: string;
  location: string;
  service: string;
  rating: number;
  text: string;
  avatar: string;
}

export function toPublicTestimonial(row: TestimonialRow): PublicTestimonial {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    service: row.service,
    rating: row.rating,
    text: row.text,
    avatar: row.avatar,
  };
}
