/* SkyCodes — application core: state, router, pages, cart, search, auth. */
const SkyCodes = (() => {

/* ---------------- helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => '₹' + Number(n).toLocaleString('en-IN');
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = t => t.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

function hash(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
/* deterministic cover art, kept inside the brand's blue range */
function art(seed) {
  const h = hash(seed);
  const a = 194 + (h % 28);            // 194–222 only: cyan through the brand blue
  const b = a + 12 + (h % 10);
  const ang = 116 + (h % 84);
  const s = 58 + (h % 24);
  return `background:linear-gradient(${ang}deg,hsl(${a} ${s}% 58%) 0%,hsl(${b} 72% 31%) 46%,hsl(${b} 64% 8%) 100%)`;
}
const price = p => p.discount_price_inr || p.price_inr;
const stars = n => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

function toast(msg, kind = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(10px)'; }, 2600);
  setTimeout(() => t.remove(), 3100);
}

/* ---------------- backend (Supabase auth + serverless API) ---------------- */
async function getAccessToken() {
  const { data } = await supabaseClient.auth.getSession();
  return data.session ? data.session.access_token : null;
}

/* Calls one of our /api routes with the signed-in user's token attached.
   Throws with a readable message on failure so callers can toast() it. */
async function api(path, body) {
  const token = await getAccessToken();
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

/* Keeps store.data.user (used everywhere for display) in sync with the
   real Supabase session. Call once on boot and after sign-in/out. */
async function syncUserFromSession() {
  const { data } = await supabaseClient.auth.getSession();
  const u = data.session ? data.session.user : null;
  store.data.user = u ? {
    id: u.id,
    name: (u.user_metadata && u.user_metadata.name) || u.email.split('@')[0],
    email: u.email,
    address: (u.user_metadata && u.user_metadata.address) || ''
  } : null;
  store.save();
}

/* ---------------- state (persisted) ---------------- */
const store = {
  key: 'skycodes.state.v1',
  data: { cart: [], wishlist: [], user: null, orders: [], enrollments: {}, enquiries: [], subscribers: [] },
  load() {
    try { Object.assign(this.data, JSON.parse(localStorage.getItem(this.key)) || {}); } catch (e) { }
  },
  save() { localStorage.setItem(this.key, JSON.stringify(this.data)); paintCounters(); paintBuyBar(); }
};

function addToCart(id, kind = 'product', silent) {
  const line = store.data.cart.find(l => l.id === id);
  if (line) { if (kind === 'product') line.qty++; }
  else store.data.cart.push({ id, kind, qty: 1 });
  store.save();
  if (!silent) {
    const item = kind === 'product' ? DB.product(id) : DB.course(id);
    toast(`${item.title} added to your cart`, 'ok');
    bump('#cartBtn');
  }
}
function removeFromCart(id) { store.data.cart = store.data.cart.filter(l => l.id !== id); store.save(); renderDrawer('cart'); }
function setQty(id, d) {
  const l = store.data.cart.find(x => x.id === id); if (!l) return;
  l.qty = Math.max(1, l.qty + d); store.save(); renderDrawer('cart');
}
function toggleWish(id) {
  const w = store.data.wishlist;
  const i = w.indexOf(id);
  if (i > -1) { w.splice(i, 1); toast('Removed from wishlist'); }
  else { w.push(id); toast('Saved to wishlist', 'ok'); bump('#wishBtn'); }
  store.save();
  $$(`[data-wish="${id}"]`).forEach(b => b.classList.toggle('on', w.includes(id)));
}
function bump(sel) {
  const b = $(sel); if (!b) return;
  b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 340, easing: 'cubic-bezier(.22,.61,.36,1)' });
}
function paintCounters() {
  const c = store.data.cart.reduce((s, l) => s + l.qty, 0);
  const w = store.data.wishlist.length;
  const cc = $('#cartCount'), wc = $('#wishCount');
  cc.hidden = !c; cc.textContent = c;
  wc.hidden = !w; wc.textContent = w;
}
const owns = id => store.data.orders.some(o => o.items.some(i => i.id === id));
const enrolled = id => !!store.data.enrollments[id];

/* ---------------- shared UI pieces ---------------- */
function productCard(p) {
  const cat = DB.category(p.category_id);
  const off = p.discount_price_inr ? Math.round((1 - p.discount_price_inr / p.price_inr) * 100) : 0;
  const wished = store.data.wishlist.includes(p.id);
  return `
  <article class="card reveal">
    ${p.is_bundle ? '<span class="flag bundle">Bundle</span>' : off ? `<span class="flag deal">${off}% off</span>` : p.is_bestseller ? '<span class="flag">Best seller</span>' : ''}
    <button class="wish ${wished ? 'on' : ''}" data-wish="${p.id}" data-act="wish" data-id="${p.id}" aria-label="Save ${esc(p.title)}">
      <svg viewBox="0 0 24 24" fill="${wished ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z"/></svg>
    </button>
    <div class="thumb" style="${art(p.id + p.title)}" data-act="open" data-id="${p.id}">
      <span class="thumb-mono">${initials(p.title)}</span>
      <span class="thumb-tag">${esc(cat ? cat.name : 'Digital')}</span>
    </div>
    <div class="card-body">
      <h3 data-act="open" data-id="${p.id}">${esc(p.title)}</h3>
      <p class="card-sub">${esc(p.short_description)}</p>
      <div class="price">${money(price(p))}
        ${p.discount_price_inr ? `<s>${money(p.price_inr)}</s><span class="off">Save ${money(p.price_inr - p.discount_price_inr)}</span>` : ''}
      </div>
      <div class="card-actions">
        <button class="btn btn-primary" data-act="add" data-id="${p.id}">Add to cart</button>
        <button class="btn btn-ghost" data-act="open" data-id="${p.id}">Details</button>
      </div>
    </div>
  </article>`;
}

function courseCard(c) {
  return `
  <article class="course-card reveal">
    <div class="course-thumb" style="${art(c.id + c.title)}" data-act="course" data-id="${c.slug}">
      <span class="play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>
    </div>
    <div class="body">
      <span class="pill ${c.type}">${c.type === 'free' ? 'Free' : money(c.price_inr)}</span>
      <span class="pill">${esc(c.level)}</span>
      <span class="pill">${c.hours} hours</span>
      <h3 style="margin:14px 0 8px;cursor:pointer" data-act="course" data-id="${c.slug}">${esc(c.title)}</h3>
      <p class="card-sub" style="margin-bottom:16px">${esc(c.description)}</p>
      <button class="btn ${c.type === 'free' ? 'btn-ghost' : 'btn-primary'} btn-block" data-act="course" data-id="${c.slug}">
        ${c.type === 'free' ? 'Start watching' : enrolled(c.id) ? 'Continue course' : 'See curriculum'}
      </button>
    </div>
  </article>`;
}

/* ---------------- pages ---------------- */
const pages = {};

pages.home = () => {
  const P = DB.activeProducts();
  const deals = P.filter(p => p.discount_price_inr).slice(0, 4);
  const best = P.filter(p => p.is_bestseller).sort((a, b) => b.sales_count - a.sales_count).slice(0, 4);
  const trending = P.slice().sort((a, b) => b.sales_count - a.sales_count).slice(0, 4);
  const fresh = P.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
  const cats = DB.categories().filter(c => c.is_featured);
  const revs = DB.reviews().slice(0, 3);

  return `
  <section class="hero">
    <div class="aurora"></div>
    <div class="wrap hero-grid">
      <div>
        <h1>Get the cloud job.<span class="fade">Keep the files forever.</span></h1>
        <p class="lede">Cheat sheets, interview sets and full project walkthroughs, written while running
          real pipelines rather than summarised from documentation. Pay once, download straight away.</p>
        <div class="hero-cta">
          <a class="btn btn-primary" href="#/products">Browse ${P.length} products</a>
          <a class="btn btn-ghost" href="#/courses">Start a free course</a>
        </div>
        <div class="hero-stats">
          <div><strong>${P.length}</strong><span>ready to download</span></div>
          <div><strong>300+</strong><span>videos published</span></div>
          <div><strong>10</strong><span>services offered</span></div>
          <div><strong>2 yrs</strong><span>on live infrastructure</span></div>
        </div>
      </div>
      <div class="hero-stage">
        <canvas id="heroCanvas" aria-hidden="true"></canvas>
      </div>
    </div>
  </section>

  <div class="marquee"><div>
    ${[...cats, ...cats].map(c => `<span>◆</span> ${esc(c.name)}`).join(' ')}
  </div></div>

  <section class="section wrap">
    <div class="section-head reveal">
      <div><h2>Start where you are</h2><p>Seven shelves, each one built around a specific thing you are trying to finish this month.</p></div>
      <a class="linkish" href="#/products">See all products</a>
    </div>
    <div class="cat-grid">
      ${cats.map(c => {
        const n = DB.activeProducts().filter(p => p.category_id === c.id).length;
        return `<a class="cat-tile reveal" href="#/products?cat=${c.id}">
          <h3>${esc(c.name)}</h3><p>${esc(c.blurb)}</p><em>${n} ${n === 1 ? 'product' : 'products'}</em>
        </a>`;
      }).join('')}
    </div>
  </section>

  <section class="section wrap" style="padding-top:0">
    <div class="section-head reveal"><div><h2>Trending this week</h2><p>What people are downloading right now.</p></div></div>
    <div class="rail">${trending.map(productCard).join('')}</div>
  </section>

  ${deals.length ? `
  <section class="section wrap" style="padding-top:0">
    <div class="section-head reveal"><div><h2>Today's deals</h2><p>Discounts set in the admin panel — they end when the flag comes off.</p></div>
    <a class="linkish" href="#/products?deals=1">All deals</a></div>
    <div class="rail">${deals.map(productCard).join('')}</div>
  </section>` : ''}

  <section class="section wrap" style="padding-top:0">
    <div class="section-head reveal"><div><h2>Best sellers</h2><p>Ranked by orders, not by opinion.</p></div></div>
    <div class="rail">${best.map(productCard).join('')}</div>
  </section>

  <section class="section wrap" style="padding-top:0">
    <div class="section-head reveal"><div><h2>New arrivals</h2><p>Added in the last few weeks.</p></div>
    <a class="linkish" href="#/products?sort=new">Newest first</a></div>
    <div class="rail">${fresh.map(productCard).join('')}</div>
  </section>

  <section class="section wrap" style="padding-top:0">
    <div class="section-head reveal"><div><h2>What you get either way</h2></div></div>
    <div class="trust">
      ${[
        ['Secure payments', 'Razorpay handles the card. Orders are only fulfilled after the payment webhook verifies the signature.', 'M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z'],
        ['Files that are actually yours', 'Every download is versioned. When a guide is updated, the new file lands in your account at no extra cost.', 'M12 3v12m0 0 4-4m-4 4-4-4M4 19h16'],
        ['Refunds without an argument', 'Something not as described? Reply to the delivery email within seven days and the money goes back.', 'M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12H8'],
        ['A person on the other end', 'Questions go to a working engineer, not a ticket queue. Replies usually the same day.', 'M4 5h16v11H8l-4 4z']
      ].map(([h, p, d]) => `<div class="reveal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="${d}"/></svg>
        <h3>${h}</h3><p>${p}</p></div>`).join('')}
    </div>
  </section>

  <section class="section wrap" style="padding-top:0">
    <div class="section-head reveal"><div><h2>What buyers say</h2><p>Reviews are moderated in the admin panel before they appear.</p></div></div>
    <div class="review-grid">
      ${revs.map(r => {
        const p = DB.product(r.product_id);
        return `<blockquote class="review reveal">
          <div class="stars">${stars(r.rating)}</div>
          <p>${esc(r.comment)}</p>
          <footer><span>${esc(r.user_name)}</span><span>${p ? esc(p.title) : ''}</span></footer>
        </blockquote>`;
      }).join('')}
    </div>
  </section>

  <section class="section wrap" style="padding-top:0">
    <div class="section-head reveal">
      <div><h2>Learn it properly</h2><p>Two full courses free on YouTube, and paid tracks that end with something deployed.</p></div>
      <a class="linkish" href="#/courses">All courses</a>
    </div>
    <div class="course-grid">${DB.courses().slice(0, 3).map(courseCard).join('')}</div>
  </section>

  <section class="section wrap" style="padding-top:0">
    <div class="news reveal">
      <div>
        <h2 style="font-size:1.9rem">One email when something new ships</h2>
        <p style="color:var(--muted);margin:12px 0 0">New guides, free resources and the occasional teardown of a production mistake. No weekly noise.</p>
      </div>
      <form data-act="subscribe">
        <input type="email" placeholder="you@email.com" required aria-label="Email address" />
        <button class="btn btn-primary" type="submit">Subscribe</button>
      </form>
    </div>
  </section>`;
};

pages.products = q => {
  const cats = DB.categories();
  const sel = (q.cat || '').split(',').filter(Boolean);
  let list = DB.activeProducts();
  if (sel.length) list = list.filter(p => sel.includes(p.category_id));
  if (q.deals) list = list.filter(p => p.discount_price_inr);
  if (q.max) list = list.filter(p => price(p) <= +q.max);
  if (q.s) {
    const t = q.s.toLowerCase();
    list = list.filter(p => (p.title + p.description + p.short_description).toLowerCase().includes(t));
  }
  const sort = q.sort || 'popular';
  const sorters = {
    popular: (a, b) => b.sales_count - a.sales_count,
    new: (a, b) => new Date(b.created_at) - new Date(a.created_at),
    low: (a, b) => price(a) - price(b),
    high: (a, b) => price(b) - price(a),
    az: (a, b) => a.title.localeCompare(b.title)
  };
  list = list.slice().sort(sorters[sort]);

  return `
  <div class="wrap">
    <p class="crumbs"><a href="#/">Home</a> / Products${q.deals ? ' / Deals' : ''}</p>
    <div style="padding:18px 0 6px"><h1 style="font-size:clamp(2rem,4vw,3rem)">${q.deals ? "Today's deals" : q.s ? `Results for “${esc(q.s)}”` : 'Everything in the shop'}</h1>
      <p style="color:var(--muted);max-width:60ch">Instant download after payment. Files are delivered by email and stay in your account.</p></div>
    <div class="catalog">
      <aside class="filters">
        <h4>Category</h4>
        <div class="fgroup">
          ${cats.map(c => `<label class="check"><input type="checkbox" data-filter="cat" value="${c.id}" ${sel.includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}
        </div>
        <div class="fgroup">
          <h4>Maximum price</h4>
          <input type="range" min="199" max="999" step="50" value="${q.max || 999}" data-filter="max" style="width:100%;accent-color:var(--blue)" />
          <div style="display:flex;justify-content:space-between;color:var(--muted);font-size:.82rem"><span>₹199</span><span id="maxOut">${money(q.max || 999)}</span></div>
        </div>
        <div class="fgroup">
          <label class="check"><input type="checkbox" data-filter="deals" ${q.deals ? 'checked' : ''}> On discount only</label>
        </div>
        <button class="btn btn-ghost btn-block" style="margin-top:14px" data-act="clear-filters">Clear filters</button>
      </aside>
      <div>
        <div class="toolbar">
          <span class="count">${list.length} ${list.length === 1 ? 'product' : 'products'}</span>
          <select data-filter="sort">
            ${[['popular', 'Most popular'], ['new', 'Newest first'], ['low', 'Price: low to high'], ['high', 'Price: high to low'], ['az', 'A to Z']]
      .map(([v, l]) => `<option value="${v}" ${sort === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        ${list.length ? `<div class="rail">${list.map(productCard).join('')}</div>`
      : `<div class="empty"><h3>Nothing matches those filters</h3><p>Widen the price range or clear a category to see more.</p>
           <button class="btn btn-primary" data-act="clear-filters">Clear filters</button></div>`}
      </div>
    </div>
  </div>`;
};

pages.product = slug => {
  const p = DB.productBySlug(slug) || DB.product(slug);
  if (!p) return pages.missing();
  const cat = DB.category(p.category_id) || { id: '', name: 'Digital' };
  const revs = DB.reviews().filter(r => r.product_id === p.id);
  const related = DB.activeProducts().filter(x => x.category_id === p.category_id && x.id !== p.id).slice(0, 4);
  const inc = (p.bundle_includes || []).map(DB.product).filter(Boolean);
  const wished = store.data.wishlist.includes(p.id);

  return `
  <div class="wrap">
    <p class="crumbs"><a href="#/">Home</a> / <a href="#/products">Products</a> / <a href="#/products?cat=${p.category_id}">${esc(cat.name)}</a></p>
    <div class="detail">
      <div>
        <div class="detail-art" style="${art(p.id + p.title)}">
          <span class="thumb-mono">${initials(p.title)}</span>
          <span class="thumb-tag">${esc(cat.name)} · instant download</span>
        </div>
        ${inc.length ? `<div style="margin-top:22px">
          <h3 style="margin-bottom:12px">This bundle contains</h3>
          ${inc.map(i => `<div class="lesson" data-act="open" data-id="${i.id}">
            <span class="dot">✓</span><div><strong style="font-size:.94rem">${esc(i.title)}</strong><br><small>${esc(i.short_description)}</small></div>
            <s style="color:var(--muted-2)">${money(price(i))}</s></div>`).join('')}
          <p style="color:var(--ok);font-size:.9rem;margin-top:10px">Separately ${money(inc.reduce((s, i) => s + price(i), 0))} — here ${money(price(p))}.</p>
        </div>` : ''}
      </div>
      <div>
        <h1>${esc(p.title)}</h1>
        <p style="color:var(--muted);font-size:1.05rem;margin-top:14px">${esc(p.description)}</p>
        <ul class="spec-list">${p.specs.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
        ${revs.length ? `<div class="stars">${stars(Math.round(revs.reduce((s, r) => s + r.rating, 0) / revs.length))} <span style="color:var(--muted);font-size:.85rem">${revs.length} review${revs.length > 1 ? 's' : ''}</span></div>` : ''}
        <div class="buy-box">
          <div class="price">${money(price(p))}
            ${p.discount_price_inr ? `<s>${money(p.price_inr)}</s><span class="off">Save ${money(p.price_inr - p.discount_price_inr)}</span>` : ''}
          </div>
          <div class="buy-row">
            <button class="btn btn-primary" style="flex:1" data-act="buy" data-id="${p.id}">Buy now</button>
            <button class="btn btn-ghost" style="flex:1" data-act="add" data-id="${p.id}">Add to cart</button>
            <button class="icon-btn wish ${wished ? 'on' : ''}" style="position:static" data-wish="${p.id}" data-act="wish" data-id="${p.id}" aria-label="Save">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9Z"/></svg>
            </button>
          </div>
          <p style="color:var(--muted);font-size:.85rem;margin:14px 0 0">
            ${owns(p.id) ? 'You already own this — the download is in your account.' : 'Download link arrives by email the moment payment clears, and stays in your account.'}
          </p>
        </div>
      </div>
    </div>

    <section class="section" style="padding-top:20px">
      <div class="section-head"><div><h2>Reviews</h2><p>Only verified, approved reviews are shown.</p></div>
        <button class="btn btn-ghost" data-act="write-review" data-id="${p.id}">Write a review</button></div>
      ${revs.length ? `<div class="review-grid">${revs.map(r => `<blockquote class="review">
        <div class="stars">${stars(r.rating)}</div><p>${esc(r.comment)}</p>
        <footer><span>${esc(r.user_name)}</span><span>${r.created_at.slice(0, 10)}</span></footer></blockquote>`).join('')}</div>`
      : `<div class="empty"><h3>No reviews yet</h3><p>Bought this? Tell the next person whether it was worth it.</p></div>`}
    </section>

    ${related.length ? `<section class="section" style="padding-top:0">
      <div class="section-head"><div><h2>Also in ${esc(cat.name)}</h2></div></div>
      <div class="rail">${related.map(productCard).join('')}</div></section>` : ''}
  </div>`;
};

pages.services = () => `
  <div class="wrap">
    <p class="crumbs"><a href="#/">Home</a> / Services</p>
    <div style="padding:40px 0 28px;max-width:66ch">
      <h1>What I do</h1>
      <p style="color:var(--muted);font-size:1.08rem;margin-top:16px">Ten areas, quoted per project. Tell me what you are trying to ship and what it has to survive,
      and you will get a scope and a price back — not a discovery call.</p>
    </div>
    <div class="svc-list">
      ${DB.services().map((s, i) => `
        <div class="svc-row reveal" data-act="quote" data-id="${s.id}" tabindex="0">
          <span class="svc-idx">${String(i + 1).padStart(2, '0')}</span>
          <div><h3>${esc(s.title)}</h3><p>${esc(s.description)}</p></div>
          <button class="btn btn-primary" data-act="quote" data-id="${s.id}">Request a quote</button>
        </div>`).join('')}
    </div>
    <section class="section">
      <div class="news reveal">
        <div><h2 style="font-size:1.8rem">Not sure which one you need?</h2>
        <p style="color:var(--muted);margin-top:12px">Describe the problem in plain words. If it is not something I should take on, you will be told that too.</p></div>
        <a class="btn btn-primary" href="#/contact">Describe your project</a>
      </div>
    </section>
  </div>`;

pages.courses = () => {
  const free = DB.courses().filter(c => c.type === 'free');
  const paid = DB.courses().filter(c => c.type === 'paid');
  return `
  <div class="wrap">
    <p class="crumbs"><a href="#/">Home</a> / Courses</p>
    <div style="padding:40px 0 10px;max-width:64ch">
      <h1>Courses</h1>
      <p style="color:var(--muted);font-size:1.08rem;margin-top:16px">Free full courses live on YouTube. Paid tracks run here, with lesson-by-lesson progress and a certificate when you finish.</p>
    </div>
    <section class="section" style="padding-top:36px">
      <div class="section-head"><div><h2>Free, on YouTube</h2><p>No signup, no email. Just the whole thing.</p></div></div>
      <div class="course-grid">${free.map(courseCard).join('')}</div>
    </section>
    <section class="section" style="padding-top:0">
      <div class="section-head"><div><h2>Paid tracks</h2><p>Project-based, with a finished deployment at the end.</p></div></div>
      <div class="course-grid">${paid.map(courseCard).join('')}</div>
    </section>
  </div>`;
};

pages.course = slug => {
  const c = DB.courseBySlug(slug);
  if (!c) return pages.missing();
  const en = store.data.enrollments[c.id];
  const pct = en ? Math.round(en.completed.length / Math.max(c.lessons.length, 1) * 100) : 0;
  return `
  <div class="wrap">
    <p class="crumbs"><a href="#/">Home</a> / <a href="#/courses">Courses</a> / ${esc(c.title)}</p>
    <div class="detail">
      <div>
        <div class="detail-art" style="${art(c.id + c.title)}">
          <span class="play"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>
        </div>
        ${c.lessons.length ? `<h3 style="margin:28px 0 14px">Curriculum · ${c.lessons.length} lessons</h3>
          ${c.lessons.map((l, i) => `<div class="lesson ${en && en.completed.includes(l.id) ? 'done' : ''}">
            <span class="dot">${en && en.completed.includes(l.id) ? '✓' : i + 1}</span>
            <div><strong style="font-size:.95rem">${esc(l.title)}</strong></div><small>${l.duration}</small></div>`).join('')}` : ''}
      </div>
      <div>
        <h1>${esc(c.title)}</h1>
        <div style="margin-top:14px"><span class="pill ${c.type}">${c.type === 'free' ? 'Free' : money(c.price_inr)}</span>
        <span class="pill">${esc(c.level)}</span><span class="pill">${c.hours} hours</span></div>
        <p style="color:var(--muted);font-size:1.05rem;margin-top:18px">${esc(c.description)}</p>
        <div class="buy-box">
          ${c.type === 'free'
      ? `<p style="margin:0 0 16px;color:var(--muted)">Hosted on YouTube — opens in a new tab.</p>
             <a class="btn btn-primary btn-block" href="${c.external_url}" target="_blank" rel="noopener">Watch on YouTube</a>`
      : enrolled(c.id)
        ? `<div class="total-row"><span>Your progress</span><span>${pct}%</span></div>
             <div class="bar" style="margin-bottom:18px"><i style="width:${pct}%"></i></div>
             <a class="btn btn-primary btn-block" href="#/course/${c.slug}/learn">${pct ? 'Continue where you left off' : 'Start lesson one'}</a>`
        : `<div class="price">${money(c.price_inr)}</div>
             <button class="btn btn-primary btn-block" data-act="enroll" data-id="${c.id}">Enrol now</button>
             <button class="btn btn-ghost btn-block" style="margin-top:10px" data-act="add-course" data-id="${c.id}">Add to cart</button>
             <p style="color:var(--muted);font-size:.85rem;margin:14px 0 0">Lifetime access, certificate on completion.</p>`}
        </div>
      </div>
    </div>
  </div>`;
};

pages.learn = slug => {
  const c = DB.courseBySlug(slug);
  if (!c) return pages.missing();
  if (!enrolled(c.id)) { setTimeout(() => go(`#/course/${slug}`), 0); return ''; }
  const en = store.data.enrollments[c.id];
  const cur = c.lessons.find(l => l.id === en.current) || c.lessons[0];
  const pct = Math.round(en.completed.length / c.lessons.length * 100);
  const done = en.completed.includes(cur.id);
  return `
  <div class="wrap">
    <p class="crumbs"><a href="#/courses">Courses</a> / <a href="#/course/${c.slug}">${esc(c.title)}</a> / Player</p>
    <div class="player-wrap">
      <div>
        <div class="video" style="${art(cur.id + c.title)}">
          <div>
            <span class="play" style="margin:0 auto 16px"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span>
            <h2 style="font-size:1.4rem">${esc(cur.title)}</h2>
            <p style="color:rgba(255,255,255,.8);margin-top:8px">${cur.duration} · lesson ${c.lessons.indexOf(cur) + 1} of ${c.lessons.length}</p>
            <p style="color:rgba(255,255,255,.55);font-size:.82rem;margin:0">Video streams from private storage via a signed URL once the backend is connected.</p>
          </div>
        </div>
        <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
          <button class="btn ${done ? 'btn-ghost' : 'btn-primary'}" data-act="complete" data-id="${c.id}" data-lesson="${cur.id}">
            ${done ? 'Marked complete' : 'Mark lesson complete'}
          </button>
          <button class="btn btn-ghost" data-act="next-lesson" data-id="${c.id}">Next lesson</button>
          ${pct === 100 ? `<button class="btn btn-primary" data-act="certificate" data-id="${c.id}">Download certificate</button>` : ''}
        </div>
      </div>
      <aside>
        <div class="total-row" style="font-size:1rem"><span>Progress</span><span>${pct}%</span></div>
        <div class="bar" style="margin-bottom:18px"><i style="width:${pct}%"></i></div>
        ${c.lessons.map((l, i) => `<div class="lesson ${l.id === cur.id ? 'active' : ''} ${en.completed.includes(l.id) ? 'done' : ''}"
          data-act="play" data-id="${c.id}" data-lesson="${l.id}">
          <span class="dot">${en.completed.includes(l.id) ? '✓' : i + 1}</span>
          <div><strong style="font-size:.9rem">${esc(l.title)}</strong></div><small>${l.duration}</small></div>`).join('')}
      </aside>
    </div>
  </div>`;
};

pages.about = () => `
  <div class="wrap">
    <p class="crumbs"><a href="#/">Home</a> / About</p>
    <div class="about-grid">
      <div class="about-portrait"><img src="assets/img/founder.jpg" alt="Vaishnavi Kurmi" /></div>
      <div>
        <h1>I ship pipelines and clusters half the week, and explain them the other half.</h1>
        <p style="color:var(--muted);font-size:1.06rem;margin-top:20px">
          AWS Certified Cloud Practitioner with two years of hands-on cloud and DevOps work — EKS clusters,
          Terraform modules, Jenkins pipelines, and the weekly troubleshooting that comes with all of it.
          Everything built goes up on GitHub. Everything learned goes out as Skycodes content: real pipelines,
          real errors, real fixes.
        </p>
        <p style="color:var(--muted);font-size:1.06rem">
          SkyCodes is the storefront extension of Skycodes — turning those tools, templates and notes into
          resources anyone can buy and learn from.
        </p>
        <div class="facts">
          <div><strong>Vaishnavi Kurmi</strong><span>Cloud &amp; DevOps engineer</span></div>
          <div><strong>Indore, India</strong><span>Open to remote</span></div>
          <div><strong>AWS Cloud Practitioner</strong><span>Certified</span></div>
          <div><strong>300+ videos</strong><span>YouTube and Instagram</span></div>
        </div>
        <div style="display:flex;gap:10px;margin-top:26px;flex-wrap:wrap">
          <a class="btn btn-primary" href="#/products">Browse the shop</a>
          <a class="btn btn-ghost" href="#/services">See services</a>
        </div>
      </div>
    </div>
    <section class="section" style="padding-top:0">
      <div class="section-head"><div><h2>Focus areas</h2></div></div>
      <div class="trust">
        ${['AWS', 'Kubernetes', 'Terraform', 'CI/CD'].map(x => `<div class="reveal"><h3>${x}</h3>
          <p>Used weekly in production work, and the subject of most of what is sold here.</p></div>`).join('')}
      </div>
    </section>
  </div>`;

pages.contact = () => `
  <div class="wrap">
    <p class="crumbs"><a href="#/">Home</a> / Contact</p>
    <div class="detail">
      <div>
        <h1>Tell me what you are building</h1>
        <p style="color:var(--muted);font-size:1.05rem;margin-top:16px">
          Project enquiries, a question about a product before you buy, or a problem with a download — all of it
          comes to the same inbox and gets a reply from a person.
        </p>
        <p style="margin-top:22px"><a class="linkish" href="mailto:contact.skycodes@gmail.com">contact.skycodes@gmail.com</a></p>
        <div style="display:flex;gap:14px;margin-top:14px;flex-wrap:wrap">
          <a class="btn btn-ghost" href="https://instagram.com/skycodes10" target="_blank" rel="noopener">Instagram</a>
          <a class="btn btn-ghost" href="https://youtube.com/@skycodes10" target="_blank" rel="noopener">YouTube</a>
          <a class="btn btn-ghost" href="https://github.com/vaishnavipatelj" target="_blank" rel="noopener">GitHub</a>
          <a class="btn btn-ghost" href="https://linkedin.com/in/vaishnavikurmi" target="_blank" rel="noopener">LinkedIn</a>
        </div>
      </div>
      <form class="buy-box" style="margin-top:0" data-act="contact-form">
        <div class="field"><label><small>Your name</small><input type="text" name="name" required /></label></div>
        <div class="field"><label><small>Email</small><input type="email" name="email" required /></label></div>
        <div class="field"><label><small>What do you need?</small><textarea name="message" rows="5" required></textarea></label></div>
        <div class="field"><label><small>Budget range (optional)</small>
          <select name="budget" style="width:100%">
            <option>Not sure yet</option><option>Under ₹25,000</option><option>₹25,000 – ₹75,000</option>
            <option>₹75,000 – ₹2,00,000</option><option>Above ₹2,00,000</option>
          </select></label></div>
        <button class="btn btn-primary btn-block" type="submit">Send enquiry</button>
      </form>
    </div>
  </div>`;

pages.account = (q) => {
  const u = store.data.user;
  if (!u) {
    setTimeout(() => openAuth(), 60);
    return `<div class="wrap"><div class="empty" style="margin:80px 0">
      <h3>Sign in to see your account</h3><p>Your orders, downloads, courses and certificates live here.</p>
      <button class="btn btn-primary" data-act="auth">Sign in or create an account</button></div></div>`;
  }
  const tab = q.tab || 'orders';
  const wish = store.data.wishlist.map(DB.product).filter(Boolean);
  const myCourses = Object.keys(store.data.enrollments).map(DB.course).filter(Boolean);
  const tabs = [['orders', 'Orders'], ['downloads', 'Downloads'], ['courses', 'My courses'], ['certificates', 'Certificates'], ['wishlist', 'Wishlist'], ['profile', 'Profile']];

  const body = {
    orders: () => store.data.orders.length ? `<table class="table">
        <tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th></tr>
        ${store.data.orders.slice().reverse().map(o => `<tr>
          <td>${o.id}</td><td>${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
          <td>${o.items.map(i => esc(i.title)).join(', ')}</td><td>${money(o.total)}</td>
          <td><span class="pill free">Paid</span></td></tr>`).join('')}
      </table>` : empty('No orders yet', 'When you buy something it shows up here with its invoice.', '#/products', 'Browse products'),

    downloads: () => {
      const items = store.data.orders.flatMap(o => o.items).filter(i => i.kind === 'product');
      return items.length ? items.map(i => `<div class="lesson">
        <span class="dot">↓</span><div><strong style="font-size:.95rem">${esc(i.title)}</strong><br><small>Signed link, expires 15 minutes after you request it</small></div>
        <button class="mini" data-act="download" data-id="${i.id}">Get link</button></div>`).join('')
        : empty('Nothing to download yet', 'Digital purchases appear here the moment payment clears.', '#/products', 'Browse products');
    },

    courses: () => myCourses.length ? `<div class="course-grid">${myCourses.map(c => {
      const en = store.data.enrollments[c.id];
      const pct = Math.round(en.completed.length / Math.max(c.lessons.length, 1) * 100);
      return `<div class="course-card"><div class="course-thumb" style="${art(c.id + c.title)}"><span class="play">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span></div>
        <div class="body"><h3 style="margin-bottom:10px">${esc(c.title)}</h3>
        <div class="bar" style="margin-bottom:8px"><i style="width:${pct}%"></i></div>
        <small style="color:var(--muted)">${pct}% complete</small>
        <a class="btn btn-primary btn-block" style="margin-top:14px" href="#/course/${c.slug}/learn">Continue</a></div></div>`;
    }).join('')}</div>` : empty('You are not enrolled in anything', 'Two full courses are free — start there.', '#/courses', 'See courses'),

    certificates: () => {
      const done = myCourses.filter(c => {
        const en = store.data.enrollments[c.id];
        return c.lessons.length && en.completed.length === c.lessons.length;
      });
      return done.length ? done.map(c => `<div class="lesson">
        <span class="dot">★</span><div><strong style="font-size:.95rem">${esc(c.title)}</strong><br><small>Completed ${new Date().toLocaleDateString('en-IN')}</small></div>
        <button class="mini" data-act="certificate" data-id="${c.id}">Download</button></div>`).join('')
        : empty('No certificates yet', 'Finish every lesson in a paid course and one is issued automatically.', '#/courses', 'See courses');
    },

    wishlist: () => wish.length ? `<div class="rail">${wish.map(productCard).join('')}</div>`
      : empty('Your wishlist is empty', 'Tap the heart on any product to keep it here.', '#/products', 'Browse products'),

    profile: () => `<form class="buy-box" style="max-width:480px;margin:0" data-act="profile-form">
      <div class="field"><label><small>Name</small><input type="text" name="name" value="${esc(u.name)}" /></label></div>
      <div class="field"><label><small>Email</small><input type="email" name="email" value="${esc(u.email)}" /></label></div>
      <div class="field"><label><small>Delivery address (only needed for physical items)</small>
        <textarea name="address" rows="3">${esc(u.address || '')}</textarea></label></div>
      <button class="btn btn-primary" type="submit">Save changes</button>
      <button class="btn btn-ghost" type="button" data-act="signout" style="margin-left:8px">Sign out</button>
    </form>`
  }[tab]();

  return `
  <div class="wrap">
    <p class="crumbs"><a href="#/">Home</a> / Account</p>
    <div style="padding:34px 0 8px"><h1 style="font-size:2.2rem">Hello, ${esc(u.name.split(' ')[0])}</h1>
      <p style="color:var(--muted)">${esc(u.email)}</p></div>
    <div class="stat-grid">
      <div class="stat"><strong>${store.data.orders.length}</strong><span>orders</span></div>
      <div class="stat"><strong>${store.data.orders.flatMap(o => o.items).length}</strong><span>items owned</span></div>
      <div class="stat"><strong>${myCourses.length}</strong><span>courses</span></div>
      <div class="stat"><strong>${money(store.data.orders.reduce((s, o) => s + o.total, 0))}</strong><span>lifetime spend</span></div>
    </div>
    <div class="tabs">${tabs.map(([v, l]) => `<button class="${tab === v ? 'active' : ''}" data-act="tab" data-id="${v}">${l}</button>`).join('')}</div>
    <div style="padding-bottom:80px">${body}</div>
  </div>`;
};

const empty = (h, p, href, cta) => `<div class="empty"><h3>${h}</h3><p>${p}</p><a class="btn btn-primary" href="${href}">${cta}</a></div>`;

pages.static = slug => {
  const copy = {
    faq: ['Questions people actually ask', [
      ['How do I get my files?', 'A signed download link is emailed the moment your payment is confirmed, and the same files stay in your account under Downloads.'],
      ['Can I re-download later?', 'Yes. Account links are regenerated on demand and expire fifteen minutes after you request one.'],
      ['Do you update the guides?', 'When a service changes enough to matter, the file is updated and you get the new version at no cost.'],
      ['Can I share a file with a friend?', 'Please do not. Each purchase is for one person. If your team needs copies, write in and ask about a team price.'],
      ['Is there a student discount?', 'Sometimes. Email from your college address and ask.']
    ]],
    shipping: ['Delivery', [
      ['Digital products', 'Delivered instantly by email and in your account. Nothing is shipped.'],
      ['Physical items', 'Not sold today. If they are added later, dispatch times will appear on the product page.'],
      ['Courses', 'Access is granted to your account as soon as the payment webhook confirms the order.']
    ]],
    returns: ['Refunds', [
      ['Seven-day window', 'If a product is not what the page described, reply to your delivery email within seven days for a full refund.'],
      ['What is not refundable', 'Change of mind after the file has been downloaded, or bundles bought during a sale that has ended.'],
      ['How long it takes', 'Razorpay returns the money to the original method, usually in five to seven working days.']
    ]],
    privacy: ['Privacy', [
      ['What is collected', 'Your name, email, and order history. Payment details are handled by Razorpay and never touch this site.'],
      ['What it is used for', 'Delivering your purchases, answering your emails, and — only if you opt in — the newsletter.'],
      ['Deleting your data', 'Email a deletion request and your account and order records are removed within thirty days.']
    ]],
    terms: ['Terms', [
      ['Licence', 'Products are licensed to one person for personal use. Reselling or redistributing them is not permitted.'],
      ['Prices', 'All prices are in INR and include applicable taxes unless stated otherwise.'],
      ['Changes', 'Catalogue, prices and course content can change. Anything you have already bought stays yours.']
    ]]
  }[slug];
  if (!copy) return pages.missing();
  return `<div class="wrap" style="max-width:820px">
    <p class="crumbs"><a href="#/">Home</a> / ${copy[0]}</p>
    <h1 style="font-size:2.4rem;margin:30px 0 10px">${copy[0]}</h1>
    <div style="padding-bottom:90px">
      ${copy[1].map(([q, a]) => `<div style="border-top:1px solid var(--line);padding:24px 0">
        <h3 style="margin-bottom:8px">${q}</h3><p style="color:var(--muted);margin:0">${a}</p></div>`).join('')}
    </div></div>`;
};

pages.missing = () => `<div class="wrap"><div class="empty" style="margin:90px 0">
  <h3>That page is not here</h3><p>The link may be old, or the product may have been taken down.</p>
  <a class="btn btn-primary" href="#/">Back to the shop</a></div></div>`;

/* ---------------- drawers / modals ---------------- */
function openDrawer(kind) {
  renderDrawer(kind);
  $('#cartDrawer').classList.add('open');
  $('#scrim').classList.add('open');
}
function closeAll() {
  $('#cartDrawer').classList.remove('open');
  $('#modal').classList.remove('open');
  $('#scrim').classList.remove('open');
  $('#searchOverlay').classList.remove('open');
}
function renderDrawer(kind) {
  const body = $('#drawerBody'), foot = $('#drawerFoot');
  if (kind === 'wishlist') {
    $('#drawerTitle').textContent = 'Wishlist';
    const items = store.data.wishlist.map(DB.product).filter(Boolean);
    body.innerHTML = items.length ? items.map(p => `
      <div class="cart-line">
        <div class="art" style="${art(p.id + p.title)}">${initials(p.title)}</div>
        <div><h4 data-act="open" data-id="${p.id}" style="cursor:pointer">${esc(p.title)}</h4>
          <small style="color:var(--muted)">${money(price(p))}</small>
          <div class="qty"><button class="mini" data-act="add" data-id="${p.id}">Add to cart</button></div></div>
        <button class="mini danger" data-act="wish" data-id="${p.id}">Remove</button>
      </div>`).join('')
      : `<div class="empty" style="padding:40px 16px"><h3>Nothing saved yet</h3><p>Tap the heart on a product to keep it here.</p></div>`;
    foot.innerHTML = `<a class="btn btn-ghost btn-block" href="#/products" data-act="close-nav">Keep browsing</a>`;
    return;
  }
  $('#drawerTitle').textContent = 'Your cart';
  const lines = store.data.cart.map(l => {
    const item = l.kind === 'course' ? DB.course(l.id) : DB.product(l.id);
    return item ? { l, item, unit: l.kind === 'course' ? item.price_inr : price(item) } : null;
  }).filter(Boolean);
  const total = lines.reduce((s, x) => s + x.unit * x.l.qty, 0);
  body.innerHTML = lines.length ? lines.map(({ l, item, unit }) => `
    <div class="cart-line">
      <div class="art" style="${art(item.id + item.title)}">${initials(item.title)}</div>
      <div>
        <h4>${esc(item.title)}</h4>
        <small style="color:var(--muted)">${l.kind === 'course' ? 'Course enrolment' : 'Instant download'}</small>
        ${l.kind === 'product' ? `<div class="qty">
          <button data-act="qty-" data-id="${l.id}" aria-label="Decrease">−</button><span>${l.qty}</span>
          <button data-act="qty+" data-id="${l.id}" aria-label="Increase">+</button>
          <button class="mini danger" style="margin-left:auto" data-act="remove" data-id="${l.id}">Remove</button></div>`
      : `<div class="qty"><button class="mini danger" data-act="remove" data-id="${l.id}">Remove</button></div>`}
      </div>
      <strong>${money(unit * l.qty)}</strong>
    </div>`).join('')
    : `<div class="empty" style="padding:40px 16px"><h3>Your cart is empty</h3><p>Add a cheat sheet and see how fast this gets useful.</p></div>`;
  foot.innerHTML = lines.length ? `
    <div class="total-row"><span>Total</span><span>${money(total)}</span></div>
    <button class="btn btn-primary btn-block" data-act="checkout">Checkout securely</button>
    <p style="color:var(--muted-2);font-size:.8rem;text-align:center;margin:10px 0 0">Razorpay · UPI, cards, netbanking</p>`
    : `<a class="btn btn-ghost btn-block" href="#/products" data-act="close-nav">Browse products</a>`;
}

function openModal(html) {
  $('#modal').innerHTML = html + `<button class="icon-btn" data-close style="position:absolute;top:16px;right:16px">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
  $('#modal').classList.add('open');
  $('#scrim').classList.add('open');
  const f = $('#modal input,#modal textarea'); if (f) setTimeout(() => f.focus(), 140);
}

function openAuth() {
  openModal(`
    <h3>Sign in</h3>
    <p class="muted">One account for your downloads, your courses and your certificates.</p>
    <form data-act="auth-form">
      <div class="field"><label><small>Name</small><input type="text" name="name" required placeholder="Your name" /></label></div>
      <div class="field"><label><small>Email</small><input type="email" name="email" required placeholder="you@email.com" /></label></div>
      <div class="field"><label><small>Password</small><input type="password" name="password" required placeholder="••••••••" /></label></div>
      <button class="btn btn-primary btn-block" type="submit">Continue</button>
    </form>
    <p style="color:var(--muted-2);font-size:.8rem;margin:16px 0 0">New here? Just fill this in — an account is created automatically.</p>`);
}

function openQuote(serviceId) {
  const s = DB.services().find(x => x.id === serviceId);
  openModal(`
    <h3>Request a quote</h3>
    <p class="muted">${esc(s.title)} — ${esc(s.description)}</p>
    <form data-act="quote-form" data-id="${s.id}">
      <div class="field"><label><small>Name</small><input type="text" name="name" required /></label></div>
      <div class="field"><label><small>Email</small><input type="email" name="email" required /></label></div>
      <div class="field"><label><small>What needs building or fixing?</small><textarea name="description" rows="4" required></textarea></label></div>
      <div class="field"><label><small>Budget range</small><select name="budget" style="width:100%">
        <option>Not sure yet</option><option>Under ₹25,000</option><option>₹25,000 – ₹75,000</option>
        <option>₹75,000 – ₹2,00,000</option><option>Above ₹2,00,000</option></select></label></div>
      <button class="btn btn-primary btn-block" type="submit">Send request</button>
    </form>`);
}

/* checkout: price is recomputed server-side in /api/checkout/create-order,
   Razorpay's modal opens with the real order it returns, and only the
   verified webhook (api/webhooks/razorpay.js) ever marks the order paid or
   grants access. This function never writes an order or an enrollment. */
async function checkout() {
  if (!store.data.cart.length) return;
  if (!store.data.user) { openAuth(); toast('Sign in first so we know where to send the files'); return; }

  const items = store.data.cart.map(l => ({ id: l.id, kind: l.kind, qty: l.qty }));
  const lines = store.data.cart.map(l => {
    const item = l.kind === 'course' ? DB.course(l.id) : DB.product(l.id);
    return { title: item.title, qty: l.qty, unit: l.kind === 'course' ? item.price_inr : price(item) };
  });
  const total = lines.reduce((s, i) => s + i.unit * i.qty, 0);

  openModal(`
    <h3>Confirm and pay</h3>
    <p class="muted">Total is verified against the database before payment opens.</p>
    ${lines.map(i => `<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line)">
      <span>${esc(i.title)} ${i.qty > 1 ? `× ${i.qty}` : ''}</span><strong>${money(i.unit * i.qty)}</strong></div>`).join('')}
    <div class="total-row" style="margin-top:18px"><span>Total</span><span>${money(total)}</span></div>
    <button class="btn btn-primary btn-block" data-act="pay">Pay ${money(total)}</button>
    <p style="color:var(--muted-2);font-size:.8rem;margin:14px 0 0">Secured by Razorpay.</p>`);

  $('#modal').dataset.items = JSON.stringify(items);
}

async function pay() {
  const items = JSON.parse($('#modal').dataset.items || '[]');
  const payBtn = $('[data-act="pay"]');
  if (payBtn) { payBtn.disabled = true; payBtn.textContent = 'Preparing payment…'; }

  let order;
  try {
    order = await api('/api/checkout/create-order', { items });
  } catch (err) {
    toast(err.message || 'Could not start checkout', 'err');
    if (payBtn) { payBtn.disabled = false; payBtn.textContent = 'Try again'; }
    return;
  }

  const rzp = new Razorpay({
    key: order.key,
    order_id: order.order_id,
    amount: order.amount,
    currency: order.currency,
    name: 'SkyCodes.Shop',
    prefill: { name: store.data.user.name, email: store.data.user.email },
    theme: { color: '#1e6fff' },
    handler: function () {
      // The webhook does the real work (verifying the signature, marking the
      // order paid, granting access). This only tells the shopper it's on
      // its way — never grant access from this callback.
      store.data.cart = [];
      store.save();
      closeAll();
      toast('Payment received — confirming with the server, this takes a few seconds', 'ok');
      setTimeout(() => go('#/account?tab=downloads'), 1500);
    },
    modal: {
      ondismiss: function () {
        if (payBtn) { payBtn.disabled = false; payBtn.textContent = 'Try again'; }
      }
    }
  });
  rzp.open();
}

async function enrol(courseId) {
  const c = DB.course(courseId);
  if (!store.data.user) { openAuth(); toast('Sign in to enrol'); return; }
  if (c.type === 'paid' && !enrolled(c.id)) { addToCart(c.id, 'course', true); checkout(); return; }
  try {
    await api('/api/enroll/free', { courseId: c.id });
    store.data.enrollments[c.id] = { completed: [], current: c.lessons[0].id, at: Date.now() };
    store.save();
    go(`#/course/${c.slug}/learn`);
  } catch (err) {
    toast(err.message || 'Could not enrol', 'err');
  }
}

/* certificate as a downloadable PNG */
function certificate(courseId) {
  const c = DB.course(courseId), u = store.data.user;
  const cv = document.createElement('canvas'); cv.width = 1400; cv.height = 990;
  const x = cv.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 1400, 990);
  const g = x.createLinearGradient(0, 0, 1400, 990);
  g.addColorStop(0, '#0b3ea8'); g.addColorStop(.5, '#1e6fff'); g.addColorStop(1, '#000');
  x.strokeStyle = g; x.lineWidth = 10; x.strokeRect(38, 38, 1324, 914);
  x.fillStyle = '#4f9dff'; x.font = '600 26px Inter,sans-serif';
  x.fillText('SKYCART · SKYCODES', 96, 150);
  x.fillStyle = '#fff'; x.font = '700 62px "Space Grotesk",sans-serif';
  x.fillText('Certificate of completion', 96, 260);
  x.fillStyle = '#9aa5b8'; x.font = '400 26px Inter,sans-serif';
  x.fillText('This certifies that', 96, 360);
  x.fillStyle = '#fff'; x.font = '700 58px "Space Grotesk",sans-serif';
  x.fillText(u.name, 96, 440);
  x.fillStyle = '#9aa5b8'; x.font = '400 26px Inter,sans-serif';
  x.fillText('has completed every lesson of', 96, 510);
  x.fillStyle = '#4f9dff'; x.font = '700 44px "Space Grotesk",sans-serif';
  x.fillText(c.title, 96, 580);
  x.fillStyle = '#6b7688'; x.font = '400 22px Inter,sans-serif';
  x.fillText(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), 96, 860);
  x.fillText('Issued by Vaishnavi Kurmi · contact.skycodes@gmail.com', 96, 900);
  const a = document.createElement('a');
  a.download = `skycodes-certificate-${c.slug}.png`; a.href = cv.toDataURL('image/png'); a.click();
  toast('Certificate downloaded', 'ok');
}

/* ---------------- search ---------------- */
function search(term) {
  const t = term.trim().toLowerCase();
  const out = $('#searchResults');
  if (!t) {
    out.innerHTML = DB.activeProducts().filter(p => p.is_bestseller).slice(0, 5)
      .map(p => sres(p.id, p.title, 'Best seller · ' + money(price(p)), `#/product/${p.slug}`)).join('');
    return;
  }
  const hits = [
    ...DB.activeProducts().filter(p => (p.title + ' ' + p.short_description + ' ' + p.description).toLowerCase().includes(t))
      .map(p => sres(p.id, p.title, ((DB.category(p.category_id) || {}).name || 'Product') + ' · ' + money(price(p)), `#/product/${p.slug}`)),
    ...DB.courses().filter(c => (c.title + ' ' + c.description).toLowerCase().includes(t))
      .map(c => sres(c.id, c.title, 'Course · ' + (c.type === 'free' ? 'Free' : money(c.price_inr)), `#/course/${c.slug}`)),
    ...DB.services().filter(s => (s.title + ' ' + s.description).toLowerCase().includes(t))
      .map(s => sres(s.id, s.title, 'Service · quote on request', `#/services`))
  ];
  out.innerHTML = hits.length ? hits.slice(0, 10).join('')
    : `<div class="empty" style="padding:38px"><h3>No matches for “${esc(term)}”</h3>
       <p>Try a tool name — terraform, kubernetes, resume, interview.</p></div>`;
}
const sres = (id, title, meta, href) => `<a class="sres" href="${href}" data-act="close-nav">
  <span class="art" style="${art(id + title)}">${initials(title)}</span>
  <span><strong>${esc(title)}</strong><small>${esc(meta)}</small></span>
  <span style="color:var(--muted-2)">Open</span></a>`;

/* ---------------- router ---------------- */
function parseQuery(s) {
  const q = {};
  (s || '').split('&').filter(Boolean).forEach(kv => { const [k, v] = kv.split('='); q[k] = decodeURIComponent(v || ''); });
  return q;
}
const go = h => { location.hash = h; };

function render() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const q = parseQuery(qs);
  const parts = path.split('/').filter(Boolean);
  let html;

  if (!parts.length) html = pages.home();
  else if (parts[0] === 'products') html = pages.products(q);
  else if (parts[0] === 'product') html = pages.product(parts[1]);
  else if (parts[0] === 'services') html = pages.services();
  else if (parts[0] === 'courses') html = pages.courses();
  else if (parts[0] === 'course') html = parts[2] === 'learn' ? pages.learn(parts[1]) : pages.course(parts[1]);
  else if (parts[0] === 'about') html = pages.about();
  else if (parts[0] === 'contact') html = pages.contact();
  else if (parts[0] === 'account') html = pages.account(q);
  else if (parts[0] === 'page') html = pages.static(parts[1]);
  else if (parts[0] === 'admin') html = Admin.page(q);
  else if (parts[0] === 'cart') { html = pages.home(); setTimeout(() => openDrawer('cart'), 80); }
  else html = pages.missing();

  $('#view').innerHTML = html;
  window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });
  $$('#nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href').slice(1).split('?')[0] === '/' + (parts[0] || '')));
  $('#nav').classList.remove('open');
  observeReveals();
  mountScene();
  wireTilt();
  paintBuyBar();
  if (parts[0] === 'admin') Admin.wire();
}

let io;
function observeReveals() {
  const els = $$('.reveal');
  const show = el => { el.classList.add('in'); if (io) io.unobserve(el); };
  if (!io) io = new IntersectionObserver(
    es => es.forEach(e => { if (e.isIntersecting) show(e.target); }),
    { rootMargin: '0px 0px -6% 0px' });

  els.forEach((el, i) => {
    el.style.transitionDelay = Math.min(i % 8, 6) * 40 + 'ms';
    /* anything already on screen shows at once — a shop must never open blank */
    if (el.getBoundingClientRect().top < innerHeight * 0.96) show(el);
    else io.observe(el);
  });

  /* backstop: if the observer is throttled or unsupported, nothing stays hidden */
  clearTimeout(observeReveals.timer);
  observeReveals.timer = setTimeout(() => els.forEach(show), 2400);
}

/* ---------------- 3D hero + pointer depth ---------------- */
let scene = null;
function mountScene() {
  const cv = $('#heroCanvas');
  if (scene) { scene.pause(); scene = null; }
  if (cv && window.SkyScene) scene = SkyScene.start(cv);
}

/* Product cards tilt in real perspective. Pointer only — a tilt you cannot
   aim is just jitter, so touch devices get the flat card (see the CSS). */
function wireTilt() {
  if (!matchMedia('(hover:hover)').matches) return;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  $$('.card').forEach(card => {
    let frame = null;
    card.addEventListener('pointermove', e => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        card.classList.add('tilting');
        card.style.setProperty('--ry', ((x - .5) * 9).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((.5 - y) * 7).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      card.classList.remove('tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  });
}

/* Standing cart total on phones, so the way to pay is never more than a thumb away */
function paintBuyBar() {
  const bar = $('#buybar');
  if (!bar) return;
  const n = store.data.cart.reduce((s, l) => s + l.qty, 0);
  const total = store.data.cart.reduce((s, l) => {
    const it = l.kind === 'product' ? DB.product(l.id) : DB.course(l.id);
    return s + (it ? (l.kind === 'product' ? price(it) * l.qty : it.price_inr) : 0);
  }, 0);
  bar.hidden = !n;
  bar.classList.toggle('on', !!n);
  document.body.classList.toggle('has-buybar', !!n);
  if (!n) return;
  $('#buybarTotal').textContent = money(total);
  $('#buybarCount').textContent = n + (n === 1 ? ' item' : ' items');
}

/* ---------------- events ---------------- */
function wireGlobal() {
  addEventListener('hashchange', render);
  addEventListener('scroll', () => {
    $('#header').classList.toggle('scrolled', scrollY > 12);
    const span = document.documentElement.scrollHeight - innerHeight;
    $('#scrollLine').style.width = (span > 40 ? (scrollY / span) * 100 : 0) + '%';
  }, { passive: true });
  $('#buybarBtn').onclick = () => openDrawer('cart');

  $('#cartBtn').onclick = () => openDrawer('cart');
  $('#wishBtn').onclick = () => openDrawer('wishlist');
  $('#accountBtn').onclick = () => store.data.user ? go('#/account') : openAuth();
  $('#menuBtn').onclick = () => $('#nav').classList.toggle('open');
  $('#scrim').onclick = closeAll;
  $('#searchBtn').onclick = () => {
    $('#searchOverlay').classList.add('open');
    search(''); setTimeout(() => $('#searchInput').focus(), 120);
  };
  $('#searchInput').oninput = e => search(e.target.value);
  $('#searchInput').onkeydown = e => {
    if (e.key === 'Enter') { closeAll(); go('#/products?s=' + encodeURIComponent(e.target.value)); }
  };
  addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAll();
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); $('#searchBtn').click(); }
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      e.preventDefault(); $('#searchBtn').click();
    }
  });

  document.addEventListener('click', e => {
    if (e.target.closest('[data-close]')) return closeAll();
    if (e.target.closest('[data-act="close-nav"]')) return closeAll();
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act, id = t.dataset.id;

    const handlers = {
      open: () => { closeAll(); go('#/product/' + DB.product(id).slug); },
      course: () => { closeAll(); go('#/course/' + id); },
      add: () => addToCart(id),
      'add-course': () => addToCart(id, 'course'),
      buy: () => { addToCart(id, 'product', true); checkout(); },
      wish: () => { toggleWish(id); if ($('#cartDrawer').classList.contains('open')) renderDrawer('wishlist'); },
      remove: () => removeFromCart(id),
      'qty+': () => setQty(id, 1),
      'qty-': () => setQty(id, -1),
      checkout: () => { closeAll(); checkout(); },
      pay: () => pay(),
      auth: () => openAuth(),
      signout: () => { supabaseClient.auth.signOut(); store.data.user = null; store.save(); toast('Signed out'); go('#/'); },
      quote: () => openQuote(id),
      enroll: () => enrol(id),
      tab: () => go('#/account?tab=' + id),
      certificate: () => certificate(id),
      download: async () => {
        try {
          const res = await api('/api/downloads/' + id);
          toast('Download link ready — opening now (valid 15 minutes)', 'ok');
          window.open(res.url, '_blank');
        } catch (err) {
          toast(err.message || 'Could not get the download link', 'err');
        }
      },
      'clear-filters': () => go('#/products'),
      complete: () => {
        const en = store.data.enrollments[id];
        if (!en.completed.includes(t.dataset.lesson)) en.completed.push(t.dataset.lesson);
        store.save();
        const c = DB.course(id);
        if (en.completed.length === c.lessons.length) toast('Course complete. Your certificate is ready.', 'ok');
        else toast('Lesson marked complete', 'ok');
        render();
      },
      play: () => { store.data.enrollments[id].current = t.dataset.lesson; store.save(); render(); },
      'next-lesson': () => {
        const c = DB.course(id), en = store.data.enrollments[id];
        const i = c.lessons.findIndex(l => l.id === en.current);
        en.current = c.lessons[Math.min(i + 1, c.lessons.length - 1)].id;
        store.save(); render();
      },
      'write-review': () => openModal(`
        <h3>Write a review</h3><p class="muted">${esc(DB.product(id).title)}</p>
        <form data-act="review-form" data-id="${id}">
          <div class="field"><label><small>Your name</small><input type="text" name="name" required /></label></div>
          <div class="field"><label><small>Rating</small><select name="rating" style="width:100%">
            <option value="5">5 — excellent</option><option value="4">4 — good</option><option value="3">3 — fine</option>
            <option value="2">2 — disappointing</option><option value="1">1 — bad</option></select></label></div>
          <div class="field"><label><small>What should the next buyer know?</small><textarea name="comment" rows="4" required></textarea></label></div>
          <button class="btn btn-primary btn-block" type="submit">Submit for review</button>
        </form>`)
    };
    if (handlers[act]) { e.preventDefault(); handlers[act](); }
  });

  /* filters */
  document.addEventListener('input', e => {
    const f = e.target.dataset && e.target.dataset.filter;
    if (!f) return;
    if (f === 'max') { $('#maxOut').textContent = money(e.target.value); return; }
  });
  document.addEventListener('change', e => {
    const f = e.target.dataset && e.target.dataset.filter;
    if (!f) return;
    const q = parseQuery((location.hash.split('?')[1] || ''));
    if (f === 'cat') {
      const on = $$('[data-filter="cat"]:checked').map(i => i.value);
      on.length ? q.cat = on.join(',') : delete q.cat;
    }
    if (f === 'max') q.max = e.target.value;
    if (f === 'deals') e.target.checked ? q.deals = '1' : delete q.deals;
    if (f === 'sort') q.sort = e.target.value;
    go('#/products?' + Object.entries(q).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&'));
  });

  /* forms */
  document.addEventListener('submit', async e => {
    const form = e.target.closest('[data-act]');
    if (!form) return;
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const act = form.dataset.act;

    if (act === 'auth-form') {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Please wait…'; }

      // Try signing in first; if that account doesn't exist yet, create it.
      let { error } = await supabaseClient.auth.signInWithPassword({ email: d.email, password: d.password });
      if (error) {
        const signUpRes = await supabaseClient.auth.signUp({
          email: d.email,
          password: d.password,
          options: { data: { name: d.name } }
        });
        error = signUpRes.error;
      }

      if (btn) { btn.disabled = false; btn.textContent = 'Continue'; }

      if (error) { toast(error.message, 'err'); return; }

      await syncUserFromSession();
      closeAll();
      toast(`Welcome, ${store.data.user.name.split(' ')[0]}`, 'ok');
      go('#/account');
    }
    if (act === 'profile-form') {
      Object.assign(store.data.user, d); store.save(); toast('Profile saved', 'ok');
    }
    if (act === 'quote-form' || act === 'contact-form') {
      store.data.enquiries.push({ id: 'EQ' + Date.now().toString().slice(-6), service_id: form.dataset.id || null, ...d, status: 'new', created_at: new Date().toISOString() });
      store.save(); closeAll();
      toast('Enquiry sent. Expect a reply at ' + d.email, 'ok');
      form.reset && form.reset();
    }
    if (act === 'review-form') {
      DB.raw.reviews.push({
        id: 'r' + Date.now(), product_id: form.dataset.id, user_name: d.name,
        rating: +d.rating, comment: d.comment, is_approved: false, created_at: new Date().toISOString()
      });
      DB.save(); closeAll(); toast('Thanks — your review is queued for moderation', 'ok');
    }
    if (act === 'subscribe') {
      const email = form.querySelector('input').value;
      store.data.subscribers.push(email); store.save();
      form.reset(); toast('Subscribed. One email when something new ships.', 'ok');
    }
  });
}

/* ---------------- boot ---------------- */
async function start() {
  store.load();
  /* Catalogue comes from Supabase when it has products, else the local seed.
     Ids change from 'p1'-style to UUIDs, so clear old demo cart/orders once. */
  const live = await DB.loadRemote();
  if (live && store.data.catalogSource !== 'supabase') {
    store.data.cart = []; store.data.wishlist = []; store.data.orders = []; store.data.enrollments = {};
    store.data.catalogSource = 'supabase';
    store.save();
  }
  await syncUserFromSession();
  paintCounters();
  wireGlobal();
  render();
  paintBuyBar();

  // Keep store.data.user in sync if the session changes in another tab,
  // or expires/refreshes.
  supabaseClient.auth.onAuthStateChange(async () => {
    await syncUserFromSession();
    render();
  });
}

return { start, go, toast, art, money, esc, initials, store, openModal, closeAll, render, $, $$, price };
})();
