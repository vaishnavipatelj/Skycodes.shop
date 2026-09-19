# SkyCodes — working front end

Open `index.html` in any browser. No build step, no install, no server needed.

Everything in the interface works against a real data layer: the catalogue lives in `assets/js/data.js`,
gets copied into browser storage on first load, and every admin edit writes back to it. Nothing on any page
is hardcoded — change a product title in the admin panel and the homepage, search, cart and product page all
follow.

## What works right now

**Shop**
- 30 digital products across 7 categories, seeded from the launch list
- Filter by category, price ceiling and discount; sort by popularity, date, price or name
- Product pages with cover art, specs, reviews, related items, and bundle contents priced against buying separately
- Cart drawer with quantities, wishlist with hearts on every card, both persisted

**Search** — click the magnifier or press Ctrl/Cmd + K. Searches products, courses and services, jumps straight to the item, and Enter opens the full result page.

**Courses**
- Free courses link out to YouTube; paid courses have a curriculum, enrolment, a lesson player, per-lesson completion, a progress bar, and a certificate that downloads as a PNG with the learner's name on it

**Services** — the ten areas as an animated list, each with a quote request form that lands in the admin panel

**Account** — sign in, orders, downloads, my courses, certificates, wishlist, profile

**Checkout** — cart totals, an order confirmation step where Razorpay's modal will sit, then fulfilment that does exactly what the webhook will do: create the order, grant course access, empty the cart, show the download links

**Admin** — at `#/admin` (linked in the footer). Full create, edit, hide and delete for products, categories, courses, lessons and services, plus orders, quote enquiries, review moderation, and a JSON export of the whole catalogue to seed your database.

## File map

```
index.html            app shell: header, footer, cart drawer, modal, search overlay, buy bar
assets/css/styles.css all styling, driven by design tokens at the top of the file
assets/js/data.js     catalogue + storage layer (the thing your database replaces)
assets/js/scene.js    the 3D hero — a small perspective renderer, no library
assets/js/app.js      router, state, every storefront page, cart, search, auth, checkout
assets/js/admin.js    admin panel and CRUD
assets/img/           logo mark, wordmark and portrait
backend/              SQL schema and the notes for wiring Supabase + Razorpay
```

## The rebrand

Renamed top to bottom from SkyCart to **SkyCodes.Shop**, with a from-scratch visual pass: a deep-navy
palette pulled from the actual logo, Sora/Instrument Sans in place of the old type, a hand-written 3D
scene in the hero (your logo's ribbon, folded and lit in real perspective, no Three.js needed), and
pointer-tilt product cards. Touch devices get the flat card — a tilt you can't aim is just jitter, so it's
skipped below `(hover:hover)`, and `prefers-reduced-motion` is respected throughout.

## Restyling it

Every colour, font, radius and width is a variable in the first block of `styles.css`. Change
`--blue`, `--grad` and `--font-display` there and the whole site changes; no component markup needs touching.
That was a hard requirement in the brief, so the tokens are the only place colours are written down.

## Going live

This is the front end plus a fake backend. `backend/NOTES.md` has the route-by-route map from the demo
functions here to the real Next.js API routes, and `backend/supabase-schema.sql` creates the tables the
data layer already matches.

Two rules worth keeping when you wire it up:
1. Prices are recalculated server-side at checkout. Never trust the number the browser sends.
2. Only the verified Razorpay webhook grants downloads and course access — never the client success callback.
