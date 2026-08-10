const crypto = require("crypto");
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
const allowedRoles = new Set(["admin", "manager", "technician", "viewer"]);
const regularSessionMs = 12 * 60 * 60 * 1000;
const rememberSessionMs = 60 * 24 * 60 * 60 * 1000;

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
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_number VARCHAR(24) NOT NULL,
      first_name VARCHAR(100) NULL,
      last_name VARCHAR(120) NULL,
      name VARCHAR(180) NOT NULL,
      contact_name VARCHAR(160) NULL,
      email VARCHAR(190) NULL,
      phone VARCHAR(80) NULL,
      street VARCHAR(160) NULL,
      house_number VARCHAR(40) NULL,
      postal_code VARCHAR(20) NULL,
      city VARCHAR(120) NULL,
      billing_address_differs BOOLEAN NOT NULL DEFAULT FALSE,
      billing_recipient VARCHAR(180) NULL,
      billing_street VARCHAR(160) NULL,
      billing_house_number VARCHAR(40) NULL,
      billing_postal_code VARCHAR(20) NULL,
      billing_city VARCHAR(120) NULL,
      billing_address VARCHAR(240) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_customers_number (customer_number),
      INDEX idx_customers_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100) NULL AFTER customer_number");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name VARCHAR(120) NULL AFTER first_name");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS street VARCHAR(160) NULL AFTER phone");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS house_number VARCHAR(40) NULL AFTER street");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) NULL AFTER house_number");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS city VARCHAR(120) NULL AFTER postal_code");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address_differs BOOLEAN NOT NULL DEFAULT FALSE AFTER city");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_recipient VARCHAR(180) NULL AFTER billing_address_differs");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_street VARCHAR(160) NULL AFTER billing_recipient");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_house_number VARCHAR(40) NULL AFTER billing_street");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_postal_code VARCHAR(20) NULL AFTER billing_house_number");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_city VARCHAR(120) NULL AFTER billing_postal_code");
  await pool.query(`
    UPDATE customers
    SET
      first_name = CASE
        WHEN first_name IS NULL OR first_name = '' THEN SUBSTRING_INDEX(name, ' ', 1)
        ELSE first_name
      END,
      last_name = CASE
        WHEN last_name IS NULL OR last_name = '' THEN COALESCE(NULLIF(TRIM(SUBSTRING(name, LENGTH(SUBSTRING_INDEX(name, ' ', 1)) + 1)), ''), name)
        ELSE last_name
      END,
      street = CASE
        WHEN (street IS NULL OR street = '') AND billing_address IS NOT NULL AND billing_address <> '' THEN billing_address
        ELSE street
      END
    WHERE name IS NOT NULL
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS assets (
      id INT AUTO_INCREMENT PRIMARY KEY,
      building_id INT NULL,
      apartment_id INT NULL,
      name VARCHAR(160) NOT NULL,
      asset_type VARCHAR(120) NOT NULL,
      location VARCHAR(160) NOT NULL,
      serial_number VARCHAR(120) NULL,
      criticality ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_assets_building (building_id),
      INDEX idx_assets_apartment (apartment_id),
      INDEX idx_assets_location (location),
      INDEX idx_assets_criticality (criticality)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS buildings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NULL,
      name VARCHAR(180) NOT NULL,
      address VARCHAR(220) NULL,
      building_type ENUM('private_house', 'multi_family', 'commercial', 'other') NOT NULL DEFAULT 'private_house',
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_buildings_customer (customer_id),
      INDEX idx_buildings_name (name),
      INDEX idx_buildings_type (building_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS apartments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      building_id INT NOT NULL,
      customer_id INT NULL,
      apartment_number VARCHAR(80) NOT NULL,
      name VARCHAR(160) NOT NULL,
      floor VARCHAR(80) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_apartments_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
      UNIQUE KEY uq_apartment_per_building (building_id, apartment_number),
      INDEX idx_apartments_customer (customer_id),
      INDEX idx_apartments_building (building_id),
      INDEX idx_apartments_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query("ALTER TABLE buildings ADD COLUMN IF NOT EXISTS customer_id INT NULL AFTER id");
  await pool.query("ALTER TABLE buildings ADD INDEX IF NOT EXISTS idx_buildings_customer (customer_id)");
  await pool.query("ALTER TABLE apartments ADD COLUMN IF NOT EXISTS customer_id INT NULL AFTER building_id");
  await pool.query("ALTER TABLE apartments ADD INDEX IF NOT EXISTS idx_apartments_customer (customer_id)");
  await pool.query("ALTER TABLE assets ADD COLUMN IF NOT EXISTS building_id INT NULL AFTER id");
  await pool.query("ALTER TABLE assets ADD COLUMN IF NOT EXISTS apartment_id INT NULL AFTER building_id");
  await pool.query("ALTER TABLE assets ADD INDEX IF NOT EXISTS idx_assets_building (building_id)");
  await pool.query("ALTER TABLE assets ADD INDEX IF NOT EXISTS idx_assets_apartment (apartment_id)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_number VARCHAR(24) NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(120) NOT NULL,
      email VARCHAR(190) NULL,
      phone VARCHAR(80) NULL,
      role_title VARCHAR(120) NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_employees_number (employee_number),
      INDEX idx_employees_name (last_name, first_name),
      INDEX idx_employees_active (active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS maintenance_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      asset_id INT NULL,
      target_type ENUM('asset', 'building', 'apartment') NULL,
      target_id INT NULL,
      employee_id INT NULL,
      title VARCHAR(180) NOT NULL,
      interval_days INT NOT NULL,
      last_done_on DATE NULL,
      next_due_on DATE NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_plans_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
      INDEX idx_plans_due (next_due_on),
      INDEX idx_plans_active (active),
      INDEX idx_plans_target (target_type, target_id),
      INDEX idx_plans_employee (employee_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query("ALTER TABLE maintenance_plans MODIFY COLUMN asset_id INT NULL");
  await pool.query("ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS target_type ENUM('asset', 'building', 'apartment') NULL AFTER asset_id");
  await pool.query("ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS target_id INT NULL AFTER target_type");
  await pool.query("ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS employee_id INT NULL AFTER target_id");
  await pool.query("ALTER TABLE maintenance_plans ADD INDEX IF NOT EXISTS idx_plans_target (target_type, target_id)");
  await pool.query("ALTER TABLE maintenance_plans ADD INDEX IF NOT EXISTS idx_plans_employee (employee_id)");
  await pool.query("UPDATE maintenance_plans SET target_type = 'asset', target_id = asset_id WHERE target_type IS NULL AND asset_id IS NOT NULL");

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
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(80) NOT NULL,
      display_name VARCHAR(160) NOT NULL,
      email VARCHAR(190) NULL,
      role ENUM('admin', 'manager', 'technician', 'viewer') NOT NULL DEFAULT 'technician',
      password_hash VARCHAR(160) NOT NULL,
      password_salt VARCHAR(80) NOT NULL,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_users_username (username),
      UNIQUE KEY uq_users_email (email),
      INDEX idx_users_role (role),
      INDEX idx_users_active (active),
      INDEX idx_users_system (is_system)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      session_hash CHAR(64) NOT NULL,
      remember_me BOOLEAN NOT NULL DEFAULT FALSE,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY uq_sessions_hash (session_hash),
      INDEX idx_sessions_user (user_id),
      INDEX idx_sessions_expires (expires_at)
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key VARCHAR(80) PRIMARY KEY,
      setting_value VARCHAR(255) NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.execute(
    "INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)",
    ["skip_weekends_for_maintenance", "0"]
  );

  await seedSystemAdmin();
  await cleanupExpiredSessions();
  await seedPropertyData();
  await seedInitialData();
  await normalizeGermanText();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(password, salt, 120000, 64, "sha512")
    .toString("hex");

  return {
    salt,
    hash
  };
}

function verifyPassword(password, storedHash, salt) {
  const candidateHash = hashPassword(password, salt).hash;
  const candidateBuffer = Buffer.from(candidateHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  return candidateBuffer.length === storedBuffer.length && crypto.timingSafeEqual(candidateBuffer, storedBuffer);
}

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function toPublicUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    email: row.email,
    role: row.role,
    active: Boolean(row.active),
    isSystem: Boolean(row.isSystem)
  };
}

function getInitialAdminConfig() {
  return {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || "change_this_admin_password",
    displayName: process.env.ADMIN_DISPLAY_NAME || "System Administrator",
    email: process.env.ADMIN_EMAIL || "admin@drmaintenance.local"
  };
}

async function seedSystemAdmin() {
  const [[existingAdmin]] = await pool.query("SELECT id FROM users WHERE is_system = TRUE LIMIT 1");
  if (existingAdmin) {
    return;
  }

  const admin = getInitialAdminConfig();
  const credentials = hashPassword(admin.password);

  const [result] = await pool.execute(
    `
      INSERT INTO users (username, display_name, email, role, password_hash, password_salt, active, is_system)
      VALUES (?, ?, ?, 'admin', ?, ?, TRUE, TRUE)
    `,
    [
      admin.username,
      admin.displayName,
      admin.email || null,
      credentials.hash,
      credentials.salt
    ]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('user', ?, ?)",
    [result.insertId, `Systemadministrator "${admin.username}" angelegt.`]
  );
}

async function seedInitialData() {
  const [[{ count }]] = await pool.query("SELECT COUNT(*) AS count FROM assets");
  if (count > 0) {
    return;
  }

  const [[privateHouse]] = await pool.query("SELECT id FROM buildings WHERE building_type = 'private_house' ORDER BY id ASC LIMIT 1");
  const [[firstApartment]] = await pool.query("SELECT id FROM apartments ORDER BY id ASC LIMIT 1");

  const [assetResult] = await pool.query(
    `
      INSERT INTO assets (building_id, apartment_id, name, asset_type, location, serial_number, criticality)
      VALUES
        (?, NULL, 'Klimaanlage Wellnessbereich', 'Klima', 'Wellnessbereich', 'KLIMA-001', 'high'),
        (NULL, ?, 'Dampfbad Steuerung', 'Wellness', 'Spa-Bereich', 'DAMPF-001', 'critical'),
        (?, NULL, 'PV Wechselrichter 1', 'Energie', 'Dachzentrale', 'PV-WR-001', 'medium'),
        (?, NULL, 'Wasserenthärter', 'Sanitär', 'Technikraum UG', 'SAN-WE-004', 'medium')
    `,
    [
      privateHouse?.id || null,
      firstApartment?.id || null,
      privateHouse?.id || null,
      privateHouse?.id || null
    ]
  );

  await pool.query(
    `
      INSERT INTO maintenance_plans (asset_id, target_type, target_id, title, interval_days, last_done_on, next_due_on)
      VALUES
        (?, 'asset', ?, 'Filter und Kondensatablauf prüfen', 90, CURDATE() - INTERVAL 70 DAY, CURDATE() + INTERVAL 20 DAY),
        (?, 'asset', ?, 'Dampfgenerator und Türdichtung prüfen', 180, CURDATE() - INTERVAL 150 DAY, CURDATE() + INTERVAL 30 DAY),
        (?, 'asset', ?, 'Ertragsdaten und Lüfter prüfen', 60, CURDATE() - INTERVAL 65 DAY, CURDATE() - INTERVAL 5 DAY),
        (?, 'asset', ?, 'Salzstand und Harzspülung prüfen', 45, CURDATE() - INTERVAL 35 DAY, CURDATE() + INTERVAL 10 DAY)
    `,
    [
      assetResult.insertId,
      assetResult.insertId,
      assetResult.insertId + 1,
      assetResult.insertId + 1,
      assetResult.insertId + 2,
      assetResult.insertId + 2,
      assetResult.insertId + 3,
      assetResult.insertId + 3
    ]
  );

  await pool.query(
    `
      INSERT INTO work_orders (asset_id, title, description, priority, status, due_date)
      VALUES
        (?, 'Dampfbad Wartung überfällig', 'Dampfgenerator entkalken und Temperaturfühler prüfen.', 'critical', 'open', CURDATE() - INTERVAL 5 DAY),
        (?, 'Wasserenthärter Service vorbereiten', 'Salzbestand auffüllen, Wasserhärte messen.', 'medium', 'planned', CURDATE() + INTERVAL 10 DAY),
        (?, 'Klimaanlage Sichtprüfung', 'Filtereinsatz und Kondensatablauf prüfen.', 'medium', 'in_progress', CURDATE() + INTERVAL 3 DAY)
    `,
    [
      assetResult.insertId + 1,
      assetResult.insertId + 3,
      assetResult.insertId
    ]
  );

  await pool.query(
    `
      INSERT INTO activity_log (entity_type, entity_id, message)
      VALUES
        ('system', 1, 'Startdaten für DR Maintenance angelegt.'),
        ('work_order', 1, 'Erster kritischer Auftrag erstellt.'),
        ('asset', ?, 'Dampfbad als kritisch markiert.')
    `,
    [assetResult.insertId + 1]
  );
}

async function seedPropertyData() {
  const [[{ count }]] = await pool.query("SELECT COUNT(*) AS count FROM buildings");
  if (count > 0) {
    return;
  }

  const [customerResult] = await pool.query(
    `
      INSERT INTO customers (
        customer_number,
        first_name,
        last_name,
        name,
        contact_name,
        email,
        phone,
        street,
        house_number,
        postal_code,
        city,
        billing_address_differs,
        notes
      )
      VALUES
        ('C0000154', 'Max', 'Mustermann', 'Max Mustermann', 'Max Mustermann', 'kunde@example.com', '+49 000 000000', 'Musterstraße', '12', '12345', 'Musterstadt', FALSE, 'Beispielkunde für den neuen Kundenworkflow.')
    `
  );

  const [buildingResult] = await pool.query(
    `
      INSERT INTO buildings (customer_id, name, address, building_type, notes)
      VALUES
        (?, 'DR Home Privathaus', 'Musterstraße 12', 'private_house', 'Einzelobjekt ohne Appartments.'),
        (?, 'Wohnhaus Gartenblick', 'Gartenweg 8', 'multi_family', 'Mehrparteienhaus mit Appartments.')
    `,
    [customerResult.insertId, customerResult.insertId]
  );

  const privateHouseId = buildingResult.insertId;
  const multiFamilyId = buildingResult.insertId + 1;

  await pool.execute(
    `
      INSERT INTO apartments (building_id, apartment_number, name, floor)
      VALUES
        (?, 'EG-01', 'Appartment EG links', 'EG'),
        (?, 'OG-02', 'Appartment OG rechts', 'OG')
    `,
    [multiFamilyId, multiFamilyId]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('building', ?, ?)",
    [privateHouseId, "Beispiel-Gebäude und Appartments angelegt."]
  );
}

async function normalizeGermanText() {
  const replacements = [
    ["Auftraege", "Aufträge"],
    ["Wartungsplaene", "Wartungspläne"],
    ["Plaene", "Pläne"],
    ["Gebaeudetechnik", "Gebäudetechnik"],
    ["Gebaeude", "Gebäude"],
    ["Sanitaer", "Sanitär"],
    ["pruefen", "prüfen"],
    ["Luefter", "Lüfter"],
    ["ueberfaellig", "überfällig"],
    ["auffuellen", "auffüllen"],
    ["Wasserhaerte", "Wasserhärte"],
    ["Sichtpruefung", "Sichtprüfung"],
    ["fuer", "für"],
    ["Aussenbereich", "Außenbereich"],
    ["Strasse", "Straße"],
    ["geloescht", "gelöscht"],
    ["veraendert", "verändert"],
    ["Faelligkeit", "Fälligkeit"],
    ["koennen", "können"],
    ["Anlagen", "Wartungsobjekte"],
    ["Anlage", "Wartungsobjekt"],
    ["ausgewaehlte", "ausgewählte"]
  ];

  const columns = [
    ["customers", "customer_number"],
    ["customers", "first_name"],
    ["customers", "last_name"],
    ["customers", "name"],
    ["customers", "contact_name"],
    ["customers", "street"],
    ["customers", "city"],
    ["customers", "billing_recipient"],
    ["customers", "billing_street"],
    ["customers", "billing_city"],
    ["customers", "billing_address"],
    ["customers", "notes"],
    ["assets", "name"],
    ["assets", "asset_type"],
    ["assets", "location"],
    ["employees", "first_name"],
    ["employees", "last_name"],
    ["employees", "role_title"],
    ["employees", "notes"],
    ["maintenance_plans", "title"],
    ["work_orders", "title"],
    ["work_orders", "description"],
    ["activity_log", "message"],
    ["buildings", "name"],
    ["buildings", "address"],
    ["buildings", "notes"],
    ["apartments", "name"],
    ["apartments", "floor"],
    ["apartments", "notes"]
  ];

  for (const [table, column] of columns) {
    for (const [from, to] of replacements) {
      await pool.execute(
        `UPDATE ${table} SET ${column} = REPLACE(${column}, ?, ?) WHERE ${column} LIKE ?`,
        [from, to, `%${from}%`]
      );
    }
  }
}

async function getDashboardSummary() {
  const settings = await getAppSettings();
  const [[summary]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM assets) AS assetCount,
      (SELECT COUNT(*) FROM maintenance_plans WHERE active = TRUE) AS activePlanCount,
      (SELECT COUNT(*) FROM work_orders WHERE status <> 'done') AS openWorkOrderCount,
      (SELECT COUNT(*) FROM work_orders WHERE status <> 'done' AND due_date < CURDATE()) AS overdueCount,
      (SELECT COUNT(*) FROM customers) AS customerCount,
      (SELECT COUNT(*) FROM employees WHERE active = TRUE) AS employeeCount,
      (SELECT COUNT(*) FROM users WHERE active = TRUE) AS activeUserCount
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
      DATE_FORMAT(mp.next_due_on, '%Y-%m-%d') AS nextDueOn,
      mp.target_type AS targetType,
      mp.target_id AS targetId,
      mp.employee_id AS employeeId,
      CONCAT(employee.first_name, ' ', employee.last_name) AS employeeName,
      COALESCE(
        CASE
          WHEN mp.target_type = 'asset' THEN target_asset.name
          WHEN mp.target_type = 'building' THEN target_building.name
          WHEN mp.target_type = 'apartment' THEN CONCAT(apartment_building.name, ' / ', apartment.name)
        END,
        legacy_asset.name
      ) AS targetName,
      COALESCE(
        CASE
          WHEN mp.target_type = 'asset' THEN target_asset.location
          WHEN mp.target_type = 'building' THEN target_building.address
          WHEN mp.target_type = 'apartment' THEN apartment_building.address
        END,
        legacy_asset.location
      ) AS targetSubtitle
    FROM maintenance_plans mp
    LEFT JOIN assets legacy_asset ON legacy_asset.id = mp.asset_id
    LEFT JOIN assets target_asset ON mp.target_type = 'asset' AND target_asset.id = mp.target_id
    LEFT JOIN buildings target_building ON mp.target_type = 'building' AND target_building.id = mp.target_id
    LEFT JOIN apartments apartment ON mp.target_type = 'apartment' AND apartment.id = mp.target_id
    LEFT JOIN buildings apartment_building ON apartment_building.id = apartment.building_id
    LEFT JOIN employees employee ON employee.id = mp.employee_id
    WHERE mp.active = TRUE
    ORDER BY mp.next_due_on ASC
  `);
  const visiblePlans = plans.map((plan) => {
    const nextDueOn = adjustDateKeyForWeekend(plan.nextDueOn, settings.skipWeekendsForMaintenance);
    return {
      ...plan,
      rawNextDueOn: plan.nextDueOn,
      nextDueOn,
      weekendAdjusted: nextDueOn !== plan.nextDueOn
    };
  });

  const [assets] = await pool.query(`
    SELECT
      a.id,
      a.building_id AS buildingId,
      a.apartment_id AS apartmentId,
      CASE
        WHEN a.apartment_id IS NOT NULL THEN 'apartment'
        WHEN a.building_id IS NOT NULL THEN 'building'
        ELSE NULL
      END AS assignmentType,
      COALESCE(a.apartment_id, a.building_id) AS assignmentId,
      CASE
        WHEN a.apartment_id IS NOT NULL THEN CONCAT(apartment_building.name, ' / ', asset_apartment.name)
        WHEN a.building_id IS NOT NULL THEN asset_building.name
        ELSE NULL
      END AS assignmentLabel,
      CASE
        WHEN a.apartment_id IS NOT NULL THEN apartment_building.address
        WHEN a.building_id IS NOT NULL THEN asset_building.address
        ELSE NULL
      END AS buildingAddress,
      COALESCE(apartment_customer.id, inherited_customer.id, building_customer.id) AS customerId,
      COALESCE(apartment_customer.customer_number, inherited_customer.customer_number, building_customer.customer_number) AS customerNumber,
      COALESCE(apartment_customer.name, inherited_customer.name, building_customer.name) AS customerName,
      COALESCE(apartment_customer.street, inherited_customer.street, building_customer.street) AS customerStreet,
      COALESCE(apartment_customer.house_number, inherited_customer.house_number, building_customer.house_number) AS customerHouseNumber,
      COALESCE(apartment_customer.postal_code, inherited_customer.postal_code, building_customer.postal_code) AS customerPostalCode,
      COALESCE(apartment_customer.city, inherited_customer.city, building_customer.city) AS customerCity,
      a.name,
      a.asset_type AS assetType,
      a.location,
      a.serial_number AS serialNumber,
      a.criticality
    FROM assets a
    LEFT JOIN buildings asset_building ON asset_building.id = a.building_id
    LEFT JOIN apartments asset_apartment ON asset_apartment.id = a.apartment_id
    LEFT JOIN buildings apartment_building ON apartment_building.id = asset_apartment.building_id
    LEFT JOIN customers building_customer ON building_customer.id = asset_building.customer_id
    LEFT JOIN customers apartment_customer ON apartment_customer.id = asset_apartment.customer_id
    LEFT JOIN customers inherited_customer ON inherited_customer.id = apartment_building.customer_id
    ORDER BY FIELD(a.criticality, 'critical', 'high', 'medium', 'low') ASC, a.name ASC
  `);

  const [activity] = await pool.query(`
    SELECT id, message, created_at AS createdAt
    FROM activity_log
    ORDER BY created_at DESC
    LIMIT 8
  `);

  const users = await listUsers();
  const customers = await listCustomers();
  const employees = await listEmployees();

  return {
    summary,
    workOrders,
    plans: visiblePlans,
    assets,
    activity,
    customers,
    employees,
    settings,
    users
  };
}

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assertValidRole(role) {
  if (!allowedRoles.has(role)) {
    throw createError("Ungültige Benutzerrolle.", 400);
  }
}

function normalizeUserInput(input) {
  return {
    username: input.username?.trim(),
    displayName: input.displayName?.trim(),
    email: input.email?.trim() || null,
    role: input.role || "technician",
    password: input.password
  };
}

function handleDuplicateUser(error) {
  if (error.code === "ER_DUP_ENTRY") {
    throw createError("Benutzername oder E-Mail ist bereits vergeben.", 409);
  }

  throw error;
}

function settingToBoolean(value) {
  return value === true || value === 1 || value === "1" || value === "true" || value === "on";
}

async function getAppSettings() {
  const [rows] = await pool.query("SELECT setting_key AS settingKey, setting_value AS settingValue FROM app_settings");
  const settings = Object.fromEntries(rows.map((row) => [row.settingKey, row.settingValue]));

  return {
    skipWeekendsForMaintenance: settingToBoolean(settings.skip_weekends_for_maintenance)
  };
}

async function updateAppSettings(input) {
  const skipWeekendsForMaintenance = parseBoolean(input.skipWeekendsForMaintenance);

  await pool.execute(
    `
      INSERT INTO app_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `,
    ["skip_weekends_for_maintenance", skipWeekendsForMaintenance ? "1" : "0"]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('settings', 0, ?)",
    ["Stammdaten aktualisiert."]
  );

  return getAppSettings();
}

async function authenticateUser(username, password) {
  const [[row]] = await pool.execute(
    `
      SELECT
        id,
        username,
        display_name AS displayName,
        email,
        role,
        active,
        is_system AS isSystem,
        password_hash AS passwordHash,
        password_salt AS passwordSalt
      FROM users
      WHERE username = ?
      LIMIT 1
    `,
    [username?.trim()]
  );

  if (!row || !row.active || !verifyPassword(password || "", row.passwordHash, row.passwordSalt)) {
    return null;
  }

  return toPublicUser(row);
}

async function createSession(userId, rememberMe) {
  const token = crypto.randomBytes(32).toString("hex");
  const sessionHash = hashSessionToken(token);
  const maxAgeMs = rememberMe ? rememberSessionMs : regularSessionMs;
  const expiresAt = new Date(Date.now() + maxAgeMs);

  await cleanupExpiredSessions();
  await pool.execute(
    `
      INSERT INTO user_sessions (user_id, session_hash, remember_me, expires_at)
      VALUES (?, ?, ?, ?)
    `,
    [userId, sessionHash, Boolean(rememberMe), expiresAt]
  );

  return {
    token,
    expiresAt,
    maxAgeSeconds: rememberMe ? Math.floor(maxAgeMs / 1000) : null
  };
}

async function getUserBySessionToken(token) {
  if (!token) {
    return null;
  }

  const sessionHash = hashSessionToken(token);
  const [[row]] = await pool.execute(
    `
      SELECT
        u.id,
        u.username,
        u.display_name AS displayName,
        u.email,
        u.role,
        u.active,
        u.is_system AS isSystem
      FROM user_sessions s
      INNER JOIN users u ON u.id = s.user_id
      WHERE s.session_hash = ?
        AND s.expires_at > NOW()
        AND u.active = TRUE
      LIMIT 1
    `,
    [sessionHash]
  );

  if (!row) {
    return null;
  }

  await pool.execute("UPDATE user_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE session_hash = ?", [sessionHash]);
  return toPublicUser(row);
}

async function deleteSession(token) {
  if (!token) {
    return;
  }

  await pool.execute("DELETE FROM user_sessions WHERE session_hash = ?", [hashSessionToken(token)]);
}

async function cleanupExpiredSessions() {
  await pool.execute("DELETE FROM user_sessions WHERE expires_at <= NOW()");
}

async function listUsers() {
  const [rows] = await pool.query(`
    SELECT
      id,
      username,
      display_name AS displayName,
      email,
      role,
      active,
      is_system AS isSystem,
      created_at AS createdAt
    FROM users
    ORDER BY is_system DESC, username ASC
  `);
  return rows;
}

async function createUser(input) {
  const user = normalizeUserInput(input);
  assertValidRole(user.role);

  if (!user.username || !user.displayName || !user.password) {
    throw createError("Benutzername, Anzeigename und Passwort sind Pflichtfelder.", 400);
  }

  const credentials = hashPassword(user.password);

  try {
    const [result] = await pool.execute(
      `
        INSERT INTO users (username, display_name, email, role, password_hash, password_salt)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        user.username,
        user.displayName,
        user.email,
        user.role,
        credentials.hash,
        credentials.salt
      ]
    );

    await pool.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('user', ?, ?)",
      [result.insertId, `Benutzer "${user.username}" angelegt.`]
    );

    return getUserById(result.insertId);
  } catch (error) {
    handleDuplicateUser(error);
  }
}

async function getUserById(id) {
  const [[row]] = await pool.execute(
    `
      SELECT
        id,
        username,
        display_name AS displayName,
        email,
        role,
        active,
        is_system AS isSystem,
        created_at AS createdAt
      FROM users
      WHERE id = ?
    `,
    [id]
  );
  return row;
}

async function updateUser(id, input) {
  const existingUser = await getUserById(id);
  if (!existingUser) {
    throw createError("Benutzer nicht gefunden.", 404);
  }

  if (existingUser.isSystem) {
    throw createError("Der initiale Adminbenutzer kann nicht verändert werden.", 403);
  }

  const updates = [];
  const params = [];

  if (input.displayName !== undefined) {
    updates.push("display_name = ?");
    params.push(input.displayName.trim());
  }

  if (input.email !== undefined) {
    updates.push("email = ?");
    params.push(input.email.trim() || null);
  }

  if (input.role !== undefined) {
    assertValidRole(input.role);
    updates.push("role = ?");
    params.push(input.role);
  }

  if (input.active !== undefined) {
    updates.push("active = ?");
    params.push(Boolean(input.active));
  }

  if (input.password) {
    const credentials = hashPassword(input.password);
    updates.push("password_hash = ?", "password_salt = ?");
    params.push(credentials.hash, credentials.salt);
  }

  if (updates.length === 0) {
    return existingUser;
  }

  params.push(id);

  try {
    await pool.execute(
      `
        UPDATE users
        SET ${updates.join(", ")}
        WHERE id = ?
      `,
      params
    );

    await pool.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('user', ?, ?)",
      [id, `Benutzer "${existingUser.username}" aktualisiert.`]
    );

    return getUserById(id);
  } catch (error) {
    handleDuplicateUser(error);
  }
}

async function deleteUser(id) {
  const existingUser = await getUserById(id);
  if (!existingUser) {
    throw createError("Benutzer nicht gefunden.", 404);
  }

  if (existingUser.isSystem) {
    throw createError("Der initiale Adminbenutzer kann nicht gelöscht werden.", 403);
  }

  await pool.execute("DELETE FROM users WHERE id = ?", [id]);
  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('user', ?, ?)",
    [id, `Benutzer "${existingUser.username}" gelöscht.`]
  );

  return { deleted: true };
}

async function listEmployees() {
  const [rows] = await pool.query(`
    SELECT
      id,
      employee_number AS employeeNumber,
      first_name AS firstName,
      last_name AS lastName,
      CONCAT(first_name, ' ', last_name) AS name,
      email,
      phone,
      role_title AS roleTitle,
      active,
      notes,
      created_at AS createdAt
    FROM employees
    ORDER BY active DESC, last_name ASC, first_name ASC
  `);
  return rows;
}

function normalizeEmployeeInput(input, existingEmployee = null) {
  const firstName = normalizeText(input.firstName) || existingEmployee?.firstName;
  const lastName = normalizeText(input.lastName) || existingEmployee?.lastName;

  if (!firstName || !lastName) {
    throw createError("Vorname und Name sind Pflichtfelder.", 400);
  }

  return {
    employeeNumber: input.employeeNumber === undefined ? existingEmployee?.employeeNumber || null : normalizeText(input.employeeNumber),
    firstName,
    lastName,
    email: input.email === undefined ? existingEmployee?.email || null : normalizeText(input.email),
    phone: input.phone === undefined ? existingEmployee?.phone || null : normalizeText(input.phone),
    roleTitle: input.roleTitle === undefined ? existingEmployee?.roleTitle || null : normalizeText(input.roleTitle),
    active: input.active === undefined ? Boolean(Number(existingEmployee?.active ?? 1)) : parseBoolean(input.active),
    notes: input.notes === undefined ? existingEmployee?.notes || null : normalizeText(input.notes)
  };
}

function handleDuplicateEmployee(error) {
  if (error.code === "ER_DUP_ENTRY") {
    throw createError("Diese Mitarbeiternummer ist bereits vergeben.", 409);
  }

  throw error;
}

async function getEmployeeById(id) {
  const [[row]] = await pool.execute(
    `
      SELECT
        id,
        employee_number AS employeeNumber,
        first_name AS firstName,
        last_name AS lastName,
        CONCAT(first_name, ' ', last_name) AS name,
        email,
        phone,
        role_title AS roleTitle,
        active,
        notes,
        created_at AS createdAt
      FROM employees
      WHERE id = ?
    `,
    [id]
  );
  return row;
}

async function assertEmployeeExists(employeeId) {
  if (!employeeId) {
    return;
  }

  const [[employee]] = await pool.execute("SELECT id FROM employees WHERE id = ?", [employeeId]);
  if (!employee) {
    throw createError("Der ausgewählte Mitarbeiter existiert nicht.", 400);
  }
}

async function createEmployee(input) {
  const employee = normalizeEmployeeInput(input);

  try {
    const [result] = await pool.execute(
      `
        INSERT INTO employees (
          employee_number,
          first_name,
          last_name,
          email,
          phone,
          role_title,
          active,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        employee.employeeNumber,
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.phone,
        employee.roleTitle,
        employee.active,
        employee.notes
      ]
    );

    await pool.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('employee', ?, ?)",
      [result.insertId, `Mitarbeiter "${employee.firstName} ${employee.lastName}" angelegt.`]
    );

    return getEmployeeById(result.insertId);
  } catch (error) {
    handleDuplicateEmployee(error);
  }
}

async function updateEmployee(id, input) {
  const existingEmployee = await getEmployeeById(id);
  if (!existingEmployee) {
    throw createError("Mitarbeiter nicht gefunden.", 404);
  }

  const employee = normalizeEmployeeInput(input, existingEmployee);

  try {
    await pool.execute(
      `
        UPDATE employees
        SET
          employee_number = ?,
          first_name = ?,
          last_name = ?,
          email = ?,
          phone = ?,
          role_title = ?,
          active = ?,
          notes = ?
        WHERE id = ?
      `,
      [
        employee.employeeNumber,
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.phone,
        employee.roleTitle,
        employee.active,
        employee.notes,
        id
      ]
    );

    await pool.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('employee', ?, ?)",
      [id, `Mitarbeiter "${employee.firstName} ${employee.lastName}" aktualisiert.`]
    );

    return getEmployeeById(id);
  } catch (error) {
    handleDuplicateEmployee(error);
  }
}

async function deleteEmployee(id) {
  const existingEmployee = await getEmployeeById(id);
  if (!existingEmployee) {
    throw createError("Mitarbeiter nicht gefunden.", 404);
  }

  await pool.execute("UPDATE maintenance_plans SET employee_id = NULL WHERE employee_id = ?", [id]);
  await pool.execute("DELETE FROM employees WHERE id = ?", [id]);
  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('employee', ?, ?)",
    [id, `Mitarbeiter "${existingEmployee.name}" gelöscht.`]
  );

  return { deleted: true };
}

async function listCustomers() {
  const [rows] = await pool.query(`
    SELECT
      id,
      customer_number AS customerNumber,
      COALESCE(NULLIF(first_name, ''), SUBSTRING_INDEX(name, ' ', 1)) AS firstName,
      COALESCE(NULLIF(last_name, ''), NULLIF(TRIM(SUBSTRING(name, LENGTH(SUBSTRING_INDEX(name, ' ', 1)) + 1)), ''), name) AS lastName,
      name,
      contact_name AS contactName,
      email,
      phone,
      street,
      house_number AS houseNumber,
      postal_code AS postalCode,
      city,
      billing_address_differs AS billingAddressDiffers,
      billing_recipient AS billingRecipient,
      billing_street AS billingStreet,
      billing_house_number AS billingHouseNumber,
      billing_postal_code AS billingPostalCode,
      billing_city AS billingCity,
      billing_address AS billingAddress,
      notes
    FROM customers
    ORDER BY customer_number ASC, name ASC
  `);
  return rows;
}

async function generateCustomerNumber() {
  const [[row]] = await pool.query(`
    SELECT MAX(CAST(SUBSTRING(customer_number, 2) AS UNSIGNED)) AS maxNumber
    FROM customers
    WHERE customer_number REGEXP '^C[0-9]+$'
  `);
  const nextNumber = Math.max(Number(row.maxNumber || 153) + 1, 154);
  return `C${String(nextNumber).padStart(7, "0")}`;
}

function normalizeText(value) {
  return value?.trim() || null;
}

function parseBoolean(value) {
  return value === true || value === 1 || value === "1" || value === "true" || value === "on";
}

function splitLegacyCustomerName(value) {
  const name = normalizeText(value);
  if (!name) {
    return {
      firstName: null,
      lastName: null
    };
  }

  const [firstName, ...rest] = name.split(/\s+/);
  return {
    firstName,
    lastName: rest.join(" ") || name
  };
}

function combineName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(" ");
}

function combineAddress(street, houseNumber, postalCode, city) {
  const streetLine = [street, houseNumber].filter(Boolean).join(" ");
  const cityLine = [postalCode, city].filter(Boolean).join(" ");
  return [streetLine, cityLine].filter(Boolean).join(", ") || null;
}

async function normalizeCustomerInput(input, existingCustomer = null) {
  const legacyName = normalizeText(input.name);
  const parsedLegacyInput = splitLegacyCustomerName(legacyName);
  const parsedExisting = splitLegacyCustomerName(existingCustomer?.name);
  const firstName = normalizeText(input.firstName)
    || parsedLegacyInput.firstName
    || existingCustomer?.firstName
    || parsedExisting.firstName;
  const lastName = normalizeText(input.lastName)
    || parsedLegacyInput.lastName
    || existingCustomer?.lastName
    || parsedExisting.lastName;

  if (!firstName || !lastName) {
    throw createError("Vorname und Name sind Pflichtfelder.", 400);
  }

  const street = normalizeText(input.street) || null;
  const houseNumber = normalizeText(input.houseNumber) || null;
  const postalCode = normalizeText(input.postalCode) || null;
  const city = normalizeText(input.city) || null;
  const billingAddressDiffers = parseBoolean(input.billingAddressDiffers);
  const billingRecipient = billingAddressDiffers ? normalizeText(input.billingRecipient) : null;
  const billingStreet = billingAddressDiffers ? normalizeText(input.billingStreet) : null;
  const billingHouseNumber = billingAddressDiffers ? normalizeText(input.billingHouseNumber) : null;
  const billingPostalCode = billingAddressDiffers ? normalizeText(input.billingPostalCode) : null;
  const billingCity = billingAddressDiffers ? normalizeText(input.billingCity) : null;

  if (billingAddressDiffers && (!billingRecipient || !billingStreet || !billingHouseNumber || !billingPostalCode || !billingCity)) {
    throw createError("Bei abweichender Rechnungsadresse sind Empfänger, Straße, Hausnummer, PLZ und Ort Pflichtfelder.", 400);
  }

  return {
    customerNumber: input.customerNumber?.trim() || existingCustomer?.customerNumber || await generateCustomerNumber(),
    firstName,
    lastName,
    name: combineName(firstName, lastName),
    contactName: normalizeText(input.contactName),
    email: normalizeText(input.email),
    phone: normalizeText(input.phone),
    street,
    houseNumber,
    postalCode,
    city,
    billingAddressDiffers,
    billingRecipient,
    billingStreet,
    billingHouseNumber,
    billingPostalCode,
    billingCity,
    billingAddress: billingAddressDiffers
      ? combineAddress(billingStreet, billingHouseNumber, billingPostalCode, billingCity)
      : combineAddress(street, houseNumber, postalCode, city),
    notes: normalizeText(input.notes)
  };
}

function handleDuplicateCustomer(error) {
  if (error.code === "ER_DUP_ENTRY") {
    throw createError("Diese Kundennummer ist bereits vergeben.", 409);
  }

  throw error;
}

async function assertCustomerExists(customerId) {
  if (!customerId) {
    return;
  }

  const [[customer]] = await pool.execute("SELECT id FROM customers WHERE id = ?", [customerId]);
  if (!customer) {
    throw createError("Der ausgewählte Kunde existiert nicht.", 400);
  }
}

async function createCustomer(input) {
  const customer = await normalizeCustomerInput(input);

  try {
    const [result] = await pool.execute(
      `
        INSERT INTO customers (
          customer_number,
          first_name,
          last_name,
          name,
          contact_name,
          email,
          phone,
          street,
          house_number,
          postal_code,
          city,
          billing_address_differs,
          billing_recipient,
          billing_street,
          billing_house_number,
          billing_postal_code,
          billing_city,
          billing_address,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        customer.customerNumber,
        customer.firstName,
        customer.lastName,
        customer.name,
        customer.contactName,
        customer.email,
        customer.phone,
        customer.street,
        customer.houseNumber,
        customer.postalCode,
        customer.city,
        customer.billingAddressDiffers,
        customer.billingRecipient,
        customer.billingStreet,
        customer.billingHouseNumber,
        customer.billingPostalCode,
        customer.billingCity,
        customer.billingAddress,
        customer.notes
      ]
    );

    await pool.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('customer', ?, ?)",
      [result.insertId, `Kunde "${customer.customerNumber} ${customer.name}" angelegt.`]
    );

    return getCustomerById(result.insertId);
  } catch (error) {
    handleDuplicateCustomer(error);
  }
}

async function getCustomerById(id) {
  const [[row]] = await pool.execute(
    `
      SELECT
        id,
        customer_number AS customerNumber,
        COALESCE(NULLIF(first_name, ''), SUBSTRING_INDEX(name, ' ', 1)) AS firstName,
        COALESCE(NULLIF(last_name, ''), NULLIF(TRIM(SUBSTRING(name, LENGTH(SUBSTRING_INDEX(name, ' ', 1)) + 1)), ''), name) AS lastName,
        name,
        contact_name AS contactName,
        email,
        phone,
        street,
        house_number AS houseNumber,
        postal_code AS postalCode,
        city,
        billing_address_differs AS billingAddressDiffers,
        billing_recipient AS billingRecipient,
        billing_street AS billingStreet,
        billing_house_number AS billingHouseNumber,
        billing_postal_code AS billingPostalCode,
        billing_city AS billingCity,
        billing_address AS billingAddress,
        notes
      FROM customers
      WHERE id = ?
    `,
    [id]
  );
  return row;
}

async function updateCustomer(id, input) {
  const existingCustomer = await getCustomerById(id);
  if (!existingCustomer) {
    throw createError("Kunde nicht gefunden.", 404);
  }

  const customer = await normalizeCustomerInput(input, existingCustomer);

  try {
    await pool.execute(
      `
        UPDATE customers
        SET
          customer_number = ?,
          first_name = ?,
          last_name = ?,
          name = ?,
          contact_name = ?,
          email = ?,
          phone = ?,
          street = ?,
          house_number = ?,
          postal_code = ?,
          city = ?,
          billing_address_differs = ?,
          billing_recipient = ?,
          billing_street = ?,
          billing_house_number = ?,
          billing_postal_code = ?,
          billing_city = ?,
          billing_address = ?,
          notes = ?
        WHERE id = ?
      `,
      [
        customer.customerNumber,
        customer.firstName,
        customer.lastName,
        customer.name,
        customer.contactName,
        customer.email,
        customer.phone,
        customer.street,
        customer.houseNumber,
        customer.postalCode,
        customer.city,
        customer.billingAddressDiffers,
        customer.billingRecipient,
        customer.billingStreet,
        customer.billingHouseNumber,
        customer.billingPostalCode,
        customer.billingCity,
        customer.billingAddress,
        customer.notes,
        id
      ]
    );

    await pool.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('customer', ?, ?)",
      [id, `Kunde "${customer.customerNumber} ${customer.name}" aktualisiert.`]
    );

    return getCustomerById(id);
  } catch (error) {
    handleDuplicateCustomer(error);
  }
}

async function deleteCustomer(id) {
  const existingCustomer = await getCustomerById(id);
  if (!existingCustomer) {
    throw createError("Kunde nicht gefunden.", 404);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("UPDATE buildings SET customer_id = NULL WHERE customer_id = ?", [id]);
    await connection.execute("UPDATE apartments SET customer_id = NULL WHERE customer_id = ?", [id]);
    await connection.execute("DELETE FROM customers WHERE id = ?", [id]);
    await connection.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('customer', ?, ?)",
      [id, `Kunde "${existingCustomer.customerNumber} ${existingCustomer.name}" gelöscht.`]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { deleted: true };
}

async function listProperties() {
  const [buildings] = await pool.query(`
    SELECT
      b.id,
      b.customer_id AS customerId,
      c.customer_number AS customerNumber,
      c.name AS customerName,
      b.name,
      b.address,
      b.building_type AS buildingType,
      b.notes,
      COUNT(a.id) AS apartmentCount
    FROM buildings b
    LEFT JOIN customers c ON c.id = b.customer_id
    LEFT JOIN apartments a ON a.building_id = b.id
    GROUP BY b.id, b.customer_id, c.customer_number, c.name, b.name, b.address, b.building_type, b.notes
    ORDER BY b.name ASC
  `);

  const [apartments] = await pool.query(`
    SELECT
      id,
      building_id AS buildingId,
      customer_id AS customerId,
      customerNumber,
      customerName,
      apartment_number AS apartmentNumber,
      name,
      floor,
      notes
    FROM (
      SELECT
        a.id,
        a.building_id,
        a.customer_id,
        COALESCE(apartment_customer.customer_number, building_customer.customer_number) AS customerNumber,
        COALESCE(apartment_customer.name, building_customer.name) AS customerName,
        a.apartment_number,
        a.name,
        a.floor,
        a.notes
      FROM apartments a
      INNER JOIN buildings b ON b.id = a.building_id
      LEFT JOIN customers apartment_customer ON apartment_customer.id = a.customer_id
      LEFT JOIN customers building_customer ON building_customer.id = b.customer_id
    ) apartment_rows
    ORDER BY apartment_number ASC, name ASC
  `);

  const apartmentsByBuilding = apartments.reduce((groups, apartment) => {
    const buildingApartments = groups.get(apartment.buildingId) || [];
    buildingApartments.push(apartment);
    groups.set(apartment.buildingId, buildingApartments);
    return groups;
  }, new Map());

  return buildings.map((building) => ({
    ...building,
    apartments: apartmentsByBuilding.get(building.id) || []
  }));
}

function normalizeBuildingInput(input) {
  const name = input.name?.trim();
  if (!name) {
    throw createError("Gebäudename ist ein Pflichtfeld.", 400);
  }

  const buildingType = input.buildingType || "private_house";
  const allowedTypes = new Set(["private_house", "multi_family", "commercial", "other"]);
  if (!allowedTypes.has(buildingType)) {
    throw createError("Ungültiger Gebäudetyp.", 400);
  }

  return {
    customerId: Number(input.customerId) || null,
    name,
    address: input.address?.trim() || null,
    buildingType,
    notes: input.notes?.trim() || null
  };
}

async function createBuilding(input) {
  const building = normalizeBuildingInput(input);
  await assertCustomerExists(building.customerId);

  const [result] = await pool.execute(
    `
      INSERT INTO buildings (customer_id, name, address, building_type, notes)
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      building.customerId,
      building.name,
      building.address,
      building.buildingType,
      building.notes
    ]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('building', ?, ?)",
    [result.insertId, `Gebäude "${building.name}" angelegt.`]
  );

  return getBuildingById(result.insertId);
}

async function getBuildingById(id) {
  const [[building]] = await pool.execute(
    `
      SELECT
        id,
        customer_id AS customerId,
        name,
        address,
        building_type AS buildingType,
        notes
      FROM buildings
      WHERE id = ?
    `,
    [id]
  );
  return building;
}

async function updateBuilding(id, input) {
  const existingBuilding = await getBuildingById(id);
  if (!existingBuilding) {
    throw createError("Gebäude nicht gefunden.", 404);
  }

  const building = normalizeBuildingInput(input);
  await assertCustomerExists(building.customerId);

  await pool.execute(
    `
      UPDATE buildings
      SET customer_id = ?, name = ?, address = ?, building_type = ?, notes = ?
      WHERE id = ?
    `,
    [
      building.customerId,
      building.name,
      building.address,
      building.buildingType,
      building.notes,
      id
    ]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('building', ?, ?)",
    [id, `Gebäude "${building.name}" aktualisiert.`]
  );

  return getBuildingById(id);
}

async function deleteBuilding(id) {
  const existingBuilding = await getBuildingById(id);
  if (!existingBuilding) {
    throw createError("Gebäude nicht gefunden.", 404);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `
        DELETE mp
        FROM maintenance_plans mp
        INNER JOIN apartments a ON a.id = mp.target_id
        WHERE mp.target_type = 'apartment'
          AND a.building_id = ?
      `,
      [id]
    );
    await connection.execute(
      "DELETE FROM maintenance_plans WHERE target_type = 'building' AND target_id = ?",
      [id]
    );
    await connection.execute(
      `
        UPDATE assets a
        LEFT JOIN apartments ap ON ap.id = a.apartment_id
        SET
          a.building_id = CASE WHEN a.building_id = ? THEN NULL ELSE a.building_id END,
          a.apartment_id = CASE WHEN ap.building_id = ? THEN NULL ELSE a.apartment_id END
        WHERE a.building_id = ?
          OR ap.building_id = ?
      `,
      [id, id, id, id]
    );
    await connection.execute("DELETE FROM buildings WHERE id = ?", [id]);
    await connection.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('building', ?, ?)",
      [id, `Gebäude "${existingBuilding.name}" gelöscht.`]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { deleted: true };
}

function normalizeApartmentInput(input) {
  const buildingId = Number(input.buildingId);
  const apartmentNumber = input.apartmentNumber?.trim();
  const name = input.name?.trim();

  if (!buildingId || !apartmentNumber || !name) {
    throw createError("Gebäude, Appartment-Nummer und Name sind Pflichtfelder.", 400);
  }

  return {
    buildingId,
    customerId: Number(input.customerId) || null,
    apartmentNumber,
    name,
    floor: input.floor?.trim() || null,
    notes: input.notes?.trim() || null
  };
}

function handleApartmentWriteError(error) {
  if (error.code === "ER_DUP_ENTRY") {
    throw createError("Dieses Appartment existiert in dem Gebäude bereits.", 409);
  }

  if (error.code === "ER_NO_REFERENCED_ROW_2") {
    throw createError("Das ausgewählte Gebäude existiert nicht.", 400);
  }

  throw error;
}

async function createApartment(input) {
  const apartment = normalizeApartmentInput(input);
  await assertCustomerExists(apartment.customerId);

  try {
    const [result] = await pool.execute(
      `
        INSERT INTO apartments (building_id, customer_id, apartment_number, name, floor, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        apartment.buildingId,
        apartment.customerId,
        apartment.apartmentNumber,
        apartment.name,
        apartment.floor,
        apartment.notes
      ]
    );

    await pool.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('apartment', ?, ?)",
      [result.insertId, `Appartment "${apartment.name}" angelegt.`]
    );

    return getApartmentById(result.insertId);
  } catch (error) {
    handleApartmentWriteError(error);
  }
}

async function getApartmentById(id) {
  const [[apartment]] = await pool.execute(
    `
      SELECT
        id,
        building_id AS buildingId,
        customer_id AS customerId,
        apartment_number AS apartmentNumber,
        name,
        floor,
        notes
      FROM apartments
      WHERE id = ?
    `,
    [id]
  );
  return apartment;
}

async function updateApartment(id, input) {
  const existingApartment = await getApartmentById(id);
  if (!existingApartment) {
    throw createError("Appartment nicht gefunden.", 404);
  }

  const apartment = normalizeApartmentInput(input);
  await assertCustomerExists(apartment.customerId);

  try {
    await pool.execute(
      `
        UPDATE apartments
        SET building_id = ?, customer_id = ?, apartment_number = ?, name = ?, floor = ?, notes = ?
        WHERE id = ?
      `,
      [
        apartment.buildingId,
        apartment.customerId,
        apartment.apartmentNumber,
        apartment.name,
        apartment.floor,
        apartment.notes,
        id
      ]
    );

    await pool.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('apartment', ?, ?)",
      [id, `Appartment "${apartment.name}" aktualisiert.`]
    );

    return getApartmentById(id);
  } catch (error) {
    handleApartmentWriteError(error);
  }
}

async function deleteApartment(id) {
  const existingApartment = await getApartmentById(id);
  if (!existingApartment) {
    throw createError("Appartment nicht gefunden.", 404);
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      "DELETE FROM maintenance_plans WHERE target_type = 'apartment' AND target_id = ?",
      [id]
    );
    await connection.execute("UPDATE assets SET apartment_id = NULL WHERE apartment_id = ?", [id]);
    await connection.execute("DELETE FROM apartments WHERE id = ?", [id]);
    await connection.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('apartment', ?, ?)",
      [id, `Appartment "${existingApartment.name}" gelöscht.`]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { deleted: true };
}

async function listMaintenanceTargets() {
  const [rows] = await pool.query(`
    SELECT targetType, targetId, label, subtitle
    FROM (
      SELECT
        'asset' AS targetType,
        a.id AS targetId,
        a.name AS label,
        CONCAT_WS(
          ' - ',
          'Wartungsobjekt',
          a.asset_type,
          CASE
            WHEN a.apartment_id IS NOT NULL THEN CONCAT(apartment_building.name, ' / ', asset_apartment.name)
            WHEN a.building_id IS NOT NULL THEN asset_building.name
            ELSE a.location
          END,
          COALESCE(apartment_customer.customer_number, inherited_customer.customer_number, building_customer.customer_number)
        ) AS subtitle
      FROM assets a
      LEFT JOIN buildings asset_building ON asset_building.id = a.building_id
      LEFT JOIN apartments asset_apartment ON asset_apartment.id = a.apartment_id
      LEFT JOIN buildings apartment_building ON apartment_building.id = asset_apartment.building_id
      LEFT JOIN customers building_customer ON building_customer.id = asset_building.customer_id
      LEFT JOIN customers apartment_customer ON apartment_customer.id = asset_apartment.customer_id
      LEFT JOIN customers inherited_customer ON inherited_customer.id = apartment_building.customer_id

      UNION ALL

      SELECT
        'apartment' AS targetType,
        ap.id AS targetId,
        CONCAT(b.name, ' / ', ap.name) AS label,
        CONCAT_WS(
          ' - ',
          'Appartment',
          COALESCE(apartment_customer.customer_number, building_customer.customer_number),
          b.address
        ) AS subtitle
      FROM apartments ap
      INNER JOIN buildings b ON b.id = ap.building_id
      LEFT JOIN customers apartment_customer ON apartment_customer.id = ap.customer_id
      LEFT JOIN customers building_customer ON building_customer.id = b.customer_id

      UNION ALL

      SELECT
        'building' AS targetType,
        b.id AS targetId,
        b.name AS label,
        CONCAT_WS(
          ' - ',
          'Gebäude ohne Appartments',
          c.customer_number,
          b.address
        ) AS subtitle
      FROM buildings b
      LEFT JOIN customers c ON c.id = b.customer_id
      LEFT JOIN apartments ap ON ap.building_id = b.id
      WHERE ap.id IS NULL
    ) targets
    ORDER BY label ASC, subtitle ASC
  `);

  return rows;
}

async function assertMaintenanceTarget(targetType, targetId) {
  if (!["asset", "building", "apartment"].includes(targetType)) {
    throw createError("Ungültiges Wartungsziel.", 400);
  }

  if (targetType === "asset") {
    const [[asset]] = await pool.execute("SELECT id FROM assets WHERE id = ?", [targetId]);
    if (!asset) {
      throw createError("Das ausgewählte Objekt existiert nicht.", 400);
    }
    return;
  }

  if (targetType === "apartment") {
    const [[apartment]] = await pool.execute("SELECT id FROM apartments WHERE id = ?", [targetId]);
    if (!apartment) {
      throw createError("Das ausgewählte Appartment existiert nicht.", 400);
    }
    return;
  }

  const [[building]] = await pool.execute(
    `
      SELECT
        b.id,
        (SELECT COUNT(*) FROM apartments a WHERE a.building_id = b.id) AS apartmentCount
      FROM buildings b
      WHERE b.id = ?
    `,
    [targetId]
  );

  if (!building) {
    throw createError("Das ausgewählte Gebäude existiert nicht.", 400);
  }

  if (building.apartmentCount > 0) {
    throw createError("Gebäude mit Appartments können nicht direkt als Wartungsziel genutzt werden.", 400);
  }
}

async function createMaintenancePlan(input) {
  const title = input.title?.trim();
  const targetType = input.targetType;
  const targetId = Number(input.targetId);
  const parsedEmployeeId = Number(input.employeeId);
  const employeeId = Number.isFinite(parsedEmployeeId) && parsedEmployeeId > 0 ? parsedEmployeeId : null;
  const intervalDays = Number(input.intervalDays);

  if (!title || !targetType || !targetId || !intervalDays || !input.nextDueOn) {
    throw createError("Titel, Objekt, Intervall und Fälligkeit sind Pflichtfelder.", 400);
  }

  if (intervalDays < 1) {
    throw createError("Das Intervall muss mindestens 1 Tag betragen.", 400);
  }

  await assertMaintenanceTarget(targetType, targetId);
  await assertEmployeeExists(employeeId);

  const settings = await getAppSettings();
  const nextDueOn = adjustDateKeyForWeekend(input.nextDueOn, settings.skipWeekendsForMaintenance);
  const assetId = targetType === "asset" ? targetId : null;
  const [result] = await pool.execute(
    `
      INSERT INTO maintenance_plans (asset_id, target_type, target_id, employee_id, title, interval_days, last_done_on, next_due_on)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      assetId,
      targetType,
      targetId,
      employeeId,
      title,
      intervalDays,
      input.lastDoneOn || null,
      nextDueOn
    ]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('maintenance_plan', ?, ?)",
    [result.insertId, `Wartungsplan "${title}" angelegt.`]
  );

  return getMaintenancePlanById(result.insertId);
}

async function deleteMaintenancePlan(id) {
  const existingPlan = await getMaintenancePlanById(id);
  if (!existingPlan) {
    throw createError("Wartungsplan nicht gefunden.", 404);
  }

  await pool.execute("DELETE FROM maintenance_plans WHERE id = ?", [id]);
  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('maintenance_plan', ?, ?)",
    [id, `Wartungsplan "${existingPlan.title}" gelöscht.`]
  );

  return { deleted: true };
}

async function getMaintenancePlanById(id) {
  const [[plan]] = await pool.execute(
    `
      SELECT
        mp.id,
        mp.title,
        mp.interval_days AS intervalDays,
        DATE_FORMAT(mp.next_due_on, '%Y-%m-%d') AS nextDueOn,
        mp.target_type AS targetType,
        mp.target_id AS targetId,
        mp.employee_id AS employeeId,
        CONCAT(employee.first_name, ' ', employee.last_name) AS employeeName,
        COALESCE(
          CASE
            WHEN mp.target_type = 'asset' THEN target_asset.name
            WHEN mp.target_type = 'building' THEN target_building.name
            WHEN mp.target_type = 'apartment' THEN CONCAT(apartment_building.name, ' / ', apartment.name)
          END,
          legacy_asset.name
        ) AS targetName
      FROM maintenance_plans mp
      LEFT JOIN assets legacy_asset ON legacy_asset.id = mp.asset_id
      LEFT JOIN assets target_asset ON mp.target_type = 'asset' AND target_asset.id = mp.target_id
      LEFT JOIN buildings target_building ON mp.target_type = 'building' AND target_building.id = mp.target_id
      LEFT JOIN apartments apartment ON mp.target_type = 'apartment' AND apartment.id = mp.target_id
      LEFT JOIN buildings apartment_building ON apartment_building.id = apartment.building_id
      LEFT JOIN employees employee ON employee.id = mp.employee_id
      WHERE mp.id = ?
    `,
    [id]
  );
  return plan;
}

function parseDateKey(value) {
  const [year, month, day] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function adjustDateForWeekend(date, skipWeekends) {
  if (!skipWeekends) {
    return date;
  }

  const day = date.getUTCDay();
  if (day === 6) {
    return addDays(date, 2);
  }

  if (day === 0) {
    return addDays(date, 1);
  }

  return date;
}

function adjustDateKeyForWeekend(value, skipWeekends) {
  return formatDateKey(adjustDateForWeekend(parseDateKey(value), skipWeekends));
}

function daysBetween(start, end) {
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

async function getCalendarEvents(startDate, endDate) {
  const settings = await getAppSettings();
  const [rows] = await pool.execute(
    `
      SELECT
        mp.id,
        'maintenance' AS type,
        mp.title,
        DATE_FORMAT(mp.next_due_on, '%Y-%m-%d') AS dueDate,
        mp.interval_days AS intervalDays,
        mp.target_type AS targetType,
        mp.target_id AS targetId,
        mp.employee_id AS employeeId,
        CONCAT(employee.first_name, ' ', employee.last_name) AS employeeName,
        COALESCE(
          CASE
            WHEN mp.target_type = 'asset' THEN target_asset.name
            WHEN mp.target_type = 'building' THEN target_building.name
            WHEN mp.target_type = 'apartment' THEN CONCAT(apartment_building.name, ' / ', apartment.name)
          END,
          legacy_asset.name
        ) AS targetName
      FROM maintenance_plans mp
      LEFT JOIN assets legacy_asset ON legacy_asset.id = mp.asset_id
      LEFT JOIN assets target_asset ON mp.target_type = 'asset' AND target_asset.id = mp.target_id
      LEFT JOIN buildings target_building ON mp.target_type = 'building' AND target_building.id = mp.target_id
      LEFT JOIN apartments apartment ON mp.target_type = 'apartment' AND apartment.id = mp.target_id
      LEFT JOIN buildings apartment_building ON apartment_building.id = apartment.building_id
      LEFT JOIN employees employee ON employee.id = mp.employee_id
      WHERE mp.active = TRUE
        AND mp.next_due_on <= ?
      ORDER BY mp.next_due_on ASC, mp.title ASC
    `,
    [endDate]
  );

  const rangeStart = parseDateKey(startDate);
  const rangeEnd = parseDateKey(endDate);
  const rawRangeStart = settings.skipWeekendsForMaintenance ? addDays(rangeStart, -2) : rangeStart;
  const events = [];

  for (const row of rows) {
    const intervalDays = Number(row.intervalDays);
    let dueDate = parseDateKey(row.dueDate);

    if (intervalDays > 0 && dueDate < rawRangeStart) {
      const missedIntervals = Math.floor(daysBetween(dueDate, rawRangeStart) / intervalDays);
      dueDate = addDays(dueDate, missedIntervals * intervalDays);
      while (dueDate < rawRangeStart) {
        dueDate = addDays(dueDate, intervalDays);
      }
    }

    let occurrenceIndex = 0;
    while (dueDate <= rangeEnd) {
      const rawDueDateKey = formatDateKey(dueDate);
      const visibleDueDate = adjustDateForWeekend(dueDate, settings.skipWeekendsForMaintenance);
      const visibleDueDateKey = formatDateKey(visibleDueDate);
      if (visibleDueDate >= rangeStart && visibleDueDate <= rangeEnd) {
        events.push({
          ...row,
          id: `${row.id}:${visibleDueDateKey}:${occurrenceIndex}`,
          planId: row.id,
          rawDueDate: rawDueDateKey,
          dueDate: visibleDueDateKey,
          generated: rawDueDateKey !== row.dueDate || visibleDueDateKey !== rawDueDateKey,
          weekendAdjusted: visibleDueDateKey !== rawDueDateKey,
          occurrenceIndex
        });
      }

      if (!intervalDays || intervalDays < 1) {
        break;
      }

      dueDate = addDays(dueDate, intervalDays);
      occurrenceIndex += 1;

      if (occurrenceIndex > 370) {
        break;
      }
    }
  }

  return events.sort((left, right) => (
    left.dueDate.localeCompare(right.dueDate)
    || left.title.localeCompare(right.title, "de")
  ));
}

async function listAssets() {
  const [rows] = await pool.query(`
    SELECT
      a.id,
      a.building_id AS buildingId,
      a.apartment_id AS apartmentId,
      CASE
        WHEN a.apartment_id IS NOT NULL THEN 'apartment'
        WHEN a.building_id IS NOT NULL THEN 'building'
        ELSE NULL
      END AS assignmentType,
      COALESCE(a.apartment_id, a.building_id) AS assignmentId,
      CASE
        WHEN a.apartment_id IS NOT NULL THEN CONCAT(apartment_building.name, ' / ', asset_apartment.name)
        WHEN a.building_id IS NOT NULL THEN asset_building.name
        ELSE NULL
      END AS assignmentLabel,
      CASE
        WHEN a.apartment_id IS NOT NULL THEN apartment_building.address
        WHEN a.building_id IS NOT NULL THEN asset_building.address
        ELSE NULL
      END AS buildingAddress,
      COALESCE(apartment_customer.id, inherited_customer.id, building_customer.id) AS customerId,
      COALESCE(apartment_customer.customer_number, inherited_customer.customer_number, building_customer.customer_number) AS customerNumber,
      COALESCE(apartment_customer.name, inherited_customer.name, building_customer.name) AS customerName,
      COALESCE(apartment_customer.street, inherited_customer.street, building_customer.street) AS customerStreet,
      COALESCE(apartment_customer.house_number, inherited_customer.house_number, building_customer.house_number) AS customerHouseNumber,
      COALESCE(apartment_customer.postal_code, inherited_customer.postal_code, building_customer.postal_code) AS customerPostalCode,
      COALESCE(apartment_customer.city, inherited_customer.city, building_customer.city) AS customerCity,
      a.name,
      a.asset_type AS assetType,
      a.location,
      a.serial_number AS serialNumber,
      a.criticality
    FROM assets a
    LEFT JOIN buildings asset_building ON asset_building.id = a.building_id
    LEFT JOIN apartments asset_apartment ON asset_apartment.id = a.apartment_id
    LEFT JOIN buildings apartment_building ON apartment_building.id = asset_apartment.building_id
    LEFT JOIN customers building_customer ON building_customer.id = asset_building.customer_id
    LEFT JOIN customers apartment_customer ON apartment_customer.id = asset_apartment.customer_id
    LEFT JOIN customers inherited_customer ON inherited_customer.id = apartment_building.customer_id
    ORDER BY a.name ASC
  `);
  return rows;
}

function parseAssetAssignment(input) {
  const rawTarget = input.propertyTarget || (
    input.assignmentType && input.assignmentId
      ? `${input.assignmentType}:${input.assignmentId}`
      : ""
  );

  if (!rawTarget) {
    return {
      buildingId: null,
      apartmentId: null
    };
  }

  const [targetType, targetIdText] = String(rawTarget).split(":");
  const targetId = Number(targetIdText);
  if (!targetId) {
    throw createError("Ungültige Objektzuweisung.", 400);
  }

  if (targetType === "building") {
    return {
      buildingId: targetId,
      apartmentId: null
    };
  }

  if (targetType === "apartment") {
    return {
      buildingId: null,
      apartmentId: targetId
    };
  }

  throw createError("Ungültige Objektzuweisung.", 400);
}

function normalizeAssetInput(input) {
  const name = input.name?.trim();
  const assetType = input.assetType?.trim();
  const location = input.location?.trim();
  const serialNumber = input.serialNumber?.trim() || null;
  const criticality = input.criticality || "medium";
  const assignment = parseAssetAssignment(input);
  const allowedCriticalities = new Set(["low", "medium", "high", "critical"]);

  if (!name || !assetType || !location) {
    throw createError("Name, Typ und Standort sind Pflichtfelder.", 400);
  }

  if (!allowedCriticalities.has(criticality)) {
    throw createError("Ungültige Kritikalität.", 400);
  }

  return {
    ...assignment,
    name,
    assetType,
    location,
    serialNumber,
    criticality
  };
}

async function assertAssetAssignment(asset) {
  if (asset.buildingId) {
    const [[building]] = await pool.execute(
      `
        SELECT
          b.id,
          (SELECT COUNT(*) FROM apartments a WHERE a.building_id = b.id) AS apartmentCount
        FROM buildings b
        WHERE b.id = ?
      `,
      [asset.buildingId]
    );
    if (!building) {
      throw createError("Das ausgewählte Gebäude existiert nicht.", 400);
    }
    if (building.apartmentCount > 0) {
      throw createError("Gebäude mit Appartments können nicht direkt als Zuordnung genutzt werden. Bitte ein Appartment auswählen.", 400);
    }
  }

  if (asset.apartmentId) {
    const [[apartment]] = await pool.execute("SELECT id FROM apartments WHERE id = ?", [asset.apartmentId]);
    if (!apartment) {
      throw createError("Das ausgewählte Appartment existiert nicht.", 400);
    }
  }
}

async function createAsset(input) {
  const asset = normalizeAssetInput(input);
  await assertAssetAssignment(asset);

  const [result] = await pool.execute(
    `
      INSERT INTO assets (building_id, apartment_id, name, asset_type, location, serial_number, criticality)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      asset.buildingId,
      asset.apartmentId,
      asset.name,
      asset.assetType,
      asset.location,
      asset.serialNumber,
      asset.criticality
    ]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('asset', ?, ?)",
    [result.insertId, `Wartungsobjekt "${asset.name}" angelegt.`]
  );

  return getAssetById(result.insertId);
}

async function getAssetById(id) {
  const [[row]] = await pool.execute(
    `
      SELECT
        a.id,
        a.building_id AS buildingId,
        a.apartment_id AS apartmentId,
        CASE
          WHEN a.apartment_id IS NOT NULL THEN 'apartment'
          WHEN a.building_id IS NOT NULL THEN 'building'
          ELSE NULL
        END AS assignmentType,
        COALESCE(a.apartment_id, a.building_id) AS assignmentId,
        CASE
          WHEN a.apartment_id IS NOT NULL THEN CONCAT(apartment_building.name, ' / ', asset_apartment.name)
          WHEN a.building_id IS NOT NULL THEN asset_building.name
          ELSE NULL
        END AS assignmentLabel,
        CASE
          WHEN a.apartment_id IS NOT NULL THEN apartment_building.address
          WHEN a.building_id IS NOT NULL THEN asset_building.address
          ELSE NULL
        END AS buildingAddress,
        COALESCE(apartment_customer.id, inherited_customer.id, building_customer.id) AS customerId,
        COALESCE(apartment_customer.customer_number, inherited_customer.customer_number, building_customer.customer_number) AS customerNumber,
        COALESCE(apartment_customer.name, inherited_customer.name, building_customer.name) AS customerName,
        COALESCE(apartment_customer.street, inherited_customer.street, building_customer.street) AS customerStreet,
        COALESCE(apartment_customer.house_number, inherited_customer.house_number, building_customer.house_number) AS customerHouseNumber,
        COALESCE(apartment_customer.postal_code, inherited_customer.postal_code, building_customer.postal_code) AS customerPostalCode,
        COALESCE(apartment_customer.city, inherited_customer.city, building_customer.city) AS customerCity,
        a.name,
        a.asset_type AS assetType,
        a.location,
        a.serial_number AS serialNumber,
        a.criticality
      FROM assets a
      LEFT JOIN buildings asset_building ON asset_building.id = a.building_id
      LEFT JOIN apartments asset_apartment ON asset_apartment.id = a.apartment_id
      LEFT JOIN buildings apartment_building ON apartment_building.id = asset_apartment.building_id
      LEFT JOIN customers building_customer ON building_customer.id = asset_building.customer_id
      LEFT JOIN customers apartment_customer ON apartment_customer.id = asset_apartment.customer_id
      LEFT JOIN customers inherited_customer ON inherited_customer.id = apartment_building.customer_id
      WHERE a.id = ?
    `,
    [id]
  );
  return row;
}

async function updateAsset(id, input) {
  const existingAsset = await getAssetById(id);
  if (!existingAsset) {
    throw createError("Wartungsobjekt nicht gefunden.", 404);
  }

  const asset = normalizeAssetInput(input);
  await assertAssetAssignment(asset);

  await pool.execute(
    `
      UPDATE assets
      SET building_id = ?, apartment_id = ?, name = ?, asset_type = ?, location = ?, serial_number = ?, criticality = ?
      WHERE id = ?
    `,
    [
      asset.buildingId,
      asset.apartmentId,
      asset.name,
      asset.assetType,
      asset.location,
      asset.serialNumber,
      asset.criticality,
      id
    ]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('asset', ?, ?)",
    [id, `Wartungsobjekt "${asset.name}" aktualisiert.`]
  );

  return getAssetById(id);
}

async function deleteAsset(id) {
  const existingAsset = await getAssetById(id);
  if (!existingAsset) {
    throw createError("Wartungsobjekt nicht gefunden.", 404);
  }

  await pool.execute("DELETE FROM assets WHERE id = ?", [id]);
  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('asset', ?, ?)",
    [id, `Wartungsobjekt "${existingAsset.name}" gelöscht.`]
  );

  return { deleted: true };
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
    const error = new Error("Ungültiger Status.");
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
  getAppSettings,
  updateAppSettings,
  authenticateUser,
  createSession,
  getUserBySessionToken,
  deleteSession,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  listProperties,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  createApartment,
  updateApartment,
  deleteApartment,
  listMaintenanceTargets,
  createMaintenancePlan,
  deleteMaintenancePlan,
  getCalendarEvents,
  listAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  listWorkOrders,
  createWorkOrder,
  updateWorkOrderStatus
};
