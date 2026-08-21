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
  };
}
