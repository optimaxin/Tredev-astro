// Thin client for real Store orders (backend/app/api/orders.routes.ts).
import { API_URL } from './apiUrl';

export class OrderApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_access_token');
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/orders${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    });
  } catch {
    throw new OrderApiError('NETWORK_ERROR', 'Could not reach the server. Please check your connection.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new OrderApiError(body?.error?.code || 'UNKNOWN', body?.error?.message || 'Something went wrong.');
  }
  return body.data as T;
}

export interface OrderItemInput {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

export interface ShippingInput {
  name: string;
  address: string;
  city: string;
  zip: string;
}

export interface Order {
  id: string;
  items: OrderItemInput[];
  amount: number;
  shipping: ShippingInput;
  deliveryStatus: 'PROCESSING' | 'SHIPPED' | 'DELIVERED';
  createdAt: number;
}

export const orderService = {
  place: (items: OrderItemInput[], shipping: ShippingInput) =>
    request<Order>('/', { method: 'POST', body: JSON.stringify({ items, shipping }) }),

  listMine: () => request<Order[]>('/mine'),
};
