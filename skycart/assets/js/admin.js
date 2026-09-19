/* SkyCodes — admin panel. Every write here goes through the /api/admin/*
   routes (service-role key on the server, gated on ADMIN_EMAIL). Nothing
   in this file talks to localStorage for products/courses/services/
   categories/reviews/enquiries/orders any more — those are real. */
const Admin = (() => {
const { money, esc, toast, art, initials, openModal, closeAll, go, render, $, $$, api } = SkyCodes;

const TABS = [['dash', 'Dashboard'], ['products', 'Products'], ['categories', 'Categories'], ['courses', 'Courses'],
  ['services', 'Services'], ['orders', 'Orders'], ['enquiries', 'Enquiries'], ['reviews', 'Reviews'], ['data', 'Data']];

/* ---------- server-backed cache ---------- */
const cache = { products: [], categories: [], courses: [], services: [], reviews: [], enquiries: [], orders: [] };
let loaded = false, loading = false, loadError = null;

async function loadAll() {
  loading = true; loadError = null;
  try {
    const [p, c, k, s, r, e, o] = await Promise.all([
      api('/api/admin/products', undefined, 'GET'),
      api('/api/admin/categories', undefined, 'GET'),
      api('/api/admin/courses', undefined, 'GET'),
      api('/api/admin/services', undefined, 'GET'),
      api('/api/admin/reviews', undefined, 'GET'),
      api('/api/admin/enquiries', undefined, 'GET'),
      api('/api/admin/orders', undefined, 'GET')
    ]);
    cache.products = p.data; cache.categories = c.data; cache.courses = k.data;
    cache.services = s.data; cache.reviews = r.data; cache.enquiries = e.data; cache.orders = o.data;
    loaded = true;
  } catch (err) {
    loadError = err.message || 'Could not load admin data';
  } finally {
    loading = false;
  }
}

function priceOf(p) { return p.discount_price_inr || p.price_inr; }
function categoryOf(id) { return cache.categories.find(c => c.id === id); }
function productOf(id) { return cache.products.find(p => p.id === id); }
function courseOf(id) { return cache.courses.find(c => c.id === id); }
function serviceOf(id) { return cache.services.find(s => s.id === id); }

/* ---------- page shell ---------- */
function page(q) {
  if (loadError) {
    return `<div class="wrap"><div class="empty" style="margin:80px 0">
      <h3>Can't load admin data</h3><p>${esc(loadError)}</p>
      <p style="color:var(--muted);font-size:.9rem;margin-top:8px">If this says "Not authorized", the signed-in account's email doesn't match ADMIN_EMAIL in Vercel's environment variables.</p>
      <button class="btn btn-primary" data-retry>Try again</button></div></div>`;
  }
  if (!loaded) {
    if (!loading) loadAll().then(render);
    return `<div class="wrap"><div class="empty" style="margin:80px 0"><h3>Loading admin data…</h3><p>Pulling products, orders, reviews and enquiries from the database.</p></div></div>`;
  }

  const tab = q.atab || 'dash';
  return `
  <div class="wrap">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;padding:36px 0 6px;flex-wrap:wrap">
      <div><h1 style="font-size:2.1rem">Admin</h1>
        <p style="color:var(--muted)">Every change here writes straight to the real database.</p></div>
      <a class="btn btn-ghost" href="#/">View storefront</a>
    </div>
    <div class="tabs">${TABS.map(([v, l]) => `<button class="${tab === v ? 'active' : ''}" data-atab="${v}">${l}</button>`).join('')}</div>
    <div style="padding-bottom:90px">${views[tab]()}</div>
  </div>`;
}

const views = {};

views.dash = () => {
  const P = cache.products, O = cache.orders.filter(o => o.status === 'paid');
  const revenue = O.reduce((s, o) => s + (o.total_inr || 0), 0);
  const pending = cache.reviews.filter(r => !r.is_approved).length;
  const openEnq = cache.enquiries.filter(e => e.status !== 'closed').length;
  return `
  <div class="stat-grid">
    <div class="stat"><strong>${P.filter(p => p.is_active).length}</strong><span>live products</span></div>
    <div class="stat"><strong>${cache.courses.length}</strong><span>courses</span></div>
    <div class="stat"><strong>${O.length}</strong><span>paid orders</span></div>
    <div class="stat"><strong>${money(revenue)}</strong><span>revenue</span></div>
    <div class="stat"><strong>${openEnq}</strong><span>open enquiries</span></div>
    <div class="stat"><strong>${pending}</strong><span>reviews to moderate</span></div>
  </div>
  <h3 style="margin:10px 0 14px">Top sellers</h3>
  <table class="table">
    <tr><th>Product</th><th>Category</th><th>Price</th><th>Sales</th></tr>
    ${P.slice().sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0)).slice(0, 8).map(p => `<tr>
      <td>${esc(p.title)}</td><td>${esc((categoryOf(p.category_id) || {}).name || '—')}</td>
      <td>${money(priceOf(p))}</td><td>${p.sales_count || 0}</td></tr>`).join('')}
  </table>`;
};

views.products = () => `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap">
    <input type="text" id="pSearch" placeholder="Filter products…" style="max-width:280px" />
    <button class="btn btn-primary" data-new="product">Add product</button>
  </div>
  <table class="table" id="pTable">
    <tr><th></th><th>Title</th><th>Category</th><th>Price</th><th>Deal</th><th>Flags</th><th>Live</th><th></th></tr>
    ${cache.products.map(p => `<tr data-row="${esc(p.title.toLowerCase())}">
      <td><span style="width:34px;height:34px;border-radius:8px;display:grid;place-items:center;font-size:.72rem;font-weight:700;${art(p.id + p.title)}">${initials(p.title)}</span></td>
      <td>${esc(p.title)}</td>
      <td>${esc(categoryOf(p.category_id) ? categoryOf(p.category_id).name : '—')}</td>
      <td>${money(p.price_inr)}</td>
      <td>${p.discount_price_inr ? money(p.discount_price_inr) : '—'}</td>
      <td>${p.is_bestseller ? '<span class="pill">Best</span>' : ''}${p.is_bundle ? '<span class="pill">Bundle</span>' : ''}</td>
      <td><button class="mini" data-toggle="${p.id}">${p.is_active ? 'Visible' : 'Hidden'}</button></td>
      <td style="white-space:nowrap">
        <button class="mini" data-edit="${p.id}">Edit</button>
        <button class="mini danger" data-del="${p.id}">Delete</button></td></tr>`).join('')}
  </table>`;

views.categories = () => `
  <div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn btn-primary" data-new="category">Add category</button></div>
  <table class="table">
    <tr><th>Name</th><th>Slug</th><th>Description</th><th>Products</th><th>Featured</th><th></th></tr>
    ${cache.categories.map(c => `<tr>
      <td>${esc(c.name)}</td><td style="color:var(--muted)">${esc(c.slug)}</td><td style="color:var(--muted)">${esc(c.blurb || '')}</td>
      <td>${cache.products.filter(p => p.category_id === c.id).length}</td>
      <td><button class="mini" data-cfeat="${c.id}">${c.is_featured ? 'On homepage' : 'Hidden'}</button></td>
      <td style="white-space:nowrap"><button class="mini" data-cedit="${c.id}">Edit</button>
      <button class="mini danger" data-cdel="${c.id}">Delete</button></td></tr>`).join('')}
  </table>`;

views.courses = () => `
  <div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn btn-primary" data-new="course">Add course</button></div>
  <table class="table">
    <tr><th>Title</th><th>Type</th><th>Price</th><th>Lessons</th><th>Level</th><th>Live</th><th></th></tr>
    ${cache.courses.map(c => `<tr>
      <td>${esc(c.title)}</td><td><span class="pill ${c.type}">${c.type}</span></td>
      <td>${c.price_inr ? money(c.price_inr) : 'Free'}</td><td>${(c.lessons || []).length}</td><td>${esc(c.level || '—')}</td>
      <td><button class="mini" data-ktoggle="${c.id}">${c.is_active ? 'Visible' : 'Hidden'}</button></td>
      <td style="white-space:nowrap"><button class="mini" data-kedit="${c.id}">Edit</button>
      <button class="mini" data-klessons="${c.id}">Lessons</button>
      <button class="mini danger" data-kdel="${c.id}">Delete</button></td></tr>`).join('')}
  </table>`;

views.services = () => `
  <div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn btn-primary" data-new="service">Add service</button></div>
  <table class="table">
    <tr><th>Service</th><th>Description</th><th>Group</th><th>Live</th><th></th></tr>
    ${cache.services.map(s => `<tr>
      <td>${esc(s.title)}</td><td style="color:var(--muted)">${esc(s.description || '')}</td><td>${esc(s.category || '—')}</td>
      <td><button class="mini" data-stoggle="${s.id}">${s.is_active ? 'Visible' : 'Hidden'}</button></td>
      <td style="white-space:nowrap"><button class="mini" data-sedit="${s.id}">Edit</button>
      <button class="mini danger" data-sdel="${s.id}">Delete</button></td></tr>`).join('')}
  </table>`;

views.orders = () => cache.orders.length ? `
  <table class="table">
    <tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr>
    ${cache.orders.map(o => `<tr>
      <td>${String(o.id).slice(0, 8).toUpperCase()}</td><td>${new Date(o.created_at).toLocaleString('en-IN')}</td>
      <td>${esc(o.customer_email || '—')}</td>
      <td>${(o.items || []).map(i => esc(i.title)).join(', ')}</td><td>${money(o.total_inr)}</td>
      <td><span class="pill ${o.status === 'paid' ? 'free' : ''}">${esc(o.status)}</span></td></tr>`).join('')}
  </table>` : `<div class="empty"><h3>No orders yet</h3><p>Orders placed on the storefront land here with their real payment status.</p></div>`;

views.enquiries = () => cache.enquiries.length ? `
  <table class="table">
    <tr><th>Date</th><th>Name</th><th>Email</th><th>Service</th><th>Budget</th><th>Message</th><th>Status</th></tr>
    ${cache.enquiries.map(q => {
      const s = q.service_id ? serviceOf(q.service_id) : null;
      return `<tr><td>${new Date(q.created_at).toLocaleDateString('en-IN')}</td><td>${esc(q.name)}</td><td>${esc(q.email)}</td>
      <td>${s ? esc(s.title) : 'General'}</td><td>${esc(q.budget_range || '—')}</td>
      <td style="color:var(--muted);max-width:340px">${esc(q.project_description || '')}</td>
      <td><button class="mini" data-estatus="${q.id}" data-current="${q.status}">${esc(q.status)}</button></td></tr>`;
    }).join('')}
  </table>` : `<div class="empty"><h3>No enquiries yet</h3><p>Quote requests from the services page and the contact page appear here once that form is wired to the database.</p></div>`;

views.reviews = () => cache.reviews.length ? `
  <table class="table">
    <tr><th>Product</th><th>Reviewer</th><th>Rating</th><th>Comment</th><th>Approved</th><th></th></tr>
    ${cache.reviews.map(r => {
      const p = r.product_id ? productOf(r.product_id) : null;
      return `<tr><td>${p ? esc(p.title) : '—'}</td><td>${esc(r.user_name)}</td><td>${r.rating}/5</td>
      <td style="color:var(--muted);max-width:360px">${esc(r.comment)}</td>
      <td><button class="mini" data-rapprove="${r.id}" data-current="${r.is_approved ? '1' : '0'}">${r.is_approved ? 'Approved' : 'Pending'}</button></td>
      <td><button class="mini danger" data-rdel="${r.id}">Delete</button></td></tr>`;
    }).join('')}
  </table>` : `<div class="empty"><h3>No reviews yet</h3><p>Once the review form is wired to the database, submissions queue here for moderation.</p></div>`;

views.data = () => `
  <div class="buy-box" style="max-width:640px;margin:0">
    <h3 style="margin-bottom:10px">Catalogue data</h3>
    <p style="color:var(--muted);font-size:.92rem">Products, categories, courses, services and reviews all now live in Supabase.
    Export the current state as a backup, or reload it from the server.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
      <button class="btn btn-primary" data-export>Export catalogue as JSON</button>
      <button class="btn btn-ghost" data-reload>Reload from server</button>
    </div>
  </div>`;

/* ---------- forms ---------- */
const field = (label, name, val = '', type = 'text') =>
  `<div class="field"><label><small>${label}</small>${type === 'textarea'
    ? `<textarea name="${name}" rows="3">${esc(val)}</textarea>`
    : `<input type="${type}" name="${name}" value="${esc(val)}" />`}</label></div>`;

function productForm(p) {
  const isNew = !p;
  p = p || { specs: [], images: [], is_active: true };
  openModal(`
    <h3>${isNew ? 'Add product' : 'Edit product'}</h3>
    <p class="muted">Saved straight to the products table — live on the storefront right after.</p>
    <form data-psave="${isNew ? '' : p.id}">
      ${field('Title', 'title', p.title || '')}
      <div class="field"><label><small>Category</small><select name="category_id" style="width:100%">
        ${cache.categories.map(c => `<option value="${c.id}" ${p.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
      </select></label></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${field('Price (INR) — 0 = free download', 'price_inr', p.price_inr ?? '', 'number')}
        ${field('Discounted price (blank = no deal)', 'discount_price_inr', p.discount_price_inr || '', 'number')}
      </div>
      ${field('Short description (card text)', 'short_description', p.short_description || '')}
      ${field('Full description', 'description', p.description || '', 'textarea')}
      ${field('Specs, comma separated', 'specs', (p.specs || []).join(', '))}
      ${field('Image URLs, comma separated (first one is the cover)', 'images', (p.images || []).join(', '))}
      ${field('Private file path', 'file_path', p.file_path || 'private/products/new.zip')}
      <label class="check"><input type="checkbox" name="is_bestseller" ${p.is_bestseller ? 'checked' : ''}> Mark as best seller</label>
      <label class="check"><input type="checkbox" name="is_active" ${p.is_active ? 'checked' : ''}> Visible on the storefront</label>
      <button class="btn btn-primary btn-block" style="margin-top:16px" type="submit">${isNew ? 'Add product' : 'Save changes'}</button>
    </form>`);
}

function courseForm(c) {
  const isNew = !c;
  c = c || { type: 'paid', is_active: true, lessons: [] };
  openModal(`
    <h3>${isNew ? 'Add course' : 'Edit course'}</h3>
    <form data-ksave="${isNew ? '' : c.id}">
      ${field('Title', 'title', c.title || '')}
      <div class="field"><label><small>Type</small><select name="type" style="width:100%">
        <option value="free" ${c.type === 'free' ? 'selected' : ''}>Free (hosted on YouTube)</option>
        <option value="paid" ${c.type === 'paid' ? 'selected' : ''}>Paid (hosted here)</option></select></label></div>
      ${field('Price (INR, paid only)', 'price_inr', c.price_inr || '', 'number')}
      ${field('YouTube URL (free only)', 'external_url', c.external_url || '')}
      ${field('Level', 'level', c.level || 'Beginner')}
      ${field('Hours', 'hours', c.hours || 4, 'number')}
      ${field('Description', 'description', c.description || '', 'textarea')}
      <label class="check"><input type="checkbox" name="is_active" ${c.is_active ? 'checked' : ''}> Visible on the storefront</label>
      <button class="btn btn-primary btn-block" style="margin-top:16px" type="submit">${isNew ? 'Add course' : 'Save changes'}</button>
    </form>`);
}

function lessonsForm(c) {
  openModal(`
    <h3>Lessons · ${esc(c.title)}</h3>
    <p class="muted">Order is the order students see.</p>
    <div>${(c.lessons || []).map((l, i) => `<div class="lesson"><span class="dot">${i + 1}</span>
      <div><strong style="font-size:.92rem">${esc(l.title)}</strong><br><small>${esc(l.duration || '')}</small></div>
      <button class="mini danger" data-ldel="${l.id}">Remove</button></div>`).join('') || '<p style="color:var(--muted)">No lessons yet.</p>'}</div>
    <form data-ladd="${c.id}" style="margin-top:18px;display:grid;grid-template-columns:1fr 110px auto;gap:10px;align-items:end">
      <label><small>Lesson title</small><input type="text" name="title" required /></label>
      <label><small>Duration</small><input type="text" name="duration" value="10:00" /></label>
      <button class="btn btn-primary" type="submit">Add</button>
    </form>`);
}

function serviceForm(s) {
  const isNew = !s; s = s || { is_active: true };
  openModal(`
    <h3>${isNew ? 'Add service' : 'Edit service'}</h3>
    <form data-ssave="${isNew ? '' : s.id}">
      ${field('Title', 'title', s.title || '')}
      ${field('Description', 'description', s.description || '', 'textarea')}
      ${field('Group', 'category', s.category || 'Cloud')}
      <label class="check"><input type="checkbox" name="is_active" ${s.is_active ? 'checked' : ''}> Visible on the services page</label>
      <button class="btn btn-primary btn-block" style="margin-top:16px" type="submit">Save</button>
    </form>`);
}

function categoryForm(c) {
  const isNew = !c; c = c || { is_featured: true };
  openModal(`
    <h3>${isNew ? 'Add category' : 'Edit category'}</h3>
    <form data-csave="${isNew ? '' : c.id}">
      ${field('Name', 'name', c.name || '')}
      ${field('One-line description', 'blurb', c.blurb || '')}
      ${field('Sort order', 'sort_order', c.sort_order ?? cache.categories.length + 1, 'number')}
      <label class="check"><input type="checkbox" name="is_featured" ${c.is_featured ? 'checked' : ''}> Show on the homepage</label>
      <button class="btn btn-primary btn-block" style="margin-top:16px" type="submit">Save</button>
    </form>`);
}

const refresh = async () => { await loadAll(); render(); };
async function guarded(fn) {
  try { await fn(); }
  catch (err) { toast(err.message || 'That did not save', 'err'); }
}

/* ---------- wiring ---------- */
let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  const view = $('#view');

  view.addEventListener('click', async e => {
    const b = e.target.closest('button,[data-export],[data-reload],[data-retry]');
    if (!b) return;
    const d = b.dataset;

    if (d.atab) return go('#/admin?atab=' + d.atab);
    if ('retry' in d) { loadError = null; loaded = false; return refresh(); }
    if ('reload' in d) { toast('Reloading…'); return refresh(); }

    if (d.new === 'product') return productForm(null);
    if (d.new === 'course') return courseForm(null);
    if (d.new === 'service') return serviceForm(null);
    if (d.new === 'category') return categoryForm(null);

    if (d.edit) return productForm(productOf(d.edit));
    if (d.toggle) return guarded(async () => {
      const p = productOf(d.toggle);
      await api('/api/admin/products/' + d.toggle, { is_active: !p.is_active }, 'PATCH');
      toast(!p.is_active ? 'Product is live' : 'Product hidden', 'ok');
      await refresh();
    });
    if (d.del) {
      if (!confirm('Delete this product? Hiding it keeps the order history tidier.')) return;
      return guarded(async () => {
        await api('/api/admin/products/' + d.del, undefined, 'DELETE');
        toast('Product deleted', 'ok'); await refresh();
      });
    }

    if (d.cedit) return categoryForm(categoryOf(d.cedit));
    if (d.cfeat) return guarded(async () => {
      const c = categoryOf(d.cfeat);
      await api('/api/admin/categories/' + d.cfeat, { is_featured: !c.is_featured }, 'PATCH');
      await refresh();
    });
    if (d.cdel) return guarded(async () => {
      await api('/api/admin/categories/' + d.cdel, undefined, 'DELETE');
      toast('Category deleted', 'ok'); await refresh();
    });

    if (d.kedit) return courseForm(courseOf(d.kedit));
    if (d.klessons) return lessonsForm(courseOf(d.klessons));
    if (d.ktoggle) return guarded(async () => {
      const c = courseOf(d.ktoggle);
      await api('/api/admin/courses/' + d.ktoggle, { is_active: !c.is_active }, 'PATCH');
      await refresh();
    });
    if (d.kdel) {
      if (!confirm('Delete this course?')) return;
      return guarded(async () => {
        await api('/api/admin/courses/' + d.kdel, undefined, 'DELETE');
        toast('Course deleted', 'ok'); await refresh();
      });
    }
    if (d.ldel) return guarded(async () => {
      await api('/api/admin/lessons/' + d.ldel, undefined, 'DELETE');
      await refresh();
    });

    if (d.sedit) return serviceForm(serviceOf(d.sedit));
    if (d.stoggle) return guarded(async () => {
      const s = serviceOf(d.stoggle);
      await api('/api/admin/services/' + d.stoggle, { is_active: !s.is_active }, 'PATCH');
      await refresh();
    });
    if (d.sdel) return guarded(async () => {
      await api('/api/admin/services/' + d.sdel, undefined, 'DELETE');
      await refresh();
    });

    if (d.rapprove) return guarded(async () => {
      const next = d.current !== '1';
      await api('/api/admin/reviews/' + d.rapprove, { is_approved: next }, 'PATCH');
      toast(next ? 'Review published' : 'Review unpublished', 'ok'); await refresh();
    });
    if (d.rdel) return guarded(async () => {
      await api('/api/admin/reviews/' + d.rdel, undefined, 'DELETE');
      await refresh();
    });

    if (d.estatus) return guarded(async () => {
      const next = { new: 'contacted', contacted: 'closed', closed: 'new' }[d.current];
      await api('/api/admin/enquiries/' + d.estatus, { status: next }, 'PATCH');
      await refresh();
    });

    if ('export' in d) {
      const blob = new Blob([JSON.stringify(cache, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'skycodes-catalogue.json'; a.click(); toast('Catalogue exported', 'ok'); return;
    }
  });

  view.addEventListener('input', e => {
    if (e.target.id !== 'pSearch') return;
    const t = e.target.value.toLowerCase();
    $$('#pTable tr[data-row]').forEach(tr => tr.style.display = tr.dataset.row.includes(t) ? '' : 'none');
  });

  view.addEventListener('submit', e => e.preventDefault());
}

let saveBound = false;
async function onSave(e) {
  const form = e.target;
  const d = form.dataset;
  const has = ['psave', 'ksave', 'ssave', 'csave', 'ladd'].some(k => k in d);
  if (!has) return;
  e.preventDefault();
  const v = Object.fromEntries(new FormData(form));
  const on = n => !!form.querySelector(`[name="${n}"]:checked`);
  const submitBtn = form.querySelector('button[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;

  await guarded(async () => {
    if ('psave' in d) {
      const body = {
        title: v.title, category_id: v.category_id,
        price_inr: v.price_inr, discount_price_inr: v.discount_price_inr || null,
        short_description: v.short_description, description: v.description,
        specs: v.specs, images: v.images, file_path: v.file_path,
        is_bestseller: on('is_bestseller'), is_active: on('is_active')
      };
      if (d.psave) await api('/api/admin/products/' + d.psave, body, 'PATCH');
      else await api('/api/admin/products', body, 'POST');
      closeAll(); toast(d.psave ? 'Product saved' : 'Product added', 'ok'); await refresh(); return;
    }

    if ('ksave' in d) {
      const body = {
        title: v.title, type: v.type, price_inr: v.type === 'paid' ? (v.price_inr || 0) : null,
        external_url: v.external_url || null, level: v.level, hours: v.hours, description: v.description,
        is_active: on('is_active')
      };
      if (d.ksave) await api('/api/admin/courses/' + d.ksave, body, 'PATCH');
      else await api('/api/admin/courses', body, 'POST');
      closeAll(); toast('Course saved', 'ok'); await refresh(); return;
    }

    if ('ssave' in d) {
      const body = { title: v.title, description: v.description, category: v.category, is_active: on('is_active') };
      if (d.ssave) await api('/api/admin/services/' + d.ssave, body, 'PATCH');
      else await api('/api/admin/services', body, 'POST');
      closeAll(); toast('Service saved', 'ok'); await refresh(); return;
    }

    if ('csave' in d) {
      const body = { name: v.name, blurb: v.blurb, sort_order: v.sort_order, is_featured: on('is_featured') };
      if (d.csave) await api('/api/admin/categories/' + d.csave, body, 'PATCH');
      else await api('/api/admin/categories', body, 'POST');
      closeAll(); toast('Category saved', 'ok'); await refresh(); return;
    }

    if ('ladd' in d) {
      await api('/api/admin/lessons', { course_id: d.ladd, title: v.title, duration: v.duration || '10:00' }, 'POST');
      await loadAll();
      toast('Lesson added', 'ok');
      lessonsForm(courseOf(d.ladd));
      return;
    }
  });

  if (submitBtn) submitBtn.disabled = false;
}

/* bind form saves once, globally (modals live outside #view) */
if (!saveBound) { document.addEventListener('submit', onSave); saveBound = true; }

return { page, wire };
})();
