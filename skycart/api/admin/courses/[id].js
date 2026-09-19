const { requireAdmin } = require('../../_lib/requireAdmin');
const { updateRow, deleteRow, slugify } = require('../../_lib/crud');

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const b = req.body || {};
    const patch = {};
    ['type', 'description', 'external_url', 'level', 'is_active'].forEach((k) => {
      if (k in b) patch[k] = b[k];
    });
    if ('title' in b) { patch.title = b.title; patch.slug = slugify(b.title); }
    if ('hours' in b) patch.hours = b.hours ? Number(b.hours) : null;
    if ('price_inr' in b) patch.price_inr = b.price_inr != null && b.price_inr !== '' ? Number(b.price_inr) : null;
    return updateRow(res, 'courses', id, patch);
  }

  if (req.method === 'DELETE') return deleteRow(res, 'courses', id);

  res.setHeader('Allow', 'PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};
