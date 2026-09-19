const { requireAdmin } = require('../_lib/requireAdmin');
const { createRow, slugify } = require('../_lib/crud');
const { supabaseAdmin } = require('../_lib/supabaseAdmin');

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('courses')
      .select('*, lessons(id,title,duration,order_index,video_url)')
      .order('created_at');
    if (error) return res.status(500).json({ error: error.message });
    // keep lessons in the order students will see them
    data.forEach((c) => c.lessons.sort((a, b) => a.order_index - b.order_index));
    return res.status(200).json({ data });
  }

  if (req.method === 'POST') {
    const b = req.body || {};
    if (!b.title) return res.status(400).json({ error: 'Title is required' });
    const type = b.type === 'paid' ? 'paid' : 'free';
    const row = {
      title: b.title,
      slug: slugify(b.title),
      type,
      price_inr: type === 'paid' ? Number(b.price_inr) || 0 : null,
      description: b.description || null,
      external_url: b.external_url || null,
      level: b.level || null,
      hours: b.hours ? Number(b.hours) : null,
      is_active: b.is_active !== false,
    };
    return createRow(res, 'courses', row, { select: '*, lessons(id,title,duration,order_index,video_url)' });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};
