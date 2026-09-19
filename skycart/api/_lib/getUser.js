// api/_lib/getUser.js
//
// Every request from the logged-in browser must send:
//   Authorization: Bearer <supabase access_token>
//
// The frontend gets that token from supabase.auth.getSession() after the
// user signs in with the anon key. This helper verifies the token server-side
// and returns the real user — never trust a user id sent in the request body.

const { supabaseAdmin } = require('./supabaseAdmin');

async function getUserFromRequest(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

module.exports = { getUserFromRequest };
