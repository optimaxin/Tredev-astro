// A curated, hand-picked subset of the real catalog from TredevaAstro's
// sister store, tredevastore.com (not the mock PRODUCTS in mockData.ts,
// which still back the unrelated internal cart/wishlist/checkout demo
// flow). Every card here links straight to that product's real page — this
// site never carries its own cart/checkout for these, by design.
export interface ExternalStoreProduct {
  slug: string;
  name: string;
  price: number; // INR
  mrp: number; // INR, strikethrough compare-at price
  image: string; // absolute URL
}

export const STORE_BASE_URL = 'https://tredevastore.com';
const PRODUCT_IMAGE_BASE = 'https://tredev-gems.onrender.com';

export function storeProductUrl(slug: string): string {
  return `${STORE_BASE_URL}/product/${slug}`;
}

export const EXTERNAL_STORE_PRODUCTS: ExternalStoreProduct[] = [
  {
    slug: '2-mukhi-indian-rudraksh',
    name: '2 Mukhi Indian Rudraksha',
    price: 699,
    mrp: 999,
    image: `${PRODUCT_IMAGE_BASE}/api/media/file/gemora/media/41037bb38c6e4a0698edb16f680db9c0.jpg`,
  },
  {
    slug: '3-mukhi-nepali-rudraksh',
    name: '3 Mukhi (Nepali) Rudraksha',
    price: 899,
    mrp: 1299,
    image: `${PRODUCT_IMAGE_BASE}/api/media/file/gemora/media/23d8c3f2c64141fa8d21d78c1d72d596.jpg`,
  },
  {
    slug: '1-mukhi-kaju-indian',
    name: '1 Mukhi Kaju-Shaped Indian Rudraksha',
    price: 2199,
    mrp: 3599,
    image: `${PRODUCT_IMAGE_BASE}/api/media/file/gemora/media/9ccb91be1fa0468f8e85b8ff8573a2d0.jpg`,
  },
  {
    slug: '1-mukhi-gol-dana-nepali',
    name: '1 Mukhi Gol Dana (Nepali) Rudraksha',
    price: 4199,
    mrp: 5999,
    image: `${PRODUCT_IMAGE_BASE}/api/media/file/gemora/media/3a7b5a4b9f144b31954588218e96a33f.jpg`,
  },
  {
    slug: '0-mukhi-nepali-rudraksha',
    name: 'Nirakar (0 Mukhi) Nepali Rudraksha',
    price: 7999,
    mrp: 10999,
    image: `${PRODUCT_IMAGE_BASE}/api/media/file/gemora/media/761628b8bbba47a180852836f19745f7.jpg`,
  },
  {
    slug: '1-mukhi-rudraksh-sawar',
    name: '1 Mukhi Rudraksha (Nepali) — Sawar',
    price: 44999,
    mrp: 69999,
    image: `${PRODUCT_IMAGE_BASE}/api/media/file/gemora/media/7319c4b7057c4403a021a4f66f96dc5e.jpg`,
  },
];
