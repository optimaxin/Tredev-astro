export interface ReviewRow {
  id: string;
  astrologer_id: number;
  user_id: string;
  consultation_id: string;
  rating: number;
  text: string;
  created_at: number;
}

export interface PublicReview {
  id: string;
  astrologerId: number;
  rating: number;
  text: string;
  createdAt: number;
  authorName: string;
}

export function toPublicReview(row: ReviewRow, authorName: string): PublicReview {
  return {
    id: row.id,
    astrologerId: row.astrologer_id,
    rating: row.rating,
    text: row.text,
    createdAt: Number(row.created_at),
    authorName,
  };
}
