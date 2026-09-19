// POST /api/downloads/:productId
//
// Replaces the "download" action in assets/js/app.js. Checks the caller
// actually paid for this product, then issues a 15-minute signed URL to the
// private Storage bucket — per NOTES.md: "File protection" section.

const { supabaseAdmin } = require('../_lib/supabaseAdmin');
const { getUserFromRequest } = require('../_lib/getUser');

const SIGNED_URL_TTL_SECONDS = 15 * 60; // 15 minutes, per NOTES.md
const PRIVATE_BUCKET = 'product-files'; // create this bucket in Supabase Storage, set to private

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Sign in first' });

  const { productId } = req.query;
  if (!productId) return res.status(400).json({ error: 'Missing productId' });

  try {
    // Ownership check: does the user have a paid order containing this product?
    const { data: orders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select('id, items, status')
      .eq('user_id', user.id)
      .eq('status', 'paid');

    if (ordersErr) throw ordersErr;

    const owns = (orders || []).some((o) =>
      (o.items || []).some((line) => line.kind === 'product' && line.id === productId)
    );

    if (!owns) {
      return res.status(403).json({ error: 'You have not purchased this product' });
    }

    const { data: product, error: productErr } = await supabaseAdmin
      .from('products')
      .select('file_path, title')
      .eq('id', productId)
      .single();

    if (productErr || !product || !product.file_path) {
      return res.status(404).json({ error: 'File not found for this product' });
    }

    const { data: signed, error: signErr } = await supabaseAdmin
      .storage
      .from(PRIVATE_BUCKET)
      .createSignedUrl(product.file_path, SIGNED_URL_TTL_SECONDS);

    if (signErr) throw signErr;

    return res.status(200).json({
      url: signed.signedUrl,
      expires_in: SIGNED_URL_TTL_SECONDS,
      title: product.title,
    });

  } catch (err) {
    console.error('download signing failed:', err);
    return res.status(500).json({ error: 'Could not generate download link' });
  }
};
