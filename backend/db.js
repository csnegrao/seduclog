const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'seduclog.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    city TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT NOT NULL CHECK(status IN ('open','in_transit','delivered','cancelled')),
    school_id INTEGER NOT NULL REFERENCES schools(id),
    driver_id INTEGER REFERENCES drivers(id),
    created_at TEXT NOT NULL,
    delivered_at TEXT,
    expected_delivery_at TEXT
  );

  CREATE TABLE IF NOT EXISTS request_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id INTEGER NOT NULL REFERENCES requests(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity_requested INTEGER NOT NULL,
    quantity_delivered INTEGER
  );

  CREATE TABLE IF NOT EXISTS stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    school_id INTEGER NOT NULL REFERENCES schools(id),
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    UNIQUE(product_id, school_id)
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    school_id INTEGER NOT NULL REFERENCES schools(id),
    quantity_change INTEGER NOT NULL,
    movement_type TEXT NOT NULL CHECK(movement_type IN ('in','out')),
    created_at TEXT NOT NULL
  );
`);

module.exports = db;
