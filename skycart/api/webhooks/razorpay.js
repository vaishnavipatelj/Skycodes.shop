// POST /api/webhooks/razorpay
//
// Configured in the Razorpay dashboard under Settings → Webhooks, pointed at
// https://skycodes.shop/api/webhooks/razorpay, subscribed to "payment.captured".
//
// This is the ONLY code path that ever sets orders.status = 'paid', grants
// course enrollments, or issues download links. The client's success
// callback (fulfil() in app.js) must never do this itself — per NOTES.md,
// only the verified webhook grants access.
//
// Razorpay retries webhooks, so every step here is written to be safe to
// run twice on the same order (idempotent).

const crypto = require('crypto');
const { supabaseAdmin } = require('../_lib/supabaseAdmin');

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('RAZORPAY_WEBHOOK_SECRET is not set');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers['x-razorpay-signature'];

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const sigOk = typeof signature === 'string' &&
    signature.length === expectedSignature.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));

  if (!sigOk) {
    console.warn('Razorpay webhook: signature mismatch');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(rawBody);

  if (event.event !== 'payment.captured') {
    // Acknowledge anything we don't act on so Razorpay stops retrying it.
    return res.status(200).json({ received: true });
  }

  const payment = event.payload.payment.entity;
  const razorpayOrderId = payment.order_id;
  const razorpayPaymentId = payment.id;

  try {
    const { data: order, error: findErr } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('razorpay_order_id', razorpayOrderId)
      .single();

    if (findErr || !order) {
      console.error('Webhook: no matching order for', razorpayOrderId);
      return res.status(200).json({ received: true }); // ack anyway, nothing to retry
    }

    // Idempotency: if we've already processed this order, stop here.
    if (order.status === 'paid') {
      return res.status(200).json({ received: true, already_processed: true });
    }

    await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: signature,
      })
      .eq('id', order.id);

    // Grant course access for any course lines in this order.
    const courseLines = (order.items || []).filter((l) => l.kind === 'course');
    for (const line of courseLines) {
      await supabaseAdmin
        .from('enrollments')
        .upsert(
          { user_id: order.user_id, course_id: line.id, progress_pct: 0 },
          { onConflict: 'user_id,course_id', ignoreDuplicates: true }
        );
    }

    // Digital product downloads are signed on-demand by
    // /api/downloads/:productId — nothing to precompute here.
    // TODO: send the confirmation + download email (Resend). See NOTES.md.

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('Webhook processing failed:', err);
    // Return 500 so Razorpay retries — safe because every step above is idempotent.
    return res.status(500).json({ error: 'Processing failed' });
  }
};

// Vercel: turn off automatic body parsing so we can verify the RAW body
// against the signature header. A re-serialized JSON body will not match.
// This MUST come after module.exports = ... or it gets overwritten.
module.exports.config = {
  api: { bodyParser: false },
};
