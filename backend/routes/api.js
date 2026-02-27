const express = require('express');
const router = express.Router();
const db = require('../db');
const { subDays, format } = require('date-fns');

function defaultDates(query) {
  const end = query.endDate || format(new Date(), "yyyy-MM-dd'T'23:59:59");
  const start = query.startDate || format(subDays(new Date(), 30), "yyyy-MM-dd'T'00:00:00");
  return { start, end };
}

// GET /api/dashboard
router.get('/dashboard', (req, res) => {
  const today = format(new Date(), 'yyyy-MM-dd');

  const openCount = db.prepare(
    "SELECT COUNT(*) as c FROM requests WHERE status = 'open'"
  ).get().c;

  const inTransitCount = db.prepare(
    "SELECT COUNT(*) as c FROM requests WHERE status = 'in_transit'"
  ).get().c;

  const deliveredToday = db.prepare(
    "SELECT COUNT(*) as c FROM requests WHERE status = 'delivered' AND delivered_at LIKE ?"
  ).get(`${today}%`).c;

  const criticalStock = db.prepare(
    'SELECT COUNT(*) as c FROM stock WHERE quantity < 10'
  ).get().c;

  res.json({
    open_requests: openCount,
    in_transit: inTransitCount,
    delivered_today: deliveredToday,
    critical_stock_alerts: criticalStock,
  });
});

// GET /api/filters
router.get('/filters', (req, res) => {
  const schools = db.prepare('SELECT id, name, city FROM schools ORDER BY name').all();
  const drivers = db.prepare('SELECT id, name FROM drivers ORDER BY name').all();
  res.json({ schools, drivers });
});

// GET /api/reports/summary
router.get('/reports/summary', (req, res) => {
  const { start, end } = defaultDates(req.query);
  const { schoolId, driverId } = req.query;

  let where = 'WHERE created_at BETWEEN ? AND ?';
  const params = [start, end];

  if (schoolId) { where += ' AND school_id = ?'; params.push(schoolId); }
  if (driverId) { where += ' AND driver_id = ?'; params.push(driverId); }

  const rows = db.prepare(
    `SELECT status, COUNT(*) as count FROM requests ${where} GROUP BY status`
  ).all(...params);

  const summary = { open: 0, in_transit: 0, delivered: 0, cancelled: 0 };
  for (const row of rows) summary[row.status] = row.count;

  res.json({ summary, period: { start, end } });
});

// GET /api/reports/deliveries
router.get('/reports/deliveries', (req, res) => {
  const { start, end } = defaultDates(req.query);
  const { schoolId, driverId } = req.query;

  let where = "WHERE r.status = 'delivered' AND r.delivered_at BETWEEN ? AND ?";
  const params = [start, end];

  if (schoolId) { where += ' AND r.school_id = ?'; params.push(schoolId); }
  if (driverId) { where += ' AND r.driver_id = ?'; params.push(driverId); }

  const rows = db.prepare(`
    SELECT
      r.id,
      r.school_id,
      s.name as school_name,
      r.created_at,
      r.delivered_at,
      r.expected_delivery_at,
      CASE WHEN r.delivered_at <= r.expected_delivery_at THEN 1 ELSE 0 END as on_time,
      CAST((julianday(r.delivered_at) - julianday(r.created_at)) * 24 AS INTEGER) as delivery_hours
    FROM requests r
    JOIN schools s ON s.id = r.school_id
    ${where}
  `).all(...params);

  const total = rows.length;
  const onTimeCount = rows.filter(r => r.on_time).length;
  const onTimeRate = total > 0 ? Math.round((onTimeCount / total) * 100) : 0;
  const avgHours = total > 0
    ? Math.round(rows.reduce((acc, r) => acc + (r.delivery_hours || 0), 0) / total)
    : 0;

  // By school
  const bySchool = {};
  for (const row of rows) {
    if (!bySchool[row.school_name]) bySchool[row.school_name] = { school: row.school_name, count: 0, on_time: 0 };
    bySchool[row.school_name].count++;
    if (row.on_time) bySchool[row.school_name].on_time++;
  }

  // Daily volume (last 30 days)
  const dailyRows = db.prepare(`
    SELECT DATE(r.delivered_at) as day, COUNT(*) as count
    FROM requests r
    ${where}
    GROUP BY day
    ORDER BY day
  `).all(...params);

  res.json({
    total,
    on_time_rate: onTimeRate,
    avg_delivery_hours: avgHours,
    by_school: Object.values(bySchool),
    daily_volume: dailyRows,
    period: { start, end },
  });
});

// GET /api/reports/stock
router.get('/reports/stock', (req, res) => {
  const { start, end } = defaultDates(req.query);
  const { schoolId } = req.query;

  let stockWhere = '';
  const stockParams = [];
  if (schoolId) { stockWhere = 'WHERE s.school_id = ?'; stockParams.push(schoolId); }

  const stockLevels = db.prepare(`
    SELECT p.id, p.name, p.category, SUM(s.quantity) as total_quantity
    FROM stock s
    JOIN products p ON p.id = s.product_id
    ${stockWhere}
    GROUP BY p.id
    ORDER BY total_quantity ASC
  `).all(...stockParams);

  let movWhere = 'WHERE sm.created_at BETWEEN ? AND ?';
  const movParams = [start, end];
  if (schoolId) { movWhere += ' AND sm.school_id = ?'; movParams.push(schoolId); }

  const movements = db.prepare(`
    SELECT p.name as product, sm.movement_type, SUM(sm.quantity_change) as total
    FROM stock_movements sm
    JOIN products p ON p.id = sm.product_id
    ${movWhere}
    GROUP BY p.id, sm.movement_type
    ORDER BY total DESC
  `).all(...movParams);

  let itemWhere = 'WHERE r.created_at BETWEEN ? AND ?';
  const itemParams = [start, end];
  if (schoolId) { itemWhere += ' AND r.school_id = ?'; itemParams.push(schoolId); }

  const topProducts = db.prepare(`
    SELECT p.name, p.category, SUM(ri.quantity_requested) as total_requested
    FROM request_items ri
    JOIN products p ON p.id = ri.product_id
    JOIN requests r ON r.id = ri.request_id
    ${itemWhere}
    GROUP BY p.id
    ORDER BY total_requested DESC
    LIMIT 10
  `).all(...itemParams);

  let critWhere = 'WHERE s.quantity < 10';
  const critParams = [];
  if (schoolId) { critWhere += ' AND s.school_id = ?'; critParams.push(schoolId); }

  const criticalStock = db.prepare(`
    SELECT p.id, p.name, sc.name as school_name, s.quantity
    FROM stock s
    JOIN products p ON p.id = s.product_id
    JOIN schools sc ON sc.id = s.school_id
    ${critWhere}
    ORDER BY s.quantity ASC
    LIMIT 10
  `).all(...critParams);

  res.json({ stock_levels: stockLevels, movements, top_products: topProducts, critical_stock: criticalStock, period: { start, end } });
});

// GET /api/reports/driver-performance
router.get('/reports/driver-performance', (req, res) => {
  const { start, end } = defaultDates(req.query);
  const { driverId } = req.query;

  let where = 'WHERE r.created_at BETWEEN ? AND ? AND r.driver_id IS NOT NULL';
  const params = [start, end];
  if (driverId) { where += ' AND r.driver_id = ?'; params.push(driverId); }

  const rows = db.prepare(`
    SELECT
      d.id,
      d.name as driver_name,
      COUNT(*) as total_deliveries,
      SUM(CASE WHEN r.status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN r.status = 'delivered' AND r.delivered_at <= r.expected_delivery_at THEN 1 ELSE 0 END) as on_time,
      SUM(CASE WHEN r.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
    FROM requests r
    JOIN drivers d ON d.id = r.driver_id
    ${where}
    GROUP BY d.id
    ORDER BY delivered DESC
  `).all(...params);

  const result = rows.map(r => ({
    ...r,
    on_time_rate: r.delivered > 0 ? Math.round((r.on_time / r.delivered) * 100) : 0,
  }));

  res.json({ drivers: result, period: { start, end } });
});

// GET /api/reports/divergences
router.get('/reports/divergences', (req, res) => {
  const { start, end } = defaultDates(req.query);
  const { schoolId, driverId } = req.query;

  let where = "WHERE r.status = 'delivered' AND r.delivered_at BETWEEN ? AND ? AND ri.quantity_delivered < ri.quantity_requested";
  const params = [start, end];
  if (schoolId) { where += ' AND r.school_id = ?'; params.push(schoolId); }
  if (driverId) { where += ' AND r.driver_id = ?'; params.push(driverId); }

  const rows = db.prepare(`
    SELECT
      r.id as request_id,
      s.name as school_name,
      d.name as driver_name,
      r.delivered_at,
      p.name as product_name,
      ri.quantity_requested,
      ri.quantity_delivered,
      (ri.quantity_requested - COALESCE(ri.quantity_delivered, 0)) as missing_quantity
    FROM requests r
    JOIN schools s ON s.id = r.school_id
    LEFT JOIN drivers d ON d.id = r.driver_id
    JOIN request_items ri ON ri.request_id = r.id
    JOIN products p ON p.id = ri.product_id
    ${where}
    ORDER BY r.delivered_at DESC
  `).all(...params);

  res.json({ divergences: rows, total: rows.length, period: { start, end } });
});

module.exports = router;
