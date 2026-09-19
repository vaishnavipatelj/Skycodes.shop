const { requireAdmin } = require('../_lib/requireAdmin');
const { supabaseAdmin } = require('../_lib/supabaseAdmin');

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  // orders.user_id points at auth.users, which PostgREST can't join across
  // schemas — so resolve each unique buyer's email separately.
  const ids = [...new Set(orders.map((o) => o.user_id).filter(Boolean))];
  const emailById = {};
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      if (data && data.user) emailById[id] = data.user.email;
    })
  );

  const withEmail = orders.map((o) => ({ ...o, customer_email: emailById[o.user_id] || null }));
  return res.status(200).json({ data: withEmail });
};
