// api/_lib/razorpay.js
//
// Env vars required:
//   RAZORPAY_KEY_ID        (also exposed to the client as NEXT_PUBLIC_RAZORPAY_KEY_ID)
//   RAZORPAY_KEY_SECRET    (server only)

const Razorpay = require('razorpay');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = { razorpay };
