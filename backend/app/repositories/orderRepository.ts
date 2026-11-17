import { query, queryOne } from '../core/db.ts';
import type { DeliveryStatus, OrderItem, OrderRow } from '../models/order.ts';

export interface NewOrderInput {
  userId: string;
  items: OrderItem[];
  amount: number;
  shippingName: string;
  shippingAddress: string;
  shippingCity: string;
  shippingZip: string;
}

export async function createOrder(input: NewOrderInput): Promise<OrderRow> {
  const rows = await query<OrderRow>(
    `INSERT INTO orders (user_id, items, amount, shipping_name, shipping_address, shipping_city, shipping_zip, delivery_status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'PROCESSING', $8)
     RETURNING *`,
    [input.userId, JSON.stringify(input.items), input.amount, input.shippingName, input.shippingAddress, input.shippingCity, input.shippingZip, Date.now()]
  );
  return rows[0]!;
}

export function listOrdersForUser(userId: string) {
  return query<OrderRow>('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
}

export async function countOrdersForUser(userId: string): Promise<number> {
  const row = await queryOne<{ n: string }>('SELECT COUNT(*) AS n FROM orders WHERE user_id = $1', [userId]);
  return Number(row?.n ?? 0);
}

export async function getOrderStats(): Promise<{ count: number; total: number }> {
  const row = await queryOne<{ n: string; total: string }>('SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS total FROM orders');
  return { count: Number(row?.n ?? 0), total: Number(row?.total ?? 0) };
}

export function listRecentDeliveredOrders(limit: number) {
  return query<OrderRow & { user_name: string }>(
    `SELECT o.*, u.name AS user_name
     FROM orders o
     JOIN users u ON u.id = o.user_id
     WHERE o.delivery_status = 'DELIVERED'
     ORDER BY o.created_at DESC
     LIMIT $1`,
    [limit]
  );
}

export async function listAllOrders(page: number, limit: number) {
  const totalRow = await queryOne<{ n: string }>('SELECT COUNT(*) AS n FROM orders');
  const rows = await query<OrderRow & { user_name: string; user_email: string }>(
    `SELECT o.*, u.name AS user_name, u.email AS user_email
     FROM orders o
     JOIN users u ON u.id = o.user_id
     ORDER BY o.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit]
  );
  return { rows, total: Number(totalRow?.n ?? 0) };
}

export async function updateOrderDeliveryStatus(id: number, status: DeliveryStatus): Promise<OrderRow | null> {
  const rows = await query<OrderRow>('UPDATE orders SET delivery_status = $1 WHERE id = $2 RETURNING *', [status, id]);
  return rows[0] ?? null;
}
