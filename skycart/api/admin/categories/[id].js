const { requireAdmin } = require('../../_lib/requireAdmin');
const { updateRow, deleteRow, slugify } = require('../../_lib/crud');
const { supabaseAdmin } = require('../../_lib/supabaseAdmin');

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const b = req.body || {};
    const patch = {};
    ['blurb', 'is_featured'].forEach((k) => { if (k in b) patch[k] = b[k]; });
    if ('name' in b) { patch.name = b.name; patch.slug = slugify(b.name); }
    if ('sort_order' in b) patch.sort_order = Number(b.sort_order);
    return updateRow(res, 'categories', id, patch);
  }

  if (req.method === 'DELETE') {
    const { count, error } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id);
    if (error) return res.status(500).json({ error: error.message });
    if (count > 0) return res.status(400).json({ error: 'Move its products to another category first' });
    return deleteRow(res, 'categories', id);
  }

  res.setHeader('Allow', 'PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};
