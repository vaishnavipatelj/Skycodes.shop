const { requireAdmin } = require('../../_lib/requireAdmin');
const { deleteRow } = require('../../_lib/crud');

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id } = req.query;

  if (req.method === 'DELETE') return deleteRow(res, 'lessons', id);

  res.setHeader('Allow', 'DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
};
