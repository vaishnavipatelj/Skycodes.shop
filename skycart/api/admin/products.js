const { requireAdmin } = require('../_lib/requireAdmin');
const { listAll, createRow, slugify } = require('../_lib/crud');

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    return listAll(res, 'products', { order: { col: 'created_at' } });
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: 'Title is required' });

    const row = {
      title: b.title,
      slug: slugify(b.title),
      category_id: b.category_id || null,
      price_inr: Number(b.price_inr) || 0,
      discount_price_inr: b.discount_price_inr ? Number(b.discount_price_inr) : null,
      short_description: b.short_description || null,
      description: b.description || null,
      specs: Array.isArray(b.specs) ? b.specs : String(b.specs || '').split(',').map((s) => s.trim()).filter(Boolean),
      images: Array.isArray(b.images) ? b.images : String(b.images || '').split(',').map((s) => s.trim()).filter(Boolean),
      file_path: b.file_path || null,
      is_bestseller: !!b.is_bestseller,
      is_active: b.is_active !== false,
      is_bundle: !!b.is_bundle,
      bundle_includes: Array.isArray(b.bundle_includes) ? b.bundle_includes : null,
    };
    return createRow(res, 'products', row);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
