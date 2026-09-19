const { requireAdmin } = require('../../_lib/requireAdmin');
const { updateRow, deleteRow } = require('../../_lib/crud');

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const b = req.body || {};
    const patch = {};
    if ('is_approved' in b) patch.is_approved = !!b.is_approved;
    return updateRow(res, 'reviews', id, patch);
  }

  if (req.method === 'DELETE') return deleteRow(res, 'reviews', id);

  res.setHeader('Allow', 'PATCH, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};
