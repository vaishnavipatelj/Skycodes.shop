// POST /api/enroll/free
//
// Body: { courseId }
//
// Replaces the free-course branch of enrol() in assets/js/app.js. Paid
// courses never come through here — they go through
// /api/checkout/create-order + the Razorpay webhook instead.

const { supabaseAdmin } = require('../_lib/supabaseAdmin');
const { getUserFromRequest } = require('../_lib/getUser');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Sign in first' });

  const { courseId } = req.body || {};
  if (!courseId) return res.status(400).json({ error: 'Missing courseId' });

  try {
    const { data: course, error: courseErr } = await supabaseAdmin
      .from('courses')
      .select('id, type, is_active')
      .eq('id', courseId)
      .single();

    if (courseErr || !course || !course.is_active) {
      return res.status(404).json({ error: 'Course not found' });
    }
    if (course.type !== 'free') {
      return res.status(400).json({ error: 'This course requires payment' });
    }

    const { error: insertErr } = await supabaseAdmin
      .from('enrollments')
      .upsert(
        { user_id: user.id, course_id: courseId, progress_pct: 0 },
        { onConflict: 'user_id,course_id', ignoreDuplicates: true }
      );

    if (insertErr) throw insertErr;

    return res.status(200).json({ enrolled: true });

  } catch (err) {
    console.error('free enroll failed:', err);
    return res.status(500).json({ error: 'Could not enroll' });
  }
};
