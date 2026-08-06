const mysql = require("mysql2/promise");

const databaseConfig = {
  host: process.env.DB_HOST || "db",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "drmaintenance",
  password: process.env.DB_PASSWORD || "drmaintenance",
  database: process.env.DB_NAME || "drmaintenance",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
  queueLimit: 0
};

const pool = mysql.createPool(databaseConfig);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForDatabase(maxAttempts = 45) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      await sleep(1500);
    }
  }
}

async function runMigrations() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      asset_type VARCHAR(120) NOT NULL,
      location VARCHAR(160) NOT NULL,
      serial_number VARCHAR(120) NULL,
      criticality ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_assets_location (location),
      INDEX idx_assets_criticality (criticality)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS maintenance_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      asset_id INT NOT NULL,
      title VARCHAR(180) NOT NULL,
      interval_days INT NOT NULL,
      last_done_on DATE NULL,
      next_due_on DATE NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_plans_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
      INDEX idx_plans_due (next_due_on),
      INDEX idx_plans_active (active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS work_orders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      asset_id INT NULL,
      title VARCHAR(180) NOT NULL,
      description TEXT NULL,
      priority ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
      status ENUM('open', 'planned', 'in_progress', 'done') NOT NULL DEFAULT 'open',
      due_date DATE NOT NULL,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_work_orders_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE SET NULL,
      INDEX idx_work_orders_status (status),
      INDEX idx_work_orders_due (due_date),
      INDEX idx_work_orders_priority (priority)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      entity_type VARCHAR(80) NOT NULL,
      entity_id INT NOT NULL,
      message VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_activity_entity (entity_type, entity_id),
      INDEX idx_activity_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await seedInitialData();
}

async function seedInitialData() {
  const [[{ count }]] = await pool.query("SELECT COUNT(*) AS count FROM assets");
  if (count > 0) {
    return;
  }

  const [assetResult] = await pool.query(
    `
      INSERT INTO assets (name, asset_type, location, serial_number, criticality)
      VALUES
        ('Heizkreis Verteiler EG', 'HVAC', 'Technikraum EG', 'HVAC-EG-001', 'high'),
        ('Torsteuerung Lager', 'Gebaeudetechnik', 'Lagerhalle', 'TOR-LAG-024', 'medium'),
        ('PV Wechselrichter 1', 'Energie', 'Dachzentrale', 'PV-WR-001', 'critical'),
        ('Wasserentharter', 'Sanitaer', 'Technikraum UG', 'SAN-WE-004', 'medium')
    `
  );

  await pool.query(
    `
      INSERT INTO maintenance_plans (asset_id, title, interval_days, last_done_on, next_due_on)
      VALUES
        (?, 'Filter und Pumpengruppe pruefen', 90, CURDATE() - INTERVAL 70 DAY, CURDATE() + INTERVAL 20 DAY),
        (?, 'Sicherheitsabschaltung testen', 180, CURDATE() - INTERVAL 150 DAY, CURDATE() + INTERVAL 30 DAY),
        (?, 'Ertragsdaten und Luefter pruefen', 60, CURDATE() - INTERVAL 65 DAY, CURDATE() - INTERVAL 5 DAY),
        (?, 'Salzstand und Harzspuelung pruefen', 45, CURDATE() - INTERVAL 35 DAY, CURDATE() + INTERVAL 10 DAY)
    `,
    [
      assetResult.insertId,
      assetResult.insertId + 1,
      assetResult.insertId + 2,
      assetResult.insertId + 3
    ]
  );

  await pool.query(
    `
      INSERT INTO work_orders (asset_id, title, description, priority, status, due_date)
      VALUES
        (?, 'PV Wechselrichter Wartung ueberfaellig', 'Luefter reinigen und Fehlerhistorie pruefen.', 'critical', 'open', CURDATE() - INTERVAL 5 DAY),
        (?, 'Wasserentharter Service vorbereiten', 'Salzbestand auffuellen, Wasserhaerte messen.', 'medium', 'planned', CURDATE() + INTERVAL 10 DAY),
        (?, 'Torsteuerung Sichtpruefung', 'Lichtschranken und Not-Aus testen.', 'medium', 'in_progress', CURDATE() + INTERVAL 3 DAY)
    `,
    [
      assetResult.insertId + 2,
      assetResult.insertId + 3,
      assetResult.insertId + 1
    ]
  );

  await pool.query(
    `
      INSERT INTO activity_log (entity_type, entity_id, message)
      VALUES
        ('system', 1, 'Startdaten fuer DR Maintenance angelegt.'),
        ('work_order', 1, 'Erster kritischer Auftrag erstellt.'),
        ('asset', 3, 'PV Wechselrichter als kritisch markiert.')
    `
  );
}

async function getDashboardSummary() {
  const [[summary]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM assets) AS assetCount,
      (SELECT COUNT(*) FROM maintenance_plans WHERE active = TRUE) AS activePlanCount,
      (SELECT COUNT(*) FROM work_orders WHERE status <> 'done') AS openWorkOrderCount,
      (SELECT COUNT(*) FROM work_orders WHERE status <> 'done' AND due_date < CURDATE()) AS overdueCount
  `);

  const [workOrders] = await pool.query(`
    SELECT
      wo.id,
      wo.title,
      wo.description,
      wo.priority,
      wo.status,
      wo.due_date AS dueDate,
      a.name AS assetName,
      a.location AS location
    FROM work_orders wo
    LEFT JOIN assets a ON a.id = wo.asset_id
    WHERE wo.status <> 'done'
    ORDER BY wo.due_date ASC, FIELD(wo.priority, 'critical', 'high', 'medium', 'low') ASC
    LIMIT 8
  `);

  const [plans] = await pool.query(`
    SELECT
      mp.id,
      mp.title,
      mp.interval_days AS intervalDays,
      mp.next_due_on AS nextDueOn,
      a.name AS assetName,
      a.location AS location
    FROM maintenance_plans mp
    INNER JOIN assets a ON a.id = mp.asset_id
    WHERE mp.active = TRUE
    ORDER BY mp.next_due_on ASC
    LIMIT 6
  `);

  const [assets] = await pool.query(`
    SELECT id, name, asset_type AS assetType, location, serial_number AS serialNumber, criticality
    FROM assets
    ORDER BY FIELD(criticality, 'critical', 'high', 'medium', 'low') ASC, name ASC
    LIMIT 8
  `);

  const [activity] = await pool.query(`
    SELECT id, message, created_at AS createdAt
    FROM activity_log
    ORDER BY created_at DESC
    LIMIT 8
  `);

  return {
    summary,
    workOrders,
    plans,
    assets,
    activity
  };
}

async function listAssets() {
  const [rows] = await pool.query(`
    SELECT id, name, asset_type AS assetType, location, serial_number AS serialNumber, criticality
    FROM assets
    ORDER BY name ASC
  `);
  return rows;
}

async function createAsset(input) {
  const [result] = await pool.execute(
    `
      INSERT INTO assets (name, asset_type, location, serial_number, criticality)
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      input.name,
      input.assetType,
      input.location,
      input.serialNumber || null,
      input.criticality || "medium"
    ]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('asset', ?, ?)",
    [result.insertId, `Anlage "${input.name}" angelegt.`]
  );

  return getAssetById(result.insertId);
}

async function getAssetById(id) {
  const [[row]] = await pool.execute(
    `
      SELECT id, name, asset_type AS assetType, location, serial_number AS serialNumber, criticality
      FROM assets
      WHERE id = ?
    `,
    [id]
  );
  return row;
}

async function listWorkOrders() {
  const [rows] = await pool.query(`
    SELECT
      wo.id,
      wo.title,
      wo.description,
      wo.priority,
      wo.status,
      wo.due_date AS dueDate,
      wo.completed_at AS completedAt,
      a.name AS assetName,
      a.id AS assetId
    FROM work_orders wo
    LEFT JOIN assets a ON a.id = wo.asset_id
    ORDER BY wo.due_date ASC, wo.created_at DESC
  `);
  return rows;
}

async function createWorkOrder(input) {
  const [result] = await pool.execute(
    `
      INSERT INTO work_orders (asset_id, title, description, priority, status, due_date)
      VALUES (?, ?, ?, ?, 'open', ?)
    `,
    [
      input.assetId || null,
      input.title,
      input.description || null,
      input.priority || "medium",
      input.dueDate
    ]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('work_order', ?, ?)",
    [result.insertId, `Auftrag "${input.title}" erstellt.`]
  );

  return getWorkOrderById(result.insertId);
}

async function getWorkOrderById(id) {
  const [[row]] = await pool.execute(
    `
      SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.priority,
        wo.status,
        wo.due_date AS dueDate,
        a.name AS assetName,
        a.id AS assetId
      FROM work_orders wo
      LEFT JOIN assets a ON a.id = wo.asset_id
      WHERE wo.id = ?
    `,
    [id]
  );
  return row;
}

async function updateWorkOrderStatus(id, status) {
  const allowedStatuses = new Set(["open", "planned", "in_progress", "done"]);
  if (!allowedStatuses.has(status)) {
    const error = new Error("Ungueltiger Status.");
    error.statusCode = 400;
    throw error;
  }

  await pool.execute(
    `
      UPDATE work_orders
      SET status = ?, completed_at = CASE WHEN ? = 'done' THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id = ?
    `,
    [status, status, id]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('work_order', ?, ?)",
    [id, `Auftragsstatus auf "${status}" gesetzt.`]
  );

  return getWorkOrderById(id);
}

module.exports = {
  pool,
  waitForDatabase,
  runMigrations,
  getDashboardSummary,
  listAssets,
  createAsset,
  listWorkOrders,
  createWorkOrder,
  updateWorkOrderStatus
};
