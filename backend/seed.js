const db = require('./db');
const { subDays, format, addDays } = require('date-fns');

const schools = [
  { name: 'Escola Estadual Prof. João Silva', city: 'São Paulo' },
  { name: 'EMEF Maria Auxiliadora', city: 'Campinas' },
  { name: 'Colégio Estadual Pedro II', city: 'Santos' },
  { name: 'Escola Municipal Ana Nery', city: 'Guarulhos' },
  { name: 'EMEF Santos Dumont', city: 'São Bernardo do Campo' },
  { name: 'Escola Estadual Rui Barbosa', city: 'Sorocaba' },
];

const drivers = [
  { name: 'Carlos Mendes' },
  { name: 'Roberto Alves' },
  { name: 'Fernanda Costa' },
  { name: 'Marcos Pereira' },
];

const products = [
  { name: 'Arroz (5kg)', category: 'Alimentos' },
  { name: 'Feijão (1kg)', category: 'Alimentos' },
  { name: 'Óleo de Soja (900ml)', category: 'Alimentos' },
  { name: 'Açúcar (1kg)', category: 'Alimentos' },
  { name: 'Sal (1kg)', category: 'Alimentos' },
  { name: 'Macarrão (500g)', category: 'Alimentos' },
  { name: 'Farinha de Trigo (1kg)', category: 'Alimentos' },
  { name: 'Leite em Pó (400g)', category: 'Alimentos' },
  { name: 'Detergente (500ml)', category: 'Limpeza' },
  { name: 'Sabão em Pó (1kg)', category: 'Limpeza' },
  { name: 'Álcool 70% (1L)', category: 'Higiene' },
  { name: 'Papel Higiênico (fardo 12un)', category: 'Higiene' },
];

const statuses = ['open', 'in_transit', 'delivered', 'cancelled'];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function fmt(date) {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

// Clear existing data
db.exec(`
  DELETE FROM stock_movements;
  DELETE FROM stock;
  DELETE FROM request_items;
  DELETE FROM requests;
  DELETE FROM products;
  DELETE FROM drivers;
  DELETE FROM schools;
`);

// Insert schools
const insertSchool = db.prepare('INSERT INTO schools (name, city) VALUES (?, ?)');
for (const s of schools) insertSchool.run(s.name, s.city);
const schoolIds = db.prepare('SELECT id FROM schools').all().map(r => r.id);

// Insert drivers
const insertDriver = db.prepare('INSERT INTO drivers (name) VALUES (?)');
for (const d of drivers) insertDriver.run(d.name);
const driverIds = db.prepare('SELECT id FROM drivers').all().map(r => r.id);

// Insert products
const insertProduct = db.prepare('INSERT INTO products (name, category) VALUES (?, ?)');
for (const p of products) insertProduct.run(p.name, p.category);
const productIds = db.prepare('SELECT id FROM products').all().map(r => r.id);

// Insert requests (50 requests over last 45 days)
const insertRequest = db.prepare(
  'INSERT INTO requests (status, school_id, driver_id, created_at, delivered_at, expected_delivery_at) VALUES (?, ?, ?, ?, ?, ?)'
);
const insertItem = db.prepare(
  'INSERT INTO request_items (request_id, product_id, quantity_requested, quantity_delivered) VALUES (?, ?, ?, ?)'
);

const now = new Date();

for (let i = 0; i < 55; i++) {
  const createdAt = subDays(now, randInt(0, 45));
  const expectedAt = addDays(createdAt, randInt(1, 5));
  const schoolId = rand(schoolIds);
  const driverId = Math.random() > 0.15 ? rand(driverIds) : null;

  let status;
  const r = Math.random();
  if (r < 0.12) status = 'open';
  else if (r < 0.22) status = 'in_transit';
  else if (r < 0.88) status = 'delivered';
  else status = 'cancelled';

  let deliveredAt = null;
  if (status === 'delivered') {
    deliveredAt = fmt(addDays(createdAt, randInt(1, 6)));
  }

  const reqId = insertRequest.run(
    status,
    schoolId,
    driverId,
    fmt(createdAt),
    deliveredAt,
    fmt(expectedAt)
  ).lastInsertRowid;

  // 1-4 items per request
  const numItems = randInt(1, 4);
  const chosenProducts = [...productIds].sort(() => Math.random() - 0.5).slice(0, numItems);
  for (const pid of chosenProducts) {
    const qtyReq = randInt(5, 50);
    let qtyDel = null;
    if (status === 'delivered') {
      // Some divergences: 20% chance of under-delivery
      qtyDel = Math.random() < 0.2 ? randInt(1, qtyReq - 1) : qtyReq;
    }
    insertItem.run(reqId, pid, qtyReq, qtyDel);
  }
}

// Insert stock data
const insertStock = db.prepare(
  'INSERT OR REPLACE INTO stock (product_id, school_id, quantity, updated_at) VALUES (?, ?, ?, ?)'
);
for (const sid of schoolIds) {
  for (const pid of productIds) {
    const qty = randInt(0, 150);
    insertStock.run(pid, sid, qty, fmt(now));
  }
}

// Insert stock movements (last 30 days)
const insertMovement = db.prepare(
  'INSERT INTO stock_movements (product_id, school_id, quantity_change, movement_type, created_at) VALUES (?, ?, ?, ?, ?)'
);
for (let i = 0; i < 80; i++) {
  const pid = rand(productIds);
  const sid = rand(schoolIds);
  const type = Math.random() > 0.4 ? 'out' : 'in';
  const qty = randInt(1, 30);
  const date = subDays(now, randInt(0, 30));
  insertMovement.run(pid, sid, qty, type, fmt(date));
}

console.log('Database seeded successfully!');
console.log(`  Schools: ${schoolIds.length}`);
console.log(`  Drivers: ${driverIds.length}`);
console.log(`  Products: ${productIds.length}`);
console.log(`  Requests: ${db.prepare('SELECT COUNT(*) as c FROM requests').get().c}`);
console.log(`  Stock entries: ${db.prepare('SELECT COUNT(*) as c FROM stock').get().c}`);
console.log(`  Stock movements: ${db.prepare('SELECT COUNT(*) as c FROM stock_movements').get().c}`);
