// api/admin/_lib/requireAdmin.js
//
// Every admin route calls this first. It reuses the same Supabase Auth
// token check as the storefront routes, then additionally requires the
// signed-in email to match ADMIN_EMAIL — per backend/NOTES.md:
// "Admin writes — server actions using the service role key, gated on the
// owner's user id."
//
// Set ADMIN_EMAIL in Vercel to the email you sign in with. There is no
// separate admin login — you sign in on the storefront like any customer,
// and this check recognizes that account as the owner.

const { getUserFromRequest } = require('../../_lib/getUser');

async function requireAdmin(req, res) {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: 'Sign in first' });
    return null;
  }

  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  if (!adminEmail || (user.email || '').toLowerCase() !== adminEmail) {
    res.status(403).json({ error: 'Not authorized' });
    return null;
  }

  return user;
}

module.exports = { requireAdmin };
