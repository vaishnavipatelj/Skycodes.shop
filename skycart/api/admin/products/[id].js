const { requireAdmin } = require('../../_lib/requireAdmin');
const { updateRow, deleteRow, slugify } = require('../../_lib/crud');

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const b = req.body || {};
    const patch = {};
    ['category_id', 'short_description', 'description', 'file_path', 'is_bestseller', 'is_active', 'is_bundle'].forEach((k) => {
      if (k in b) patch[k] = b[k];
    });
    if ('title' in b) { patch.title = b.title; patch.slug = slugify(b.title); }
    if ('price_inr' in b) patch.price_inr = Number(b.price_inr);
    if ('discount_price_inr' in b) patch.discount_price_inr = b.discount_price_inr ? Number(b.discount_price_inr) : null;
    if ('specs' in b) patch.specs = Array.isArray(b.specs) ? b.specs : String(b.specs || '').split(',').map((s) => s.trim()).filter(Boolean);
    if ('images' in b) patch.images = Array.isArray(b.images) ? b.images : String(b.images || '').split(',').map((s) => s.trim()).filter(Boolean);
    return updateRow(res, 'products', id, patch);
  }

  if (req.method === 'DELETE') return deleteRow(res, 'products', id);

  res.setHeader('Allow', 'PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};
