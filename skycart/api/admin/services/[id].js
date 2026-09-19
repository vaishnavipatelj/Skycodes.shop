const { requireAdmin } = require('../../_lib/requireAdmin');
const { updateRow, deleteRow } = require('../../_lib/crud');

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const b = req.body || {};
    const patch = {};
    ['title', 'description', 'category', 'is_active'].forEach((k) => { if (k in b) patch[k] = b[k]; });
    return updateRow(res, 'services', id, patch);
  }

  if (req.method === 'DELETE') return deleteRow(res, 'services', id);

  res.setHeader('Allow', 'PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};
