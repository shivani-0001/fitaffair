const express = require("express");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const multer = require("multer");

const app = express();

// Render PORT automatically provide karta hai
const PORT = process.env.PORT || 3000;

// Admin key Environment Variable se lo
// Agar Render me ADMIN_KEY nahi hai to ye default use hoga
const ADMIN_KEY = process.env.ADMIN_KEY || "fitt-admin-73023";

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const UPLOADS = path.join(PUBLIC, "uploads");

// Upload folder create
fs.mkdirSync(UPLOADS, { recursive: true });

// SQLite database
const db = new Database(path.join(ROOT, "fitt_affair.sqlite"));
db.pragma("journal_mode = WAL");

// =========================
// DATABASE TABLES
// =========================

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  brand_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  hero_title TEXT NOT NULL,
  hero_subtitle TEXT NOT NULL,
  hero_badge TEXT NOT NULL,
  announcement TEXT NOT NULL,
  accent TEXT NOT NULL,
  dark_mode INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  old_price REAL DEFAULT 0,
  image TEXT DEFAULT '',
  description TEXT DEFAULT '',
  badge TEXT DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  items_json TEXT NOT NULL,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'New',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// =========================
// DEFAULT SETTINGS
// =========================

const existing = db.prepare(
  "SELECT id FROM settings WHERE id=1"
).get();

if (!existing) {
  db.prepare(`
    INSERT INTO settings
    (
      id,
      brand_name,
      phone,
      hero_title,
      hero_subtitle,
      hero_badge,
      announcement,
      accent,
      dark_mode
    )
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    "Fitt Affair Nutrition",
    "+91 73023 88557",
    "Build Strong. Live Better.",
    "Premium sports nutrition for your next level.",
    "TRAIN HARD • RECOVER SMART • REPEAT",
    "Free shipping on orders above ₹1,499 • COD available",
    "#8B5CF6",
    1
  );
}

// =========================
// DEFAULT PRODUCTS
// =========================

const count = db.prepare(
  "SELECT COUNT(*) AS c FROM products"
).get().c;

if (!count) {
  const seed = db.prepare(`
    INSERT INTO products
    (
      name,
      category,
      price,
      old_price,
      image,
      description,
      badge,
      stock,
      featured
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  seed.run(
    "Whey Protein Pro",
    "Protein",
    2499,
    3299,
    "",
    "Fast-mixing whey protein designed for daily strength and recovery.",
    "BESTSELLER",
    25,
    1
  );

  seed.run(
    "Creatine Monohydrate",
    "Creatine",
    999,
    1299,
    "",
    "Pure creatine monohydrate for strength, power and performance.",
    "TOP PICK",
    40,
    1
  );

  seed.run(
    "Pre-Workout Ignite",
    "Pre-Workout",
    1199,
    1499,
    "",
    "High-performance pre-workout for focused training sessions.",
    "ENERGY",
    18,
    1
  );
}

// =========================
// MULTER UPLOAD
// =========================

const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => {
      cb(null, UPLOADS);
    },

    filename: (_, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();

      cb(
        null,
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}${ext}`
      );
    }
  }),

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (_, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ];

    cb(null, allowed.includes(file.mimetype));
  }
});

// =========================
// MIDDLEWARE
// =========================

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(PUBLIC));

// =========================
// ADMIN AUTH
// =========================

function admin(req, res, next) {
  const key =
    req.headers["x-admin-key"] ||
    req.query.key;

  if (key !== ADMIN_KEY) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  next();
}

// =========================
// STORE API
// =========================

app.get("/api/store", (req, res) => {
  const settings = db
    .prepare("SELECT * FROM settings WHERE id=1")
    .get();

  const products = db
    .prepare(
      "SELECT * FROM products ORDER BY featured DESC, id DESC"
    )
    .all();

  res.json({
    settings,
    products
  });
});

// =========================
// ORDERS
// =========================

app.post("/api/orders", (req, res) => {
  const {
    customer_name,
    phone,
    address,
    items
  } = req.body;

  if (
    !customer_name ||
    !phone ||
    !address ||
    !Array.isArray(items) ||
    !items.length
  ) {
    return res.status(400).json({
      error: "Please complete all order fields."
    });
  }

  const ids = items
    .map(x => Number(x.id))
    .filter(Boolean);

  if (!ids.length) {
    return res.status(400).json({
      error: "No valid products selected."
    });
  }

  const placeholders = ids
    .map(() => "?")
    .join(",");

  const products = db
    .prepare(
      `SELECT id,name,price
       FROM products
       WHERE id IN (${placeholders})`
    )
    .all(...ids);

  const map = new Map(
    products.map(p => [p.id, p])
  );

  let total = 0;
  const normalized = [];

  for (const item of items) {
    const p = map.get(Number(item.id));

    const qty = Math.max(
      1,
      Math.min(99, Number(item.qty) || 1)
    );

    if (!p) continue;

    total += p.price * qty;

    normalized.push({
      id: p.id,
      name: p.name,
      price: p.price,
      qty
    });
  }

  if (!normalized.length) {
    return res.status(400).json({
      error: "No valid products selected."
    });
  }

  const result = db.prepare(`
    INSERT INTO orders
    (
      customer_name,
      phone,
      address,
      items_json,
      total
    )
    VALUES (?, ?, ?, ?, ?)
  `).run(
    customer_name.trim(),
    phone.trim(),
    address.trim(),
    JSON.stringify(normalized),
    total
  );

  res.json({
    ok: true,
    orderId: result.lastInsertRowid,
    total
  });
});

// =========================
// ADMIN DATA
// =========================

app.get("/api/admin/data", admin, (req, res) => {
  const settings = db
    .prepare("SELECT * FROM settings WHERE id=1")
    .get();

  const products = db
    .prepare(
      "SELECT * FROM products ORDER BY id DESC"
    )
    .all();

  const orders = db
    .prepare(
      "SELECT * FROM orders ORDER BY id DESC"
    )
    .all()
    .map(o => ({
      ...o,
      items: JSON.parse(o.items_json)
    }));

  res.json({
    settings,
    products,
    orders
  });
});

// =========================
// ADMIN SETTINGS
// =========================

app.put("/api/admin/settings", admin, (req, res) => {
  const allowed = [
    "brand_name",
    "phone",
    "hero_title",
    "hero_subtitle",
    "hero_badge",
    "announcement",
    "accent",
    "dark_mode"
  ];

  const current = db
    .prepare("SELECT * FROM settings WHERE id=1")
    .get();

  const data = Object.fromEntries(
    allowed.map(k => [
      k,
      req.body[k] ?? current[k]
    ])
  );

  db.prepare(`
    UPDATE settings
    SET
      brand_name=?,
      phone=?,
      hero_title=?,
      hero_subtitle=?,
      hero_badge=?,
      announcement=?,
      accent=?,
      dark_mode=?
    WHERE id=1
  `).run(
    data.brand_name,
    data.phone,
    data.hero_title,
    data.hero_subtitle,
    data.hero_badge,
    data.announcement,
    data.accent,
    Number(data.dark_mode) ? 1 : 0
  );

  res.json({
    ok: true
  });
});

// =========================
// ADD PRODUCT
// =========================

app.post("/api/admin/products", admin, (req, res) => {
  const p = req.body;

  if (
    !p.name ||
    !p.category ||
    p.price === undefined
  ) {
    return res.status(400).json({
      error: "Name, category and price are required."
    });
  }

  const result = db.prepare(`
    INSERT INTO products
    (
      name,
      category,
      price,
      old_price,
      image,
      description,
      badge,
      stock,
      featured
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    p.name,
    p.category,
    Number(p.price),
    Number(p.old_price || 0),
    p.image || "",
    p.description || "",
    p.badge || "",
    Number(p.stock || 0),
    Number(p.featured) ? 1 : 0
  );

  res.json({
    ok: true,
    id: result.lastInsertRowid
  });
});

// =========================
// UPDATE PRODUCT
// =========================

app.put("/api/admin/products/:id", admin, (req, res) => {
  const p = req.body;

  db.prepare(`
    UPDATE products
    SET
      name=?,
      category=?,
      price=?,
      old_price=?,
      image=?,
      description=?,
      badge=?,
      stock=?,
      featured=?
    WHERE id=?
  `).run(
    p.name,
    p.category,
    Number(p.price),
    Number(p.old_price || 0),
    p.image || "",
    p.description || "",
    p.badge || "",
    Number(p.stock || 0),
    Number(p.featured) ? 1 : 0,
    Number(req.params.id)
  );

  res.json({
    ok: true
  });
});

// =========================
// DELETE PRODUCT
// =========================

app.delete("/api/admin/products/:id", admin, (req, res) => {
  db.prepare(
    "DELETE FROM products WHERE id=?"
  ).run(Number(req.params.id));

  res.json({
    ok: true
  });
});

// =========================
// UPDATE ORDER STATUS
// =========================

app.put("/api/admin/orders/:id", admin, (req, res) => {
  const allowed = [
    "New",
    "Confirmed",
    "Packed",
    "Shipped",
    "Delivered",
    "Cancelled"
  ];

  if (!allowed.includes(req.body.status)) {
    return res.status(400).json({
      error: "Invalid status."
    });
  }

  db.prepare(
    "UPDATE orders SET status=? WHERE id=?"
  ).run(
    req.body.status,
    Number(req.params.id)
  );

  res.json({
    ok: true
  });
});

// =========================
// IMAGE UPLOAD
// =========================

app.post(
  "/api/admin/upload",
  admin,
  upload.single("image"),
  (req, res) => {

    if (!req.file) {
      return res.status(400).json({
        error: "Image upload failed."
      });
    }

    res.json({
      ok: true,
      url: `/uploads/${req.file.filename}`
    });
  }
);

// =========================
// ADMIN PAGE
// =========================

app.get("/admin", (req, res) => {
  res.sendFile(
    path.join(PUBLIC, "admin.html")
  );
});

// =========================
// HOME PAGE
// =========================

// IMPORTANT:
// app.get((req,res) => {}) ko replace kiya gaya hai.
// Ye fallback route hai.
app.use((req, res) => {
  res.sendFile(
    path.join(PUBLIC, "index.html")
  );
});

// =========================
// ERROR HANDLER
// =========================

app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  res.status(500).json({
    error: "Internal server error"
  });
});

// =========================
// START SERVER
// =========================

// IMPORTANT FOR RENDER:
// 0.0.0.0 par listen karna zaroori hai.
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `Fitt Affair Nutrition running on port ${PORT}`
  );

  console.log(
    `Server started successfully`
  );
});
