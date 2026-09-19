const { requireAdmin } = require('../../_lib/requireAdmin');
const { updateRow } = require('../../_lib/crud');

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  const { id } = req.query;

  if (req.method === 'PATCH') {
    const b = req.body || {};
    if (!['new', 'contacted', 'closed'].includes(b.status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    return updateRow(res, 'service_enquiries', id, { status: b.status });
  }

  res.setHeader('Allow', 'PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
};
