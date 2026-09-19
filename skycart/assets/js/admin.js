/* SkyCodes — admin panel. Every product, course, service and review is editable here
   and written straight back to the store, so nothing is hardcoded in the pages. */
const Admin = (() => {
const { money, esc, toast, art, initials, store, openModal, closeAll, go, render, $, $$, price } = SkyCodes;

const TABS = [['dash', 'Dashboard'], ['products', 'Products'], ['categories', 'Categories'], ['courses', 'Courses'],
  ['services', 'Services'], ['orders', 'Orders'], ['enquiries', 'Enquiries'], ['reviews', 'Reviews'], ['data', 'Data']];

function page(q) {
  const tab = q.atab || 'dash';
  return `
  <div class="wrap">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px;padding:36px 0 6px;flex-wrap:wrap">
      <div><h1 style="font-size:2.1rem">Admin</h1>
        <p style="color:var(--muted)">Add, edit, hide or remove anything on the site. Changes appear immediately.</p></div>
      <a class="btn btn-ghost" href="#/">View storefront</a>
    </div>
    <div class="tabs">${TABS.map(([v, l]) => `<button class="${tab === v ? 'active' : ''}" data-atab="${v}">${l}</button>`).join('')}</div>
    <div style="padding-bottom:90px">${views[tab]()}</div>
  </div>`;
}

const views = {};

views.dash = () => {
  const P = DB.products(), O = store.data.orders;
  const revenue = O.reduce((s, o) => s + o.total, 0);
  const pending = DB.allReviews().filter(r => !r.is_approved).length;
  return `
  <div class="stat-grid">
    <div class="stat"><strong>${P.filter(p => p.is_active).length}</strong><span>live products</span></div>
    <div class="stat"><strong>${DB.courses().length}</strong><span>courses</span></div>
    <div class="stat"><strong>${O.length}</strong><span>orders</span></div>
    <div class="stat"><strong>${money(revenue)}</strong><span>revenue</span></div>
    <div class="stat"><strong>${store.data.enquiries.length}</strong><span>enquiries</span></div>
    <div class="stat"><strong>${pending}</strong><span>reviews to moderate</span></div>
  </div>
  <h3 style="margin:10px 0 14px">Top sellers</h3>
  <table class="table">
    <tr><th>Product</th><th>Category</th><th>Price</th><th>Sales</th></tr>
    ${P.slice().sort((a, b) => b.sales_count - a.sales_count).slice(0, 8).map(p => `<tr>
      <td>${esc(p.title)}</td><td>${esc((DB.category(p.category_id) || {}).name || '—')}</td>
      <td>${money(price(p))}</td><td>${p.sales_count}</td></tr>`).join('')}
  </table>`;
};

views.products = () => `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:12px;flex-wrap:wrap">
    <input type="text" id="pSearch" placeholder="Filter products…" style="max-width:280px" />
    <button class="btn btn-primary" data-new="product">Add product</button>
  </div>
  <table class="table" id="pTable">
    <tr><th></th><th>Title</th><th>Category</th><th>Price</th><th>Deal</th><th>Flags</th><th>Live</th><th></th></tr>
    ${DB.products().map(p => `<tr data-row="${esc(p.title.toLowerCase())}">
      <td><span style="width:34px;height:34px;border-radius:8px;display:grid;place-items:center;font-size:.72rem;font-weight:700;${art(p.id + p.title)}">${initials(p.title)}</span></td>
      <td>${esc(p.title)}</td>
      <td>${esc(DB.category(p.category_id) ? DB.category(p.category_id).name : '—')}</td>
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
    ${DB.categories().map(c => `<tr>
      <td>${esc(c.name)}</td><td style="color:var(--muted)">${esc(c.slug)}</td><td style="color:var(--muted)">${esc(c.blurb)}</td>
      <td>${DB.products().filter(p => p.category_id === c.id).length}</td>
      <td><button class="mini" data-cfeat="${c.id}">${c.is_featured ? 'On homepage' : 'Hidden'}</button></td>
      <td style="white-space:nowrap"><button class="mini" data-cedit="${c.id}">Edit</button>
      <button class="mini danger" data-cdel="${c.id}">Delete</button></td></tr>`).join('')}
  </table>`;

views.courses = () => `
  <div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn btn-primary" data-new="course">Add course</button></div>
  <table class="table">
    <tr><th>Title</th><th>Type</th><th>Price</th><th>Lessons</th><th>Level</th><th>Live</th><th></th></tr>
    ${DB.raw.courses.map(c => `<tr>
      <td>${esc(c.title)}</td><td><span class="pill ${c.type}">${c.type}</span></td>
      <td>${c.price_inr ? money(c.price_inr) : 'Free'}</td><td>${c.lessons.length}</td><td>${esc(c.level)}</td>
      <td><button class="mini" data-ktoggle="${c.id}">${c.is_active ? 'Visible' : 'Hidden'}</button></td>
      <td style="white-space:nowrap"><button class="mini" data-kedit="${c.id}">Edit</button>
      <button class="mini" data-klessons="${c.id}">Lessons</button>
      <button class="mini danger" data-kdel="${c.id}">Delete</button></td></tr>`).join('')}
  </table>`;

views.services = () => `
  <div style="display:flex;justify-content:flex-end;margin-bottom:16px"><button class="btn btn-primary" data-new="service">Add service</button></div>
  <table class="table">
    <tr><th>Service</th><th>Description</th><th>Group</th><th>Live</th><th></th></tr>
    ${DB.raw.services.map(s => `<tr>
      <td>${esc(s.title)}</td><td style="color:var(--muted)">${esc(s.description)}</td><td>${esc(s.category)}</td>
      <td><button class="mini" data-stoggle="${s.id}">${s.is_active ? 'Visible' : 'Hidden'}</button></td>
      <td style="white-space:nowrap"><button class="mini" data-sedit="${s.id}">Edit</button>
      <button class="mini danger" data-sdel="${s.id}">Delete</button></td></tr>`).join('')}
  </table>`;

views.orders = () => store.data.orders.length ? `
  <table class="table">
    <tr><th>Order</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr>
    ${store.data.orders.slice().reverse().map(o => `<tr>
      <td>${o.id}</td><td>${new Date(o.created_at).toLocaleString('en-IN')}</td>
      <td>${esc(store.data.user ? store.data.user.email : '—')}</td>
      <td>${o.items.map(i => esc(i.title)).join(', ')}</td><td>${money(o.total)}</td>
      <td><span class="pill free">${o.status}</span></td></tr>`).join('')}
  </table>` : `<div class="empty"><h3>No orders yet</h3><p>Orders placed on the storefront land here with their payment status.</p></div>`;

views.enquiries = () => store.data.enquiries.length ? `
  <table class="table">
    <tr><th>Ref</th><th>Name</th><th>Email</th><th>Service</th><th>Budget</th><th>Message</th><th>Status</th></tr>
    ${store.data.enquiries.slice().reverse().map(q => {
      const s = q.service_id ? DB.raw.services.find(x => x.id === q.service_id) : null;
      return `<tr><td>${q.id}</td><td>${esc(q.name)}</td><td>${esc(q.email)}</td>
      <td>${s ? esc(s.title) : 'General'}</td><td>${esc(q.budget || '—')}</td>
      <td style="color:var(--muted);max-width:340px">${esc(q.description || q.message || '')}</td>
      <td><button class="mini" data-estatus="${q.id}">${q.status}</button></td></tr>`;
    }).join('')}
  </table>` : `<div class="empty"><h3>No enquiries yet</h3><p>Quote requests from the services page appear here and go to your inbox.</p></div>`;

views.reviews = () => DB.allReviews().length ? `
  <table class="table">
    <tr><th>Product</th><th>Reviewer</th><th>Rating</th><th>Comment</th><th>Approved</th><th></th></tr>
    ${DB.allReviews().slice().reverse().map(r => {
      const p = DB.product(r.product_id);
      return `<tr><td>${p ? esc(p.title) : '—'}</td><td>${esc(r.user_name)}</td><td>${r.rating}/5</td>
      <td style="color:var(--muted);max-width:360px">${esc(r.comment)}</td>
      <td><button class="mini" data-rapprove="${r.id}">${r.is_approved ? 'Approved' : 'Pending'}</button></td>
      <td><button class="mini danger" data-rdel="${r.id}">Delete</button></td></tr>`;
    }).join('')}
  </table>` : `<div class="empty"><h3>No reviews yet</h3></div>`;

views.data = () => `
  <div class="buy-box" style="max-width:640px;margin:0">
    <h3 style="margin-bottom:10px">Catalogue data</h3>
    <p style="color:var(--muted);font-size:.92rem">This build keeps the catalogue in the browser so you can try the whole flow
    offline. Export it as JSON to seed your Supabase tables, or reset back to the launch catalogue.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">
      <button class="btn btn-primary" data-export>Export catalogue as JSON</button>
      <button class="btn btn-ghost" data-reset>Reset to launch catalogue</button>
      <button class="btn btn-ghost" data-clearstate>Clear orders and account</button>
    </div>
  </div>`;

/* ---------- forms ---------- */
const field = (label, name, val = '', type = 'text') =>
  `<div class="field"><label><small>${label}</small>${type === 'textarea'
    ? `<textarea name="${name}" rows="3">${esc(val)}</textarea>`
    : `<input type="${type}" name="${name}" value="${esc(val)}" />`}</label></div>`;

function productForm(p) {
  const isNew = !p;
  p = p || { specs: [], is_active: true };
  openModal(`
    <h3>${isNew ? 'Add product' : 'Edit product'}</h3>
    <p class="muted">Anything you change here is live on the storefront straight away.</p>
    <form data-psave="${isNew ? '' : p.id}">
      ${field('Title', 'title', p.title || '')}
      <div class="field"><label><small>Category</small><select name="category_id" style="width:100%">
        ${DB.categories().map(c => `<option value="${c.id}" ${p.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
      </select></label></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${field('Price (INR)', 'price_inr', p.price_inr || '', 'number')}
        ${field('Discounted price (blank = no deal)', 'discount_price_inr', p.discount_price_inr || '', 'number')}
      </div>
      ${field('Short description (card text)', 'short_description', p.short_description || '')}
      ${field('Full description', 'description', p.description || '', 'textarea')}
      ${field('Specs, comma separated', 'specs', (p.specs || []).join(', '))}
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
    <p class="muted">Order is the order students see. Videos stream from private storage once the backend is wired.</p>
    <div>${c.lessons.map((l, i) => `<div class="lesson"><span class="dot">${i + 1}</span>
      <div><strong style="font-size:.92rem">${esc(l.title)}</strong><br><small>${l.duration}</small></div>
      <button class="mini danger" data-ldel="${c.id}:${l.id}">Remove</button></div>`).join('') || '<p style="color:var(--muted)">No lessons yet.</p>'}</div>
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
      ${field('Sort order', 'sort_order', c.sort_order || DB.categories().length + 1, 'number')}
      <label class="check"><input type="checkbox" name="is_featured" ${c.is_featured ? 'checked' : ''}> Show on the homepage</label>
      <button class="btn btn-primary btn-block" style="margin-top:16px" type="submit">Save</button>
    </form>`);
}

const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const refresh = () => { render(); };

/* ---------- wiring ---------- */
let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  const view = $('#view');

  view.addEventListener('click', e => {
    const b = e.target.closest('button,[data-export],[data-reset],[data-clearstate]');
    if (!b) return;
    const d = b.dataset;

    if (d.atab) return go('#/admin?atab=' + d.atab);

    if (d.new === 'product') return productForm(null);
    if (d.new === 'course') return courseForm(null);
    if (d.new === 'service') return serviceForm(null);
    if (d.new === 'category') return categoryForm(null);

    if (d.edit) return productForm(DB.product(d.edit));
    if (d.toggle) { const p = DB.product(d.toggle); p.is_active = !p.is_active; DB.save(); toast(p.is_active ? 'Product is live' : 'Product hidden'); return refresh(); }
    if (d.del) {
      if (!confirm('Delete this product? Hiding it keeps the order history tidier.')) return;
      DB.raw.products = DB.raw.products.filter(p => p.id !== d.del); DB.save(); toast('Product deleted'); return refresh();
    }

    if (d.cedit) return categoryForm(DB.category(d.cedit));
    if (d.cfeat) { const c = DB.category(d.cfeat); c.is_featured = !c.is_featured; DB.save(); return refresh(); }
    if (d.cdel) {
      if (DB.products().some(p => p.category_id === d.cdel)) return toast('Move its products to another category first', 'err');
      DB.raw.categories = DB.raw.categories.filter(c => c.id !== d.cdel); DB.save(); return refresh();
    }

    if (d.kedit) return courseForm(DB.course(d.kedit) || DB.raw.courses.find(c => c.id === d.kedit));
    if (d.klessons) return lessonsForm(DB.raw.courses.find(c => c.id === d.klessons));
    if (d.ktoggle) { const c = DB.raw.courses.find(x => x.id === d.ktoggle); c.is_active = !c.is_active; DB.save(); return refresh(); }
    if (d.kdel) {
      if (!confirm('Delete this course?')) return;
      DB.raw.courses = DB.raw.courses.filter(c => c.id !== d.kdel); DB.save(); return refresh();
    }
    if (d.ldel) {
      const [cid, lid] = d.ldel.split(':');
      const c = DB.raw.courses.find(x => x.id === cid);
      c.lessons = c.lessons.filter(l => l.id !== lid); DB.save(); lessonsForm(c); return;
    }

    if (d.sedit) return serviceForm(DB.raw.services.find(s => s.id === d.sedit));
    if (d.stoggle) { const s = DB.raw.services.find(x => x.id === d.stoggle); s.is_active = !s.is_active; DB.save(); return refresh(); }
    if (d.sdel) { DB.raw.services = DB.raw.services.filter(s => s.id !== d.sdel); DB.save(); return refresh(); }

    if (d.rapprove) { const r = DB.allReviews().find(x => x.id === d.rapprove); r.is_approved = !r.is_approved; DB.save(); toast(r.is_approved ? 'Review published' : 'Review unpublished'); return refresh(); }
    if (d.rdel) { DB.raw.reviews = DB.raw.reviews.filter(r => r.id !== d.rdel); DB.save(); return refresh(); }

    if (d.estatus) {
      const q = store.data.enquiries.find(x => x.id === d.estatus);
      q.status = { new: 'contacted', contacted: 'closed', closed: 'new' }[q.status];
      store.save(); return refresh();
    }

    if ('export' in d) {
      const blob = new Blob([JSON.stringify(DB.raw, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = 'skycodes-catalogue.json'; a.click(); toast('Catalogue exported', 'ok'); return;
    }
    if ('reset' in d) { if (confirm('Reset the catalogue to the launch data?')) { DB.reset(); toast('Catalogue reset'); refresh(); } return; }
    if ('clearstate' in d) {
      if (confirm('Clear orders, cart, wishlist and the signed-in account?')) {
        localStorage.removeItem(store.key); location.reload();
      }
      return;
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
function onSave(e) {
  const form = e.target;
  const d = form.dataset;
  const has = ['psave', 'ksave', 'ssave', 'csave', 'ladd'].some(k => k in d);
  if (!has) return;
  e.preventDefault();
  const v = Object.fromEntries(new FormData(form));
  const on = n => !!form.querySelector(`[name="${n}"]:checked`);

  if ('psave' in d) {
    const p = d.psave ? DB.product(d.psave) : { id: 'p' + Date.now(), sales_count: 0, fulfillment_type: 'digital_download', is_bundle: false, bundle_includes: null, created_at: new Date().toISOString() };
    Object.assign(p, {
      title: v.title, slug: slugify(v.title), category_id: v.category_id,
      price_inr: +v.price_inr, discount_price_inr: v.discount_price_inr ? +v.discount_price_inr : null,
      short_description: v.short_description, description: v.description,
      specs: v.specs.split(',').map(s => s.trim()).filter(Boolean),
      file_path: v.file_path, is_bestseller: on('is_bestseller'), is_active: on('is_active')
    });
    if (!d.psave) DB.raw.products.push(p);
    DB.save(); closeAll(); toast(d.psave ? 'Product saved' : 'Product added', 'ok'); render(); return;
  }

  if ('ksave' in d) {
    const c = d.ksave ? DB.raw.courses.find(x => x.id === d.ksave) : { id: 'k' + Date.now(), lessons: [] };
    Object.assign(c, {
      title: v.title, slug: slugify(v.title), type: v.type,
      price_inr: v.type === 'paid' ? +v.price_inr || 0 : null,
      external_url: v.external_url || null, level: v.level, hours: +v.hours,
      description: v.description, is_active: on('is_active')
    });
    if (!d.ksave) DB.raw.courses.push(c);
    DB.save(); closeAll(); toast('Course saved', 'ok'); render(); return;
  }

  if ('ssave' in d) {
    const s = d.ssave ? DB.raw.services.find(x => x.id === d.ssave) : { id: 's' + Date.now() };
    Object.assign(s, { title: v.title, description: v.description, category: v.category, is_active: on('is_active') });
    if (!d.ssave) DB.raw.services.push(s);
    DB.save(); closeAll(); toast('Service saved', 'ok'); render(); return;
  }

  if ('csave' in d) {
    const c = d.csave ? DB.category(d.csave) : { id: 'c' + Date.now() };
    Object.assign(c, { name: v.name, slug: slugify(v.name), blurb: v.blurb, sort_order: +v.sort_order, is_featured: on('is_featured') });
    if (!d.csave) DB.raw.categories.push(c);
    DB.save(); closeAll(); toast('Category saved', 'ok'); render(); return;
  }

  if ('ladd' in d) {
    const c = DB.raw.courses.find(x => x.id === d.ladd);
    c.lessons.push({ id: 'l' + Date.now(), title: v.title, duration: v.duration || '10:00' });
    DB.save(); lessonsForm(c); toast('Lesson added', 'ok'); return;
  }
}

/* bind form saves once, globally (modals live outside #view) */
if (!saveBound) { document.addEventListener('submit', onSave); saveBound = true; }

return { page, wire };
})();
