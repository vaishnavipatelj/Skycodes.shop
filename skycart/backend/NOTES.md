# Wiring the real backend

The demo functions in `assets/js/app.js` are named after the routes that replace them, so the port is
mechanical.

| Demo function (app.js) | Replace with |
|---|---|
| `checkout()` | `POST /api/checkout/create-order` — recompute the total from the `products` table, create the Razorpay order, return `order_id` |
| Razorpay modal | `new Razorpay({ order_id, key: NEXT_PUBLIC_RAZORPAY_KEY, handler })` on the client |
| `fulfil()` | `POST /api/webhooks/razorpay` — verify the signature, set `orders.status='paid'`, sign download URLs, insert enrollments, send the email |
| `enrol()` | webhook for paid courses; a direct insert into `enrollments` for free ones |
| `download` action | `POST /api/downloads/:productId` — check the caller owns it, then `createSignedUrl(file_path, 900)` |
| `certificate()` | keep the canvas, or render server-side to PDF and store it |
| `Admin` writes | server actions using the Supabase service role key, gated on the owner's user id |

## Payment rules

- The cart total is never read from the request body. Sum `price_inr`/`discount_price_inr` from the database
  for the submitted product ids.
- The client success callback only closes the modal and shows a pending state. Access is granted by the
  webhook, after `hmac_sha256(order_id + "|" + payment_id, RAZORPAY_SECRET)` matches the signature header.
- Webhook handlers must be idempotent — Razorpay retries.

## File protection

- Product files and paid lesson videos go in a **private** Supabase Storage bucket. No public policy on it.
- Delivery email link: 48 hours. Re-download from the account page: 15 minutes.
- Lesson video: signed URL issued per playback request, only when an `enrollments` row exists for that user
  and course.

## Environment

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # server only
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=            # server only
RAZORPAY_WEBHOOK_SECRET=        # server only
RESEND_API_KEY=
ADMIN_EMAIL=contact.skycodes@gmail.com
```

## Seeding

Admin → Data → Export catalogue as JSON gives you `categories`, `products`, `services`, `courses` and
`reviews` in the same shape as the SQL tables. Import it with a small script using the service role key, or
paste into the Supabase table editor.
