// api/admin/_lib/crud.js
//
// Thin wrappers around supabaseAdmin so each entity's route file only needs
// to declare its table name and field mapping, not repeat error handling.

const { supabaseAdmin } = require('../../_lib/supabaseAdmin');

async function listAll(res, table, opts = {}) {
  let q = supabaseAdmin.from(table).select(opts.select || '*');
  if (opts.order) q = q.order(opts.order.col, { ascending: opts.order.asc !== false });
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ data });
}

async function createRow(res, table, row, opts = {}) {
  const { data, error } = await supabaseAdmin.from(table).insert(row).select(opts.select || '*').single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(201).json({ data });
}

async function updateRow(res, table, id, patch, opts = {}) {
  const { data, error } = await supabaseAdmin.from(table).update(patch).eq('id', id).select(opts.select || '*').single();
  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ data });
}

async function deleteRow(res, table, id) {
  const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ deleted: true });
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

module.exports = { listAll, createRow, updateRow, deleteRow, slugify };
