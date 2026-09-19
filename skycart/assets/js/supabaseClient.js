/* Supabase client for the browser. The URL and the "anon"/"publishable" key
   are meant to be public — every table they can touch is protected by the
   Row Level Security policies in backend/supabase-schema.sql. This file is
   safe to commit to GitHub. */

const supabaseClient = window.supabase.createClient(
  'https://wtybltozcmjxnqmwisce.supabase.co',
  'PASTE_YOUR_ANON_PUBLISHABLE_KEY_HERE'
);
