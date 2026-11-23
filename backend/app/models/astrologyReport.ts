export interface AstrologyReportRow {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  pages: number;
  sections: number;
  price: number;
  original_price: number | null;
  popular: number;
  color: string;
  icon: string;
  category: string;
  display_order: number;
  created_at: number;
  // Cover customization (migration 074) — all optional, fall back to the
  // plain `color`-themed card look when unset.
  cover_color: string | null;
  cover_pattern: string | null;
  cover_image: string | null;
}

export interface PublicAstrologyReport {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  pages: number;
  sections: number;
  price: number;
  originalPrice: number | null;
  popular: boolean;
  color: string;
  icon: string;
  category: string;
  coverColor: string | null;
  coverPattern: string | null;
  coverImage: string | null;
}

export function toPublicAstrologyReport(row: AstrologyReportRow): PublicAstrologyReport {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    pages: row.pages,
    sections: row.sections,
    price: row.price,
    originalPrice: row.original_price,
    popular: !!row.popular,
    color: row.color,
    icon: row.icon,
    category: row.category,
    coverColor: row.cover_color,
    coverPattern: row.cover_pattern,
    coverImage: row.cover_image,
  };
}
