import type { AstrologerCatalogRow } from '../models/astrologer.ts';
import type { ConsultationType } from '../models/types.ts';

// Minimum astrologer price required for each offer tier, so the discounted
// price never drops below ~₹10 (spec: 20% OFF needs >=13, 50% OFF needs
// >=20, 75% OFF needs >=40).
export const MIN_PRICE_FOR_OFFER: Record<number, number> = { 20: 13, 50: 20, 75: 40 };

function currentPriceFor(astro: AstrologerCatalogRow, type: ConsultationType): number {
  return type === 'chat' ? astro.chat_price : type === 'voice' ? astro.call_price : astro.video_price;
}

function oldPriceFor(astro: AstrologerCatalogRow, type: ConsultationType): number | null {
  return type === 'chat' ? astro.price_increase_old_chat_price
    : type === 'voice' ? astro.price_increase_old_call_price
    : astro.price_increase_old_video_price;
}

// Can this astrologer turn ON this percent offer right now, given their
// CURRENT per-type prices? Checked against every consultation type they
// actually offer (price > 0) — an inactive channel (price 0, meaning they
// don't do that type) shouldn't block activation.
export function canActivateOffer(astro: AstrologerCatalogRow, percent: number, consultationTypes: ConsultationType[]): { ok: boolean; reason?: string } {
  if (percent === 0) return { ok: true };
  const minPrice = MIN_PRICE_FOR_OFFER[percent];
  if (!minPrice) return { ok: false, reason: 'Invalid offer percent' };
  for (const type of consultationTypes) {
    const price = currentPriceFor(astro, type);
    if (price > 0 && price < minPrice) {
      return { ok: false, reason: `Your ${type} price (₹${price}) is below the ₹${minPrice} minimum required for a ${percent}% OFF offer` };
    }
  }
  return { ok: true };
}

// Computes the actual per-minute price to lock onto a NEW consultation, and
// the offer percent actually applied (for display/audit). This is called
// exactly once, at session creation — never recalculated mid-session, so
// neither a later offer toggle nor the user crossing the loyalty threshold
// retroactively changes what an in-progress session is charging.
export function computeEffectivePrice(astro: AstrologerCatalogRow, type: ConsultationType, isLoyal: boolean): { pricePerMin: number; appliedOfferPercent: number } {
  const now = Date.now();
  const currentPrice = currentPriceFor(astro, type);
  const oldPrice = oldPriceFor(astro, type);
  const priceIncreaseActive = oldPrice != null && astro.price_increase_expires_at != null && now < Number(astro.price_increase_expires_at);
  const basePrice = priceIncreaseActive ? oldPrice! : currentPrice;

  const offerPercent = astro.active_offer_percent || 0;
  // Loyal users get exactly half the astrologer's active discount percent.
  const appliedOfferPercent = offerPercent > 0 ? (isLoyal ? offerPercent / 2 : offerPercent) : 0;
  const pricePerMin = Math.round(basePrice * (1 - appliedOfferPercent / 100));
  return { pricePerMin, appliedOfferPercent };
}

// Region pricing layers on top of computeEffectivePrice rather than folding
// into it — offer/loyalty pricing is per-astrologer data already on the
// catalog row, while a region multiplier comes from a lookup keyed by the
// VISITOR's detected country (pricingRegionRepository.getMultiplierForCountry),
// a different axis entirely. Keeping them separate means an existing caller
// of computeEffectivePrice is untouched unless it deliberately opts into
// region adjustment by calling this instead.
export function applyRegionMultiplier(pricePerMin: number, regionMultiplier: number): number {
  return Math.round(pricePerMin * regionMultiplier);
}

export function computeRegionAdjustedPrice(astro: AstrologerCatalogRow, type: ConsultationType, isLoyal: boolean, regionMultiplier: number): { pricePerMin: number; appliedOfferPercent: number } {
  const { pricePerMin, appliedOfferPercent } = computeEffectivePrice(astro, type, isLoyal);
  return { pricePerMin: applyRegionMultiplier(pricePerMin, regionMultiplier), appliedOfferPercent };
}
