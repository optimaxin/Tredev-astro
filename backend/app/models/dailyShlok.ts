export interface DailyShlokRow {
  shlok_date: string;
  text_en: string;
  text_hi: string;
  created_at: number;
  updated_at: number;
}

export interface PublicDailyShlok {
  date: string;
  textEn: string;
  textHi: string;
}

export function toPublicDailyShlok(row: DailyShlokRow): PublicDailyShlok {
  return { date: row.shlok_date, textEn: row.text_en, textHi: row.text_hi };
}
