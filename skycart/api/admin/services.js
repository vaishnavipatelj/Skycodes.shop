const { requireAdmin } = require('../_lib/requireAdmin');
const { listAll, createRow } = require('../_lib/crud');

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') return listAll(res, 'services');

  if (req.method === 'POST') {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: 'Title is required' });
    const row = {
      title: b.title,
      description: b.description || null,
      category: b.category || null,
      is_active: b.is_active !== false,
    };
    return createRow(res, 'services', row);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
