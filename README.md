# Fitt Affair Nutrition

A two-page supplement e-commerce starter:
- `/` = public store
- `/admin` = private admin page (not linked from the store)
- SQLite database for products, orders and website settings
- Node.js + Express backend is required because browser-only HTML/CSS/JS cannot safely write to SQLite.

## Run locally

1. Install Node.js 18+.
2. Open this folder in VS Code.
3. Run:
   npm install
4. Run:
   npm start
5. Open:
   http://localhost:3000
6. Admin:
   http://localhost:3000/admin?key=fitt-admin-73023

## IMPORTANT before publishing

Change `ADMIN_KEY` in `server.js` or set an environment variable:
- Windows PowerShell: `$env:ADMIN_KEY="your-long-random-key"; npm start`
- Linux/macOS: `ADMIN_KEY="your-long-random-key" npm start`

The hidden URL is only obscurity. The admin key is the actual access check.

## Admin features

- Change brand name, phone, hero title/subtitle/badge, announcement and accent color.
- Add/edit/delete products.
- Product name, category, price, old price, image URL/upload, description, badge, stock, featured.
- View all orders and customer details.
- Change order status: New, Confirmed, Packed, Shipped, Delivered, Cancelled.
- Dashboard revenue/product/order counters.

## Payment

This starter records orders and supports COD-style checkout. It does NOT claim that an online payment was completed. For live UPI/Razorpay/Stripe payments, add a real payment gateway on the server.

## Images

Admin can upload JPG/PNG/WebP/GIF images up to 5 MB. Uploaded images are stored under `public/uploads/`.
