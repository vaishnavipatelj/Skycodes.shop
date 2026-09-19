// POST /api/checkout/create-order
//
// Body: { items: [{ id, kind: 'product' | 'course', qty }] }
//
// Replaces the demo checkout() in assets/js/app.js. The browser NEVER sends
// a price — we look every item up in the database and add it up ourselves.
// This is the #1 rule from backend/NOTES.md: never trust a client-sent total.

const { supabaseAdmin } = require('../_lib/supabaseAdmin');
const { getUserFromRequest } = require('../_lib/getUser');
const { razorpay } = require('../_lib/razorpay');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Sign in first' });

  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  try {
    const lines = [];
    let total = 0;

    for (const line of items) {
      const qty = Math.max(1, parseInt(line.qty, 10) || 1);

      if (line.kind === 'product') {
        const { data: product, error } = await supabaseAdmin
          .from('products')
          .select('id, title, price_inr, discount_price_inr, is_active')
          .eq('id', line.id)
          .single();

        if (error || !product || !product.is_active) {
          return res.status(400).json({ error: `Product ${line.id} is not available` });
        }
        const unit = product.discount_price_inr ?? product.price_inr;
        total += unit * qty;
        lines.push({ id: product.id, kind: 'product', title: product.title, qty, unit });

      } else if (line.kind === 'course') {
        const { data: course, error } = await supabaseAdmin
          .from('courses')
          .select('id, title, price_inr, type, is_active')
          .eq('id', line.id)
          .single();

        if (error || !course || !course.is_active || course.type !== 'paid') {
          return res.status(400).json({ error: `Course ${line.id} is not available` });
        }
        total += course.price_inr * qty;
        lines.push({ id: course.id, kind: 'course', title: course.title, qty, unit: course.price_inr });

      } else {
        return res.status(400).json({ error: 'Unknown item kind' });
      }
    }

    if (total <= 0) return res.status(400).json({ error: 'Total must be greater than zero' });

    // Razorpay wants the amount in paise
    const razorpayOrder = await razorpay.orders.create({
      amount: total * 100,
      currency: 'INR',
      notes: { user_id: user.id },
    });

    const { data: order, error: orderErr } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: user.id,
        items: lines,
        razorpay_order_id: razorpayOrder.id,
        status: 'created',
        total_inr: total,
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    return res.status(200).json({
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
      db_order_id: order.id,
    });

  } catch (err) {
    console.error('create-order failed:', err);
    return res.status(500).json({ error: 'Could not create order' });
  }
};
