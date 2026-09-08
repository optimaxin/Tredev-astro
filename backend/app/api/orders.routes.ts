import { Router } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { listOrdersForUser } from '../repositories/orderRepository.ts';
import { toPublicOrder } from '../models/order.ts';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

// Order creation moved to payments.routes.ts (POST /api/payments/orders with
// purpose: 'STORE_ORDER') — a real Cashfree payment now gates it, so an
// order row is only ever created from a paid intent's fulfillment, never
// directly from a client POST. This router is read-only from here on.

ordersRouter.get('/mine', async (req, res) => {
  const rows = await listOrdersForUser(req.user!.id);
  res.json({ success: true, data: rows.map(toPublicOrder) });
});
