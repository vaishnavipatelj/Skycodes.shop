const { requireAdmin } = require('../_lib/requireAdmin');
const { listAll, createRow, slugify } = require('../_lib/crud');

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    return listAll(res, 'categories', { order: { col: 'sort_order' } });
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: 'Name is required' });
    const row = {
      name: b.name,
      slug: slugify(b.name),
      blurb: b.blurb || null,
      sort_order: Number(b.sort_order) || 0,
      is_featured: b.is_featured !== false,
    };
    return createRow(res, 'categories', row);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
