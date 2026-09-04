export type DeliveryStatus = 'PROCESSING' | 'SHIPPED' | 'DELIVERED';

export interface OrderItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderRow {
  id: number;
  user_id: string;
  items: OrderItem[];
  amount: number;
  shipping_name: string;
  shipping_address: string;
  shipping_city: string;
  shipping_zip: string;
  delivery_status: DeliveryStatus;
  created_at: number;
}

// "ORD-<id>" display id, derived directly from the numeric primary key
// (no offset) — the admin client strips this prefix to get the raw id back
// for the delivery-status PATCH route, so keeping it a direct wrap (not an
// arbitrary +1000 offset) keeps that reversible without extra bookkeeping.
export function orderDisplayId(id: number): string {
  return `ORD-${id}`;
}

export function toPublicOrder(row: OrderRow) {
  return {
    id: orderDisplayId(row.id),
    items: row.items,
    amount: row.amount,
    shipping: { name: row.shipping_name, address: row.shipping_address, city: row.shipping_city, zip: row.shipping_zip },
    deliveryStatus: row.delivery_status,
    createdAt: Number(row.created_at),
  };
}
