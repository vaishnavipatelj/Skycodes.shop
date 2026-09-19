const { requireAdmin } = require('../_lib/requireAdmin');
const { createRow } = require('../_lib/crud');
const { supabaseAdmin } = require('../_lib/supabaseAdmin');

module.exports = async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const b = req.body || {};
  if (!b.course_id || !b.title) return res.status(400).json({ error: 'course_id and title are required' });

  const { count, error: countErr } = await supabaseAdmin
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', b.course_id);
  if (countErr) return res.status(500).json({ error: countErr.message });

  const row = {
    course_id: b.course_id,
    title: b.title,
    duration: b.duration || '10:00',
    video_url: b.video_url || null,
    order_index: count || 0,
  };
  return createRow(res, 'lessons', row);
};
