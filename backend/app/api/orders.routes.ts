import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.ts';
import { createOrder, listOrdersForUser } from '../repositories/orderRepository.ts';
import { toPublicOrder } from '../models/order.ts';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

function fail(res: import('express').Response, status: number, code: string, message: string) {
  res.status(status).json({ success: false, error: { code, message } });
}

// There's no server-side product catalog (Store's product list is static
// frontend data, same as CONTENT_MODULES) and no real payment gateway
// anywhere in this app — same trust model already used for consultation
// pricing (see chat.routes.ts). `amount` is computed here from the items
// themselves rather than trusted as a separate client-sent total, so it's
// at least internally consistent.
const orderItemSchema = z.object({
  productId: z.number().int(),
  name: z.string().trim().min(1).max(200),
  price: z.number().nonnegative(),
  quantity: z.number().int().min(1).max(50),
});

const placeOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(50),
  shipping: z.object({
    name: z.string().trim().min(1).max(150),
    address: z.string().trim().min(1).max(300),
    city: z.string().trim().min(1).max(100),
    zip: z.string().trim().min(1).max(20),
  }),
});

ordersRouter.post('/', async (req, res) => {
  const parsed = placeOrderSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const amount = parsed.data.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const row = await createOrder({
    userId: req.user!.id,
    items: parsed.data.items,
    amount,
    shippingName: parsed.data.shipping.name,
    shippingAddress: parsed.data.shipping.address,
    shippingCity: parsed.data.shipping.city,
    shippingZip: parsed.data.shipping.zip,
  });
  res.status(201).json({ success: true, data: toPublicOrder(row) });
});

ordersRouter.get('/mine', async (req, res) => {
  const rows = await listOrdersForUser(req.user!.id);
  res.json({ success: true, data: rows.map(toPublicOrder) });
});
