import { randomUUID } from 'node:crypto';
import {
  MAX_BANNERS, countBanners, insertBanner, listBanners, updateBanner as updateBannerRow,
} from '../repositories/bannerRepository.ts';
import type { Banner } from '../repositories/bannerRepository.ts';

export class BannerError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Same ~5MB raw-file ceiling as chat's base64 IMAGE/AUDIO messages
// (chat.routes.ts's sendMessageSchema) — comfortably under the app's 8mb
// JSON body limit (main.ts) once base64's ~33% inflation is accounted for.
const MAX_MEDIA_DATA_CHARS = 7_000_000;

export async function createBanner(params: {
  mediaType: 'image' | 'video'; mediaData: string; linkUrl: string | null;
  heading: string | null; ctaText: string | null; expiresAt: number | null;
}): Promise<Banner> {
  if (params.mediaData.length > MAX_MEDIA_DATA_CHARS) throw new BannerError('Banner file is too large (max ~5MB)', 413);
  if ((await countBanners()) >= MAX_BANNERS) {
    throw new BannerError(`You already have ${MAX_BANNERS} banners — delete one before adding another`, 409);
  }
  return insertBanner({
    id: randomUUID(),
    mediaType: params.mediaType,
    mediaData: params.mediaData,
    linkUrl: params.linkUrl,
    heading: params.heading,
    ctaText: params.ctaText,
    createdAt: Date.now(),
    expiresAt: params.expiresAt,
  });
}

export async function editBanner(id: string, patch: { linkUrl?: string | null; heading?: string | null; ctaText?: string | null; expiresAt?: number | null }): Promise<Banner> {
  const row = await updateBannerRow(id, patch);
  if (!row) throw new BannerError('Banner not found', 404);
  return row;
}

export { listBanners };
