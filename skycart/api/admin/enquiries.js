const { requireAdmin } = require('../_lib/requireAdmin');
const { listAll } = require('../_lib/crud');

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    return listAll(res, 'service_enquiries', { order: { col: 'created_at', asc: false } });
  }

  res.setHeader('Allow', 'GET');
  return res.status(405).json({ error: 'Method not allowed' });
};
