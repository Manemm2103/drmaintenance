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
const regularSessionMs = 12 * 60 * 60 * 1000;
const rememberSessionMs = 60 * 24 * 60 * 60 * 1000;
const customerMaintenanceWeekdayFields = [
  { key: "maintenanceMonday", column: "maintenance_monday", day: 1, defaultValue: true },
  { key: "maintenanceTuesday", column: "maintenance_tuesday", day: 2, defaultValue: true },
  { key: "maintenanceWednesday", column: "maintenance_wednesday", day: 3, defaultValue: true },
  { key: "maintenanceThursday", column: "maintenance_thursday", day: 4, defaultValue: true },
  { key: "maintenanceFriday", column: "maintenance_friday", day: 5, defaultValue: true },
  { key: "maintenanceSaturday", column: "maintenance_saturday", day: 6, defaultValue: true },
  { key: "maintenanceSunday", column: "maintenance_sunday", day: 0, defaultValue: false }
];

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

async function ensureApartmentBuildingDeleteRestriction() {
  const [[constraint]] = await pool.query(`
    SELECT DELETE_RULE AS deleteRule
    FROM information_schema.REFERENTIAL_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'apartments'
      AND CONSTRAINT_NAME = 'fk_apartments_building'
    LIMIT 1
  `);

  if (constraint?.deleteRule === "RESTRICT" || constraint?.deleteRule === "NO ACTION") {
    return;
  }

  if (constraint) {
    await pool.query("ALTER TABLE apartments DROP FOREIGN KEY fk_apartments_building");
  }

  await pool.query(`
    ALTER TABLE apartments
    ADD CONSTRAINT fk_apartments_building
    FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE RESTRICT
  `);
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
      country VARCHAR(80) NULL,
      billing_address_differs BOOLEAN NOT NULL DEFAULT FALSE,
      billing_recipient VARCHAR(180) NULL,
      billing_street VARCHAR(160) NULL,
      billing_house_number VARCHAR(40) NULL,
      billing_postal_code VARCHAR(20) NULL,
      billing_city VARCHAR(120) NULL,
      billing_country VARCHAR(80) NULL,
      billing_address VARCHAR(240) NULL,
      maintenance_monday BOOLEAN NOT NULL DEFAULT TRUE,
      maintenance_tuesday BOOLEAN NOT NULL DEFAULT TRUE,
      maintenance_wednesday BOOLEAN NOT NULL DEFAULT TRUE,
      maintenance_thursday BOOLEAN NOT NULL DEFAULT TRUE,
      maintenance_friday BOOLEAN NOT NULL DEFAULT TRUE,
      maintenance_saturday BOOLEAN NOT NULL DEFAULT TRUE,
      maintenance_sunday BOOLEAN NOT NULL DEFAULT FALSE,
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
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS country VARCHAR(80) NULL AFTER city");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_address_differs BOOLEAN NOT NULL DEFAULT FALSE AFTER country");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_recipient VARCHAR(180) NULL AFTER billing_address_differs");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_street VARCHAR(160) NULL AFTER billing_recipient");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_house_number VARCHAR(40) NULL AFTER billing_street");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_postal_code VARCHAR(20) NULL AFTER billing_house_number");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_city VARCHAR(120) NULL AFTER billing_postal_code");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS billing_country VARCHAR(80) NULL AFTER billing_city");
  await pool.query("UPDATE customers SET country = 'Deutschland' WHERE country IS NULL OR country = ''");
  await pool.query("UPDATE customers SET billing_country = 'Deutschland' WHERE billing_address_differs = TRUE AND (billing_country IS NULL OR billing_country = '')");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS maintenance_monday BOOLEAN NOT NULL DEFAULT TRUE AFTER billing_address");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS maintenance_tuesday BOOLEAN NOT NULL DEFAULT TRUE AFTER maintenance_monday");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS maintenance_wednesday BOOLEAN NOT NULL DEFAULT TRUE AFTER maintenance_tuesday");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS maintenance_thursday BOOLEAN NOT NULL DEFAULT TRUE AFTER maintenance_wednesday");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS maintenance_friday BOOLEAN NOT NULL DEFAULT TRUE AFTER maintenance_thursday");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS maintenance_saturday BOOLEAN NOT NULL DEFAULT TRUE AFTER maintenance_friday");
  await pool.query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS maintenance_sunday BOOLEAN NOT NULL DEFAULT FALSE AFTER maintenance_saturday");
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
      qr_code VARCHAR(120) NULL,
      criticality ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
      instructions_html MEDIUMTEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_assets_building (building_id),
      INDEX idx_assets_apartment (apartment_id),
      INDEX idx_assets_location (location),
      UNIQUE KEY uq_assets_qr_code (qr_code),
      INDEX idx_assets_criticality (criticality)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS building_types (
      type_key VARCHAR(80) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_building_types_name (name),
      INDEX idx_building_types_system (is_system)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS buildings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NULL,
      name VARCHAR(180) NOT NULL,
      street VARCHAR(160) NULL,
      house_number VARCHAR(40) NULL,
      postal_code VARCHAR(20) NULL,
      city VARCHAR(120) NULL,
      country VARCHAR(80) NULL,
      address VARCHAR(220) NULL,
      building_type VARCHAR(80) NOT NULL DEFAULT 'private_house',
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
      CONSTRAINT fk_apartments_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE RESTRICT,
      UNIQUE KEY uq_apartment_per_building (building_id, apartment_number),
      INDEX idx_apartments_customer (customer_id),
      INDEX idx_apartments_building (building_id),
      INDEX idx_apartments_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query("ALTER TABLE buildings MODIFY COLUMN building_type VARCHAR(80) NOT NULL DEFAULT 'private_house'");
  await ensureApartmentBuildingDeleteRestriction();
  await pool.query("ALTER TABLE buildings ADD COLUMN IF NOT EXISTS customer_id INT NULL AFTER id");
  await pool.query("ALTER TABLE buildings ADD COLUMN IF NOT EXISTS street VARCHAR(160) NULL AFTER name");
  await pool.query("ALTER TABLE buildings ADD COLUMN IF NOT EXISTS house_number VARCHAR(40) NULL AFTER street");
  await pool.query("ALTER TABLE buildings ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) NULL AFTER house_number");
  await pool.query("ALTER TABLE buildings ADD COLUMN IF NOT EXISTS city VARCHAR(120) NULL AFTER postal_code");
  await pool.query("ALTER TABLE buildings ADD COLUMN IF NOT EXISTS country VARCHAR(80) NULL AFTER city");
  await pool.query("UPDATE buildings SET street = address WHERE (street IS NULL OR street = '') AND address IS NOT NULL AND address <> ''");
  await pool.query("UPDATE buildings SET country = 'Deutschland' WHERE country IS NULL OR country = ''");
  await pool.query("ALTER TABLE buildings ADD INDEX IF NOT EXISTS idx_buildings_customer (customer_id)");
  await pool.query("ALTER TABLE apartments ADD COLUMN IF NOT EXISTS customer_id INT NULL AFTER building_id");
  await pool.query("ALTER TABLE apartments ADD INDEX IF NOT EXISTS idx_apartments_customer (customer_id)");
  await pool.query("ALTER TABLE assets ADD COLUMN IF NOT EXISTS building_id INT NULL AFTER id");
  await pool.query("ALTER TABLE assets ADD COLUMN IF NOT EXISTS apartment_id INT NULL AFTER building_id");
  await pool.query("ALTER TABLE assets ADD COLUMN IF NOT EXISTS qr_code VARCHAR(120) NULL AFTER serial_number");
  await pool.query("ALTER TABLE assets ADD COLUMN IF NOT EXISTS instructions_html MEDIUMTEXT NULL AFTER criticality");
  await pool.query("ALTER TABLE assets ADD INDEX IF NOT EXISTS idx_assets_building (building_id)");
  await pool.query("ALTER TABLE assets ADD INDEX IF NOT EXISTS idx_assets_apartment (apartment_id)");
  await pool.query("ALTER TABLE assets ADD UNIQUE INDEX IF NOT EXISTS uq_assets_qr_code (qr_code)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS employee_functions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_employee_functions_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      employee_number VARCHAR(24) NULL,
      function_id INT NULL,
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
      INDEX idx_employees_function (function_id),
      INDEX idx_employees_name (last_name, first_name),
      INDEX idx_employees_active (active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await pool.query("ALTER TABLE employees ADD COLUMN IF NOT EXISTS function_id INT NULL AFTER employee_number");
  await pool.query("ALTER TABLE employees ADD INDEX IF NOT EXISTS idx_employees_function (function_id)");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS maintenance_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      asset_id INT NULL,
      target_type ENUM('asset', 'building', 'apartment') NULL,
      target_id INT NULL,
      employee_id INT NULL,
      title VARCHAR(180) NOT NULL,
      instructions_html MEDIUMTEXT NULL,
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
  await pool.query("ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS instructions_html MEDIUMTEXT NULL AFTER title");
  await pool.query("ALTER TABLE maintenance_plans ADD INDEX IF NOT EXISTS idx_plans_target (target_type, target_id)");
  await pool.query("ALTER TABLE maintenance_plans ADD INDEX IF NOT EXISTS idx_plans_employee (employee_id)");
  await pool.query("UPDATE maintenance_plans SET target_type = 'asset', target_id = asset_id WHERE target_type IS NULL AND asset_id IS NOT NULL");

  await pool.query(`
    CREATE TABLE IF NOT EXISTS asset_checks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      asset_id INT NOT NULL,
      label VARCHAR(180) NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_asset_checks_asset FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
      INDEX idx_asset_checks_asset (asset_id),
      INDEX idx_asset_checks_sort (asset_id, sort_order, id)
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
    CREATE TABLE IF NOT EXISTS work_order_checks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      work_order_id INT NOT NULL,
      asset_check_id INT NULL,
      label VARCHAR(180) NOT NULL,
      checked BOOLEAN NOT NULL DEFAULT FALSE,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_work_order_checks_order FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
      UNIQUE KEY uq_work_order_asset_check (work_order_id, asset_check_id),
      INDEX idx_work_order_checks_order (work_order_id),
      INDEX idx_work_order_checks_asset_check (asset_check_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_roles (
      role_key VARCHAR(80) PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      is_system BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_roles_name (name),
      INDEX idx_user_roles_system (is_system)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(80) NOT NULL,
      display_name VARCHAR(160) NOT NULL,
      email VARCHAR(190) NULL,
      role VARCHAR(80) NOT NULL DEFAULT 'customer',
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
  await pool.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(80) NOT NULL DEFAULT 'customer'");

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
  const [[weekendSetting]] = await pool.execute(
    "SELECT setting_value AS settingValue FROM app_settings WHERE setting_key = ?",
    ["skip_weekends_for_maintenance"]
  );
  const weekendDefault = weekendSetting?.settingValue || "0";
  await pool.execute(
    "INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)",
    ["skip_saturdays_for_maintenance", weekendDefault]
  );
  await pool.execute(
    "INSERT IGNORE INTO app_settings (setting_key, setting_value) VALUES (?, ?)",
    ["skip_sundays_for_maintenance", weekendDefault]
  );

  await seedUserRoles();
  await seedEmployeeFunctions();
  await seedBuildingTypes();
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
    roleName: row.roleName || row.role,
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

async function seedUserRoles() {
  await pool.execute(
    `
      INSERT INTO user_roles (role_key, name, is_system)
      VALUES
        ('admin', 'Admin', TRUE),
        ('customer', 'Kunde', TRUE)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        is_system = TRUE
    `
  );

  await pool.execute(
    `
      INSERT IGNORE INTO user_roles (role_key, name, is_system)
      SELECT DISTINCT role, role, FALSE
      FROM users
      WHERE role IS NOT NULL
        AND role NOT IN ('admin', 'customer')
    `
  );
}

async function seedEmployeeFunctions() {
  await pool.execute(
    `
      INSERT IGNORE INTO employee_functions (name)
      VALUES ('Techniker'), ('Hausmeister')
    `
  );

  await pool.execute(
    `
      INSERT IGNORE INTO employee_functions (name)
      SELECT DISTINCT role_title
      FROM employees
      WHERE role_title IS NOT NULL
        AND role_title <> ''
    `
  );

  await pool.execute(
    `
      UPDATE employees e
      INNER JOIN employee_functions f ON f.name = e.role_title
      SET e.function_id = f.id
      WHERE e.function_id IS NULL
        AND e.role_title IS NOT NULL
        AND e.role_title <> ''
    `
  );
}

async function seedBuildingTypes() {
  await pool.execute(
    `
      INSERT INTO building_types (type_key, name, is_system)
      VALUES
        ('private_house', 'Privathaus', TRUE),
        ('multi_family', 'Mehrfamilienhaus', TRUE),
        ('commercial', 'Gewerbe', TRUE),
        ('other', 'Sonstiges', TRUE)
      ON DUPLICATE KEY UPDATE
        is_system = TRUE
    `
  );

  await pool.execute(
    `
      INSERT IGNORE INTO building_types (type_key, name, is_system)
      SELECT DISTINCT building_type, building_type, FALSE
      FROM buildings
      WHERE building_type IS NOT NULL
        AND building_type <> ''
    `
  );
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
        country,
        billing_address_differs,
        notes
      )
      VALUES
        ('C0000154', 'Max', 'Mustermann', 'Max Mustermann', 'Max Mustermann', 'kunde@example.com', '+49 000 000000', 'Musterstraße', '12', '12345', 'Musterstadt', 'Deutschland', FALSE, 'Beispielkunde für den neuen Kundenworkflow.')
    `
  );

  const [buildingResult] = await pool.query(
    `
      INSERT INTO buildings (customer_id, name, street, house_number, postal_code, city, country, address, building_type, notes)
      VALUES
        (?, 'DR Home Privathaus', 'Musterstraße', '12', '12345', 'Musterstadt', 'Deutschland', 'Musterstraße 12, 12345 Musterstadt, Deutschland', 'private_house', 'Einzelobjekt ohne Appartments.'),
        (?, 'Wohnhaus Gartenblick', 'Gartenweg', '8', '12345', 'Musterstadt', 'Deutschland', 'Gartenweg 8, 12345 Musterstadt, Deutschland', 'multi_family', 'Mehrparteienhaus mit Appartments.')
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
    ["customers", "country"],
    ["customers", "billing_recipient"],
    ["customers", "billing_street"],
    ["customers", "billing_city"],
    ["customers", "billing_country"],
    ["customers", "billing_address"],
    ["customers", "notes"],
    ["assets", "name"],
    ["assets", "asset_type"],
    ["assets", "location"],
    ["assets", "qr_code"],
    ["assets", "instructions_html"],
    ["asset_checks", "label"],
    ["work_order_checks", "label"],
    ["employees", "first_name"],
    ["employees", "last_name"],
    ["employees", "role_title"],
    ["employees", "notes"],
    ["employee_functions", "name"],
    ["employee_functions", "notes"],
    ["building_types", "name"],
    ["user_roles", "name"],
    ["maintenance_plans", "title"],
    ["maintenance_plans", "instructions_html"],
    ["work_orders", "title"],
    ["work_orders", "description"],
    ["activity_log", "message"],
    ["buildings", "name"],
    ["buildings", "street"],
    ["buildings", "city"],
    ["buildings", "country"],
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
      DATE_FORMAT(wo.due_date, '%Y-%m-%d') AS dueDate,
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
      mp.asset_id AS assetId,
      mp.title,
      mp.instructions_html AS instructionsHtml,
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
  const visiblePlans = await Promise.all(plans.map(async (plan) => {
    const customerWeekdays = await getCustomerMaintenanceWeekdaysForTarget(
      plan.targetType || "asset",
      plan.targetId || plan.assetId
    );
    const nextDueOn = adjustDateKeyForWeekend(plan.nextDueOn, settings, customerWeekdays);
    return {
      ...plan,
      rawNextDueOn: plan.nextDueOn,
      nextDueOn,
      weekendAdjusted: nextDueOn !== plan.nextDueOn
    };
  }));
  visiblePlans.sort((left, right) => (
    left.nextDueOn.localeCompare(right.nextDueOn)
    || left.title.localeCompare(right.title, "de")
  ));

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
      COALESCE(apartment_customer.country, inherited_customer.country, building_customer.country) AS customerCountry,
      a.name,
      a.asset_type AS assetType,
      a.location,
      a.serial_number AS serialNumber,
      a.qr_code AS qrCode,
      a.instructions_html AS instructionsHtml,
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
  const employeeFunctions = await listEmployeeFunctions();
  const buildingTypes = await listBuildingTypes();
  const userRoles = await listUserRoles();

  return {
    summary,
    workOrders,
    plans: visiblePlans,
    assets,
    activity,
    customers,
    employees,
    employeeFunctions,
    buildingTypes,
    settings,
    users,
    userRoles
  };
}

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function assertValidUserRole(role) {
  const [[userRole]] = await pool.execute("SELECT role_key FROM user_roles WHERE role_key = ?", [role]);
  if (!userRole) {
    throw createError("Ungültige Benutzerrolle.", 400);
  }
}

function normalizeUserInput(input) {
  return {
    username: input.username?.trim(),
    displayName: input.displayName?.trim(),
    email: input.email?.trim() || null,
    role: input.role || "customer",
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
  const legacyWeekendSetting = settingToBoolean(settings.skip_weekends_for_maintenance);
  const skipSaturdaysForMaintenance = settings.skip_saturdays_for_maintenance === undefined
    ? legacyWeekendSetting
    : settingToBoolean(settings.skip_saturdays_for_maintenance);
  const skipSundaysForMaintenance = settings.skip_sundays_for_maintenance === undefined
    ? legacyWeekendSetting
    : settingToBoolean(settings.skip_sundays_for_maintenance);

  return {
    skipSaturdaysForMaintenance,
    skipSundaysForMaintenance,
    skipWeekendsForMaintenance: skipSaturdaysForMaintenance && skipSundaysForMaintenance
  };
}

async function updateAppSettings(input) {
  const currentSettings = await getAppSettings();
  const legacyWeekendInput = input.skipWeekendsForMaintenance;
  const skipSaturdaysForMaintenance = input.skipSaturdaysForMaintenance === undefined
    ? (legacyWeekendInput === undefined ? currentSettings.skipSaturdaysForMaintenance : parseBoolean(legacyWeekendInput))
    : parseBoolean(input.skipSaturdaysForMaintenance);
  const skipSundaysForMaintenance = input.skipSundaysForMaintenance === undefined
    ? (legacyWeekendInput === undefined ? currentSettings.skipSundaysForMaintenance : parseBoolean(legacyWeekendInput))
    : parseBoolean(input.skipSundaysForMaintenance);
  const skipWeekendsForMaintenance = skipSaturdaysForMaintenance && skipSundaysForMaintenance;

  const settingsToSave = [
    ["skip_saturdays_for_maintenance", skipSaturdaysForMaintenance],
    ["skip_sundays_for_maintenance", skipSundaysForMaintenance],
    ["skip_weekends_for_maintenance", skipWeekendsForMaintenance]
  ];

  for (const [settingKey, settingValue] of settingsToSave) {
    await pool.execute(
      `
        INSERT INTO app_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
      `,
      [settingKey, settingValue ? "1" : "0"]
    );
  }

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
        u.role,
        r.name AS roleName,
        u.active,
        u.is_system AS isSystem,
        u.password_hash AS passwordHash,
        u.password_salt AS passwordSalt
      FROM users u
      LEFT JOIN user_roles r ON r.role_key = u.role
      WHERE u.username = ?
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
        r.name AS roleName,
        u.active,
        u.is_system AS isSystem
      FROM user_sessions s
      INNER JOIN users u ON u.id = s.user_id
      LEFT JOIN user_roles r ON r.role_key = u.role
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
      u.id,
      u.username,
      u.display_name AS displayName,
      u.email,
      u.role,
      r.name AS roleName,
      u.active,
      u.is_system AS isSystem,
      u.created_at AS createdAt
    FROM users u
    LEFT JOIN user_roles r ON r.role_key = u.role
    ORDER BY u.is_system DESC, u.username ASC
  `);
  return rows;
}

async function createUser(input) {
  const user = normalizeUserInput(input);
  await assertValidUserRole(user.role);

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
        u.id,
        u.username,
        u.display_name AS displayName,
        u.email,
        u.role,
        r.name AS roleName,
        u.active,
        u.is_system AS isSystem,
        u.created_at AS createdAt
      FROM users u
      LEFT JOIN user_roles r ON r.role_key = u.role
      WHERE u.id = ?
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
    await assertValidUserRole(input.role);
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

function slugifyRoleKey(value) {
  return normalizeText(value)
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function normalizeUserRoleInput(input, existingRole = null) {
  const name = normalizeText(input.name);
  if (!name) {
    throw createError("Rollenname ist ein Pflichtfeld.", 400);
  }

  const roleKey = existingRole?.roleKey || slugifyRoleKey(input.roleKey || name);
  if (!roleKey) {
    throw createError("Aus dem Rollennamen konnte kein technischer Schlüssel gebildet werden.", 400);
  }

  return {
    roleKey,
    name
  };
}

async function listUserRoles() {
  const [rows] = await pool.query(`
    SELECT
      r.role_key AS roleKey,
      r.name,
      r.is_system AS isSystem,
      COUNT(u.id) AS userCount,
      r.created_at AS createdAt
    FROM user_roles r
    LEFT JOIN users u ON u.role = r.role_key
    GROUP BY r.role_key, r.name, r.is_system, r.created_at
    ORDER BY r.is_system DESC, FIELD(r.role_key, 'admin', 'customer') ASC, r.name ASC
  `);
  return rows;
}

async function getUserRoleByKey(roleKey) {
  const [[row]] = await pool.execute(
    `
      SELECT
        role_key AS roleKey,
        name,
        is_system AS isSystem,
        created_at AS createdAt
      FROM user_roles
      WHERE role_key = ?
    `,
    [roleKey]
  );
  return row;
}

function handleDuplicateUserRole(error) {
  if (error.code === "ER_DUP_ENTRY") {
    throw createError("Diese Rolle existiert bereits.", 409);
  }

  throw error;
}

async function createUserRole(input) {
  const userRole = normalizeUserRoleInput(input);

  try {
    await pool.execute(
      "INSERT INTO user_roles (role_key, name, is_system) VALUES (?, ?, FALSE)",
      [userRole.roleKey, userRole.name]
    );

    await pool.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('user_role', 0, ?)",
      [`Rolle "${userRole.name}" angelegt.`]
    );

    return getUserRoleByKey(userRole.roleKey);
  } catch (error) {
    handleDuplicateUserRole(error);
  }
}

async function updateUserRole(roleKey, input) {
  const existingRole = await getUserRoleByKey(roleKey);
  if (!existingRole) {
    throw createError("Rolle nicht gefunden.", 404);
  }

  const userRole = normalizeUserRoleInput(input, existingRole);
  await pool.execute(
    "UPDATE user_roles SET name = ? WHERE role_key = ?",
    [userRole.name, existingRole.roleKey]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('user_role', 0, ?)",
    [`Rolle "${userRole.name}" aktualisiert.`]
  );

  return getUserRoleByKey(existingRole.roleKey);
}

async function deleteUserRole(roleKey) {
  const existingRole = await getUserRoleByKey(roleKey);
  if (!existingRole) {
    throw createError("Rolle nicht gefunden.", 404);
  }

  if (existingRole.isSystem) {
    throw createError("Admin und Kunde sind Systemrollen und können nicht gelöscht werden.", 403);
  }

  const [[{ userCount }]] = await pool.execute("SELECT COUNT(*) AS userCount FROM users WHERE role = ?", [roleKey]);
  if (Number(userCount) > 0) {
    throw createError("Diese Rolle ist noch Benutzern zugewiesen.", 409);
  }

  await pool.execute("DELETE FROM user_roles WHERE role_key = ?", [roleKey]);
  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('user_role', 0, ?)",
    [`Rolle "${existingRole.name}" gelöscht.`]
  );

  return { deleted: true };
}

async function listEmployees() {
  const [rows] = await pool.query(`
    SELECT
      e.id,
      e.employee_number AS employeeNumber,
      e.function_id AS functionId,
      e.first_name AS firstName,
      e.last_name AS lastName,
      CONCAT(e.first_name, ' ', e.last_name) AS name,
      e.email,
      e.phone,
      COALESCE(f.name, e.role_title) AS roleTitle,
      f.name AS functionName,
      e.active,
      e.notes,
      e.created_at AS createdAt
    FROM employees e
    LEFT JOIN employee_functions f ON f.id = e.function_id
    ORDER BY e.active DESC, e.last_name ASC, e.first_name ASC
  `);
  return rows;
}

async function generateEmployeeNumber() {
  const [[row]] = await pool.query(`
    SELECT MAX(CAST(SUBSTRING(employee_number, 2) AS UNSIGNED)) AS maxNumber
    FROM employees
    WHERE employee_number REGEXP '^M[0-9]+$'
  `);
  const nextNumber = Math.max(Number(row.maxNumber || 0) + 1, 1);
  return `M${String(nextNumber).padStart(4, "0")}`;
}

async function assertEmployeeFunctionExists(functionId) {
  if (!functionId) {
    return;
  }

  const [[employeeFunction]] = await pool.execute("SELECT id FROM employee_functions WHERE id = ?", [functionId]);
  if (!employeeFunction) {
    throw createError("Die ausgewählte Funktion existiert nicht.", 400);
  }
}

async function normalizeEmployeeInput(input, existingEmployee = null) {
  const firstName = normalizeText(input.firstName) || existingEmployee?.firstName;
  const lastName = normalizeText(input.lastName) || existingEmployee?.lastName;

  if (!firstName || !lastName) {
    throw createError("Vorname und Name sind Pflichtfelder.", 400);
  }

  const functionId = input.functionId === undefined
    ? Number(existingEmployee?.functionId) || null
    : Number(input.functionId) || null;
  await assertEmployeeFunctionExists(functionId);

  return {
    employeeNumber: normalizeText(input.employeeNumber) || existingEmployee?.employeeNumber || await generateEmployeeNumber(),
    functionId,
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
        e.id,
        e.employee_number AS employeeNumber,
        e.function_id AS functionId,
        e.first_name AS firstName,
        e.last_name AS lastName,
        CONCAT(e.first_name, ' ', e.last_name) AS name,
        e.email,
        e.phone,
        COALESCE(f.name, e.role_title) AS roleTitle,
        f.name AS functionName,
        e.active,
        e.notes,
        e.created_at AS createdAt
      FROM employees e
      LEFT JOIN employee_functions f ON f.id = e.function_id
      WHERE e.id = ?
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
  const employee = await normalizeEmployeeInput(input);

  try {
    const [result] = await pool.execute(
      `
        INSERT INTO employees (
          employee_number,
          function_id,
          first_name,
          last_name,
          email,
          phone,
          role_title,
          active,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        employee.employeeNumber,
        employee.functionId,
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

  const employee = await normalizeEmployeeInput(input, existingEmployee);

  try {
    await pool.execute(
      `
        UPDATE employees
        SET
          employee_number = ?,
          function_id = ?,
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
        employee.functionId,
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

async function listEmployeeFunctions() {
  const [rows] = await pool.query(`
    SELECT
      f.id,
      f.name,
      f.notes,
      COUNT(e.id) AS employeeCount,
      f.created_at AS createdAt
    FROM employee_functions f
    LEFT JOIN employees e ON e.function_id = f.id
    GROUP BY f.id, f.name, f.notes, f.created_at
    ORDER BY f.name ASC
  `);
  return rows;
}

function normalizeEmployeeFunctionInput(input) {
  const name = normalizeText(input.name);
  if (!name) {
    throw createError("Funktionsname ist ein Pflichtfeld.", 400);
  }

  return {
    name,
    notes: normalizeText(input.notes)
  };
}

async function getEmployeeFunctionById(id) {
  const [[row]] = await pool.execute(
    `
      SELECT
        id,
        name,
        notes,
        created_at AS createdAt
      FROM employee_functions
      WHERE id = ?
    `,
    [id]
  );
  return row;
}

function handleDuplicateEmployeeFunction(error) {
  if (error.code === "ER_DUP_ENTRY") {
    throw createError("Diese Funktion existiert bereits.", 409);
  }

  throw error;
}

async function createEmployeeFunction(input) {
  const employeeFunction = normalizeEmployeeFunctionInput(input);

  try {
    const [result] = await pool.execute(
      "INSERT INTO employee_functions (name, notes) VALUES (?, ?)",
      [employeeFunction.name, employeeFunction.notes]
    );

    await pool.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('employee_function', ?, ?)",
      [result.insertId, `Funktion "${employeeFunction.name}" angelegt.`]
    );

    return getEmployeeFunctionById(result.insertId);
  } catch (error) {
    handleDuplicateEmployeeFunction(error);
  }
}

async function updateEmployeeFunction(id, input) {
  const existingFunction = await getEmployeeFunctionById(id);
  if (!existingFunction) {
    throw createError("Funktion nicht gefunden.", 404);
  }

  const employeeFunction = normalizeEmployeeFunctionInput(input);

  try {
    await pool.execute(
      "UPDATE employee_functions SET name = ?, notes = ? WHERE id = ?",
      [employeeFunction.name, employeeFunction.notes, id]
    );

    await pool.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('employee_function', ?, ?)",
      [id, `Funktion "${employeeFunction.name}" aktualisiert.`]
    );

    return getEmployeeFunctionById(id);
  } catch (error) {
    handleDuplicateEmployeeFunction(error);
  }
}

async function deleteEmployeeFunction(id) {
  const existingFunction = await getEmployeeFunctionById(id);
  if (!existingFunction) {
    throw createError("Funktion nicht gefunden.", 404);
  }

  const [[{ employeeCount }]] = await pool.execute("SELECT COUNT(*) AS employeeCount FROM employees WHERE function_id = ?", [id]);
  if (Number(employeeCount) > 0) {
    throw createError("Diese Funktion ist noch Mitarbeitern zugewiesen.", 409);
  }

  await pool.execute("DELETE FROM employee_functions WHERE id = ?", [id]);
  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('employee_function', ?, ?)",
    [id, `Funktion "${existingFunction.name}" gelöscht.`]
  );

  return { deleted: true };
}

function slugifyBuildingTypeKey(value) {
  return normalizeText(value)
    ?.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function normalizeBuildingTypeInput(input, existingType = null) {
  const name = normalizeText(input.name);
  if (!name) {
    throw createError("Gebäudetyp ist ein Pflichtfeld.", 400);
  }

  const typeKey = existingType?.typeKey || slugifyBuildingTypeKey(input.typeKey || name);
  if (!typeKey) {
    throw createError("Aus dem Gebäudetyp konnte kein technischer Schlüssel gebildet werden.", 400);
  }

  return {
    typeKey,
    name
  };
}

async function listBuildingTypes() {
  const [rows] = await pool.query(`
    SELECT
      bt.type_key AS typeKey,
      bt.name,
      bt.is_system AS isSystem,
      COUNT(b.id) AS buildingCount,
      bt.created_at AS createdAt
    FROM building_types bt
    LEFT JOIN buildings b ON b.building_type = bt.type_key
    GROUP BY bt.type_key, bt.name, bt.is_system, bt.created_at
    ORDER BY bt.is_system DESC, FIELD(bt.type_key, 'private_house', 'multi_family', 'commercial', 'other') ASC, bt.name ASC
  `);
  return rows;
}

async function getBuildingTypeByKey(typeKey) {
  const [[row]] = await pool.execute(
    `
      SELECT
        type_key AS typeKey,
        name,
        is_system AS isSystem,
        created_at AS createdAt
      FROM building_types
      WHERE type_key = ?
    `,
    [typeKey]
  );
  return row;
}

async function assertBuildingTypeExists(typeKey) {
  const buildingType = await getBuildingTypeByKey(typeKey);
  if (!buildingType) {
    throw createError("Ungültiger Gebäudetyp.", 400);
  }
}

function handleDuplicateBuildingType(error) {
  if (error.code === "ER_DUP_ENTRY") {
    throw createError("Dieser Gebäudetyp existiert bereits.", 409);
  }

  throw error;
}

async function createBuildingType(input) {
  const buildingType = normalizeBuildingTypeInput(input);

  try {
    await pool.execute(
      "INSERT INTO building_types (type_key, name, is_system) VALUES (?, ?, FALSE)",
      [buildingType.typeKey, buildingType.name]
    );

    await pool.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('building_type', 0, ?)",
      [`Gebäudetyp "${buildingType.name}" angelegt.`]
    );

    return getBuildingTypeByKey(buildingType.typeKey);
  } catch (error) {
    handleDuplicateBuildingType(error);
  }
}

async function updateBuildingType(typeKey, input) {
  const existingType = await getBuildingTypeByKey(typeKey);
  if (!existingType) {
    throw createError("Gebäudetyp nicht gefunden.", 404);
  }

  const buildingType = normalizeBuildingTypeInput(input, existingType);

  try {
    await pool.execute(
      "UPDATE building_types SET name = ? WHERE type_key = ?",
      [buildingType.name, existingType.typeKey]
    );

    await pool.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('building_type', 0, ?)",
      [`Gebäudetyp "${buildingType.name}" aktualisiert.`]
    );

    return getBuildingTypeByKey(existingType.typeKey);
  } catch (error) {
    handleDuplicateBuildingType(error);
  }
}

async function deleteBuildingType(typeKey) {
  const existingType = await getBuildingTypeByKey(typeKey);
  if (!existingType) {
    throw createError("Gebäudetyp nicht gefunden.", 404);
  }

  if (existingType.isSystem) {
    throw createError("Die Standard-Gebäudetypen sind geschützt und können nicht gelöscht werden.", 403);
  }

  const [[{ buildingCount }]] = await pool.execute(
    "SELECT COUNT(*) AS buildingCount FROM buildings WHERE building_type = ?",
    [typeKey]
  );
  if (Number(buildingCount) > 0) {
    throw createError("Dieser Gebäudetyp ist noch Gebäuden zugewiesen.", 409);
  }

  await pool.execute("DELETE FROM building_types WHERE type_key = ?", [typeKey]);
  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('building_type', 0, ?)",
    [`Gebäudetyp "${existingType.name}" gelöscht.`]
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
      country,
      billing_address_differs AS billingAddressDiffers,
      billing_recipient AS billingRecipient,
      billing_street AS billingStreet,
      billing_house_number AS billingHouseNumber,
      billing_postal_code AS billingPostalCode,
      billing_city AS billingCity,
      billing_country AS billingCountry,
      billing_address AS billingAddress,
      maintenance_monday AS maintenanceMonday,
      maintenance_tuesday AS maintenanceTuesday,
      maintenance_wednesday AS maintenanceWednesday,
      maintenance_thursday AS maintenanceThursday,
      maintenance_friday AS maintenanceFriday,
      maintenance_saturday AS maintenanceSaturday,
      maintenance_sunday AS maintenanceSunday,
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

function normalizeCustomerMaintenanceWeekdays(input, existingCustomer = null) {
  const weekdays = {};

  for (const field of customerMaintenanceWeekdayFields) {
    const existingValue = existingCustomer?.[field.key];
    weekdays[field.key] = input[field.key] === undefined
      ? (existingValue === undefined ? field.defaultValue : parseBoolean(existingValue))
      : parseBoolean(input[field.key]);
  }

  if (!Object.values(weekdays).some(Boolean)) {
    throw createError("Mindestens ein Wunsch-Wartungstag muss aktiv sein.", 400);
  }

  return weekdays;
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

function combineAddress(street, houseNumber, postalCode, city, country) {
  const streetLine = [street, houseNumber].filter(Boolean).join(" ");
  const cityLine = [postalCode, city].filter(Boolean).join(" ");
  return [streetLine, cityLine, country].filter(Boolean).join(", ") || null;
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
  const country = normalizeText(input.country) || existingCustomer?.country || "Deutschland";
  const billingAddressDiffers = parseBoolean(input.billingAddressDiffers);
  const billingRecipient = billingAddressDiffers ? normalizeText(input.billingRecipient) : null;
  const billingStreet = billingAddressDiffers ? normalizeText(input.billingStreet) : null;
  const billingHouseNumber = billingAddressDiffers ? normalizeText(input.billingHouseNumber) : null;
  const billingPostalCode = billingAddressDiffers ? normalizeText(input.billingPostalCode) : null;
  const billingCity = billingAddressDiffers ? normalizeText(input.billingCity) : null;
  const billingCountry = billingAddressDiffers ? (normalizeText(input.billingCountry) || country) : null;
  const maintenanceWeekdays = normalizeCustomerMaintenanceWeekdays(input, existingCustomer);

  if (billingAddressDiffers && (!billingRecipient || !billingStreet || !billingHouseNumber || !billingPostalCode || !billingCity || !billingCountry)) {
    throw createError("Bei abweichender Rechnungsadresse sind Empfänger, Straße, Hausnummer, PLZ, Ort und Land Pflichtfelder.", 400);
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
    country,
    billingAddressDiffers,
    billingRecipient,
    billingStreet,
    billingHouseNumber,
    billingPostalCode,
    billingCity,
    billingCountry,
    billingAddress: billingAddressDiffers
      ? combineAddress(billingStreet, billingHouseNumber, billingPostalCode, billingCity, billingCountry)
      : combineAddress(street, houseNumber, postalCode, city, country),
    ...maintenanceWeekdays,
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
          country,
          billing_address_differs,
          billing_recipient,
          billing_street,
          billing_house_number,
          billing_postal_code,
          billing_city,
          billing_country,
          billing_address,
          maintenance_monday,
          maintenance_tuesday,
          maintenance_wednesday,
          maintenance_thursday,
          maintenance_friday,
          maintenance_saturday,
          maintenance_sunday,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        customer.country,
        customer.billingAddressDiffers,
        customer.billingRecipient,
        customer.billingStreet,
        customer.billingHouseNumber,
        customer.billingPostalCode,
        customer.billingCity,
        customer.billingCountry,
        customer.billingAddress,
        customer.maintenanceMonday,
        customer.maintenanceTuesday,
        customer.maintenanceWednesday,
        customer.maintenanceThursday,
        customer.maintenanceFriday,
        customer.maintenanceSaturday,
        customer.maintenanceSunday,
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
        country,
        billing_address_differs AS billingAddressDiffers,
        billing_recipient AS billingRecipient,
        billing_street AS billingStreet,
        billing_house_number AS billingHouseNumber,
        billing_postal_code AS billingPostalCode,
        billing_city AS billingCity,
        billing_country AS billingCountry,
        billing_address AS billingAddress,
        maintenance_monday AS maintenanceMonday,
        maintenance_tuesday AS maintenanceTuesday,
        maintenance_wednesday AS maintenanceWednesday,
        maintenance_thursday AS maintenanceThursday,
        maintenance_friday AS maintenanceFriday,
        maintenance_saturday AS maintenanceSaturday,
        maintenance_sunday AS maintenanceSunday,
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
          country = ?,
          billing_address_differs = ?,
          billing_recipient = ?,
          billing_street = ?,
          billing_house_number = ?,
          billing_postal_code = ?,
          billing_city = ?,
          billing_country = ?,
          billing_address = ?,
          maintenance_monday = ?,
          maintenance_tuesday = ?,
          maintenance_wednesday = ?,
          maintenance_thursday = ?,
          maintenance_friday = ?,
          maintenance_saturday = ?,
          maintenance_sunday = ?,
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
        customer.country,
        customer.billingAddressDiffers,
        customer.billingRecipient,
        customer.billingStreet,
        customer.billingHouseNumber,
        customer.billingPostalCode,
        customer.billingCity,
        customer.billingCountry,
        customer.billingAddress,
        customer.maintenanceMonday,
        customer.maintenanceTuesday,
        customer.maintenanceWednesday,
        customer.maintenanceThursday,
        customer.maintenanceFriday,
        customer.maintenanceSaturday,
        customer.maintenanceSunday,
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
      b.street,
      b.house_number AS houseNumber,
      b.postal_code AS postalCode,
      b.city,
      b.country,
      b.address,
      b.building_type AS buildingType,
      bt.name AS buildingTypeName,
      b.notes,
      COUNT(a.id) AS apartmentCount
    FROM buildings b
    LEFT JOIN customers c ON c.id = b.customer_id
    LEFT JOIN building_types bt ON bt.type_key = b.building_type
    LEFT JOIN apartments a ON a.building_id = b.id
    GROUP BY b.id, b.customer_id, c.customer_number, c.name, b.name, b.street, b.house_number, b.postal_code, b.city, b.country, b.address, b.building_type, bt.name, b.notes
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

  const buildingType = normalizeText(input.buildingType) || "private_house";

  const street = normalizeText(input.street);
  const houseNumber = normalizeText(input.houseNumber);
  const postalCode = normalizeText(input.postalCode);
  const city = normalizeText(input.city);
  const country = normalizeText(input.country) || "Deutschland";

  return {
    customerId: Number(input.customerId) || null,
    name,
    street,
    houseNumber,
    postalCode,
    city,
    country,
    address: combineAddress(street, houseNumber, postalCode, city, country) || normalizeText(input.address),
    buildingType,
    notes: input.notes?.trim() || null
  };
}

async function createBuilding(input) {
  const building = normalizeBuildingInput(input);
  await assertCustomerExists(building.customerId);
  await assertBuildingTypeExists(building.buildingType);

  const [result] = await pool.execute(
    `
      INSERT INTO buildings (customer_id, name, street, house_number, postal_code, city, country, address, building_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      building.customerId,
      building.name,
      building.street,
      building.houseNumber,
      building.postalCode,
      building.city,
      building.country,
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
        street,
        house_number AS houseNumber,
        postal_code AS postalCode,
        city,
        country,
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
  await assertBuildingTypeExists(building.buildingType);

  await pool.execute(
    `
      UPDATE buildings
      SET customer_id = ?, name = ?, street = ?, house_number = ?, postal_code = ?, city = ?, country = ?, address = ?, building_type = ?, notes = ?
      WHERE id = ?
    `,
    [
      building.customerId,
      building.name,
      building.street,
      building.houseNumber,
      building.postalCode,
      building.city,
      building.country,
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

  const [[{ apartmentCount }]] = await pool.execute(
    "SELECT COUNT(*) AS apartmentCount FROM apartments WHERE building_id = ?",
    [id]
  );
  const linkedApartmentCount = Number(apartmentCount || 0);
  if (linkedApartmentCount > 0) {
    const apartmentLabel = linkedApartmentCount === 1
      ? "eine Wohnung/ein Appartment"
      : `${linkedApartmentCount} Wohnungen/Appartments`;
    throw createError(
      `Gebäude "${existingBuilding.name}" kann nicht gelöscht werden, weil noch ${apartmentLabel} verknüpft ${linkedApartmentCount === 1 ? "ist" : "sind"}. Bitte zuerst die Appartments löschen.`,
      409
    );
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
    throw createError("Ungültiges Wartungsobjekt.", 400);
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
    throw createError("Gebäude mit Appartments können nicht direkt als Wartungsobjekt genutzt werden.", 400);
  }
}

async function getMaintenanceTargetDisplayName(targetType, targetId) {
  if (targetType === "asset") {
    const [[asset]] = await pool.execute("SELECT name FROM assets WHERE id = ?", [targetId]);
    return asset?.name || null;
  }

  if (targetType === "apartment") {
    const [[apartment]] = await pool.execute(
      `
        SELECT CONCAT(b.name, ' / ', a.name) AS name
        FROM apartments a
        INNER JOIN buildings b ON b.id = a.building_id
        WHERE a.id = ?
      `,
      [targetId]
    );
    return apartment?.name || null;
  }

  if (targetType === "building") {
    const [[building]] = await pool.execute("SELECT name FROM buildings WHERE id = ?", [targetId]);
    return building?.name || null;
  }

  return null;
}

async function prepareMaintenancePlanWrite(input) {
  const targetType = input.targetType;
  const targetId = Number(input.targetId);
  const parsedEmployeeId = Number(input.employeeId);
  const employeeId = Number.isFinite(parsedEmployeeId) && parsedEmployeeId > 0 ? parsedEmployeeId : null;
  const intervalDays = Number(input.intervalDays);
  const instructionsHtml = normalizeText(input.instructionsHtml) || null;

  if (!targetType || !targetId || !intervalDays || !input.nextDueOn) {
    throw createError("Wartungsobjekt, Intervall und Fälligkeit sind Pflichtfelder.", 400);
  }

  if (intervalDays < 1) {
    throw createError("Das Intervall muss mindestens 1 Tag betragen.", 400);
  }

  await assertMaintenanceTarget(targetType, targetId);
  await assertEmployeeExists(employeeId);

  const settings = await getAppSettings();
  const customerWeekdays = await getCustomerMaintenanceWeekdaysForTarget(targetType, targetId);
  if (!hasAnyAllowedMaintenanceWeekday(settings, customerWeekdays)) {
    throw createError("Für diesen Kunden bleibt mit den Stammdaten kein erlaubter Wartungstag übrig.", 400);
  }
  const nextDueOn = adjustDateKeyForWeekend(input.nextDueOn, settings, customerWeekdays);
  const assetId = targetType === "asset" ? targetId : null;
  const title = normalizeText(input.title) || await getMaintenanceTargetDisplayName(targetType, targetId) || "Wartungsplan";

  return {
    assetId,
    targetType,
    targetId,
    employeeId,
    title,
    instructionsHtml,
    intervalDays,
    nextDueOn
  };
}

async function createMaintenancePlan(input) {
  const plan = await prepareMaintenancePlanWrite(input);
  const [result] = await pool.execute(
    `
      INSERT INTO maintenance_plans (asset_id, target_type, target_id, employee_id, title, instructions_html, interval_days, last_done_on, next_due_on)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      plan.assetId,
      plan.targetType,
      plan.targetId,
      plan.employeeId,
      plan.title,
      plan.instructionsHtml,
      plan.intervalDays,
      input.lastDoneOn || null,
      plan.nextDueOn
    ]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('maintenance_plan', ?, ?)",
    [result.insertId, `Wartungsplan "${plan.title}" angelegt.`]
  );

  return getMaintenancePlanById(result.insertId);
}

async function updateMaintenancePlan(id, input) {
  const existingPlan = await getMaintenancePlanById(id);
  if (!existingPlan) {
    throw createError("Wartungsplan nicht gefunden.", 404);
  }

  const plan = await prepareMaintenancePlanWrite(input);
  await pool.execute(
    `
      UPDATE maintenance_plans
      SET
        asset_id = ?,
        target_type = ?,
        target_id = ?,
        employee_id = ?,
        title = ?,
        instructions_html = ?,
        interval_days = ?,
        next_due_on = ?
      WHERE id = ?
    `,
    [
      plan.assetId,
      plan.targetType,
      plan.targetId,
      plan.employeeId,
      plan.title,
      plan.instructionsHtml,
      plan.intervalDays,
      plan.nextDueOn,
      id
    ]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('maintenance_plan', ?, ?)",
    [id, `Wartungsplan "${plan.title}" aktualisiert.`]
  );

  return getMaintenancePlanById(id);
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
        mp.instructions_html AS instructionsHtml,
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

function getCustomerMaintenanceWeekdaysFromRow(row) {
  if (!row || customerMaintenanceWeekdayFields.every((field) => row[field.key] === null || row[field.key] === undefined)) {
    return null;
  }

  return Object.fromEntries(customerMaintenanceWeekdayFields.map((field) => [
    field.key,
    parseBoolean(row[field.key])
  ]));
}

function getCustomerMaintenanceWeekdaySelect(alias = "c") {
  return customerMaintenanceWeekdayFields
    .map((field) => `${alias}.${field.column} AS ${field.key}`)
    .join(",\n        ");
}

async function getCustomerMaintenanceWeekdaysForTarget(targetType, targetId) {
  if (!targetType || !targetId) {
    return null;
  }

  let query;
  if (targetType === "asset") {
    query = `
      SELECT
        ${getCustomerMaintenanceWeekdaySelect("c")}
      FROM assets a
      LEFT JOIN buildings b ON b.id = a.building_id
      LEFT JOIN apartments ap ON ap.id = a.apartment_id
      LEFT JOIN buildings apb ON apb.id = ap.building_id
      LEFT JOIN customers c ON c.id = COALESCE(ap.customer_id, apb.customer_id, b.customer_id)
      WHERE a.id = ?
    `;
  } else if (targetType === "building") {
    query = `
      SELECT
        ${getCustomerMaintenanceWeekdaySelect("c")}
      FROM buildings b
      LEFT JOIN customers c ON c.id = b.customer_id
      WHERE b.id = ?
    `;
  } else if (targetType === "apartment") {
    query = `
      SELECT
        ${getCustomerMaintenanceWeekdaySelect("c")}
      FROM apartments ap
      INNER JOIN buildings b ON b.id = ap.building_id
      LEFT JOIN customers c ON c.id = COALESCE(ap.customer_id, b.customer_id)
      WHERE ap.id = ?
    `;
  } else {
    return null;
  }

  const [[row]] = await pool.execute(query, [targetId]);
  return getCustomerMaintenanceWeekdaysFromRow(row);
}

function getMaintenanceWeekdayFieldByDay(day) {
  return customerMaintenanceWeekdayFields.find((field) => field.day === day);
}

function hasAnyAllowedMaintenanceWeekday(settings, customerWeekdays = null) {
  return customerMaintenanceWeekdayFields.some((field) => {
    const blockedBySettings = (field.day === 6 && settings.skipSaturdaysForMaintenance)
      || (field.day === 0 && settings.skipSundaysForMaintenance);
    const blockedByCustomer = customerWeekdays ? !customerWeekdays[field.key] : false;
    return !blockedBySettings && !blockedByCustomer;
  });
}

function isSkippedMaintenanceWeekday(date, settings, customerWeekdays = null) {
  const day = date.getUTCDay();
  const weekdayField = getMaintenanceWeekdayFieldByDay(day);
  const blockedBySettings = (day === 6 && settings.skipSaturdaysForMaintenance)
    || (day === 0 && settings.skipSundaysForMaintenance);
  const blockedByCustomer = customerWeekdays && weekdayField ? !customerWeekdays[weekdayField.key] : false;
  return blockedBySettings || blockedByCustomer;
}

function adjustDateForWeekend(date, settings, customerWeekdays = null) {
  if (!hasAnyAllowedMaintenanceWeekday(settings, customerWeekdays)) {
    return date;
  }

  let adjustedDate = date;
  let attempts = 0;
  while (isSkippedMaintenanceWeekday(adjustedDate, settings, customerWeekdays) && attempts < 14) {
    adjustedDate = addDays(adjustedDate, 1);
    attempts += 1;
  }
  return adjustedDate;
}

function adjustDateKeyForWeekend(value, settings, customerWeekdays = null) {
  return formatDateKey(adjustDateForWeekend(parseDateKey(value), settings, customerWeekdays));
}

function hasMaintenanceNeighbor(dateKey, occupiedDateKeys) {
  const date = parseDateKey(dateKey);
  return [-1, 0, 1].some((offset) => occupiedDateKeys.has(formatDateKey(addDays(date, offset))));
}

function findNextSpacedMaintenanceDate(date, settings, customerWeekdays, occupiedDateKeys) {
  let adjustedDate = adjustDateForWeekend(date, settings, customerWeekdays);
  let attempts = 0;

  while (attempts < 730) {
    const adjustedDateKey = formatDateKey(adjustedDate);
    if (!isSkippedMaintenanceWeekday(adjustedDate, settings, customerWeekdays) && !hasMaintenanceNeighbor(adjustedDateKey, occupiedDateKeys)) {
      return adjustedDate;
    }

    adjustedDate = adjustDateForWeekend(addDays(adjustedDate, 1), settings, customerWeekdays);
    attempts += 1;
  }

  return adjustedDate;
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
        mp.asset_id AS assetId,
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
  const rawRangeStart = addDays(rangeStart, -31);
  const candidates = [];

  for (const row of rows) {
    const customerWeekdays = await getCustomerMaintenanceWeekdaysForTarget(
      row.targetType || "asset",
      row.targetId || row.assetId
    );
    const intervalDays = Number(row.intervalDays);
    let dueDate = parseDateKey(row.dueDate);
    let occurrenceIndex = 0;

    if (intervalDays > 0 && dueDate < rawRangeStart) {
      const missedIntervals = Math.floor(daysBetween(dueDate, rawRangeStart) / intervalDays);
      dueDate = addDays(dueDate, missedIntervals * intervalDays);
      occurrenceIndex = missedIntervals;
      while (dueDate < rawRangeStart) {
        dueDate = addDays(dueDate, intervalDays);
        occurrenceIndex += 1;
      }
    }

    while (dueDate <= rangeEnd) {
      const rawDueDateKey = formatDateKey(dueDate);
      const firstAllowedDueDate = adjustDateForWeekend(dueDate, settings, customerWeekdays);
      candidates.push({
        ...row,
        customerWeekdays,
        firstAllowedDueDate,
        firstAllowedDueDateKey: formatDateKey(firstAllowedDueDate),
        occurrenceIndex,
        rawDueDateKey
      });

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

  candidates.sort((left, right) => (
    left.firstAllowedDueDateKey.localeCompare(right.firstAllowedDueDateKey)
    || left.rawDueDateKey.localeCompare(right.rawDueDateKey)
    || left.title.localeCompare(right.title, "de")
    || Number(left.id) - Number(right.id)
  ));

  const occupiedDateKeys = new Set();
  const events = [];
  for (const candidate of candidates) {
    const visibleDueDate = findNextSpacedMaintenanceDate(
      candidate.firstAllowedDueDate,
      settings,
      candidate.customerWeekdays,
      occupiedDateKeys
    );
    const visibleDueDateKey = formatDateKey(visibleDueDate);
    occupiedDateKeys.add(visibleDueDateKey);

    if (visibleDueDate >= rangeStart && visibleDueDate <= rangeEnd) {
      const {
        customerWeekdays: _customerWeekdays,
        firstAllowedDueDate: _firstAllowedDueDate,
        firstAllowedDueDateKey,
        rawDueDateKey,
        ...eventPayload
      } = candidate;

      events.push({
        ...eventPayload,
        id: `${eventPayload.id}:${visibleDueDateKey}:${eventPayload.occurrenceIndex}`,
        planId: eventPayload.id,
        rawDueDate: rawDueDateKey,
        dueDate: visibleDueDateKey,
        generated: rawDueDateKey !== eventPayload.dueDate || visibleDueDateKey !== rawDueDateKey,
        weekendAdjusted: firstAllowedDueDateKey !== rawDueDateKey,
        spacingAdjusted: visibleDueDateKey !== firstAllowedDueDateKey,
        occurrenceIndex: eventPayload.occurrenceIndex
      });
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
      COALESCE(apartment_customer.country, inherited_customer.country, building_customer.country) AS customerCountry,
      a.name,
      a.asset_type AS assetType,
      a.location,
      a.serial_number AS serialNumber,
      a.qr_code AS qrCode,
      a.instructions_html AS instructionsHtml,
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
  const qrCode = input.qrCode?.trim() || null;
  const instructionsHtml = normalizeText(input.instructionsHtml);
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
    qrCode,
    instructionsHtml,
    criticality
  };
}

function handleDuplicateAsset(error) {
  if (error.code === "ER_DUP_ENTRY") {
    throw createError("Dieser QR-Code ist bereits mit einem anderen Wartungsobjekt verknüpft.", 409);
  }

  throw error;
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

  let result;
  try {
    [result] = await pool.execute(
      `
        INSERT INTO assets (building_id, apartment_id, name, asset_type, location, serial_number, qr_code, criticality, instructions_html)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        asset.buildingId,
        asset.apartmentId,
        asset.name,
        asset.assetType,
        asset.location,
        asset.serialNumber,
        asset.qrCode,
        asset.criticality,
        asset.instructionsHtml
      ]
    );
  } catch (error) {
    handleDuplicateAsset(error);
  }

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
        COALESCE(apartment_customer.country, inherited_customer.country, building_customer.country) AS customerCountry,
        a.name,
        a.asset_type AS assetType,
        a.location,
        a.serial_number AS serialNumber,
        a.qr_code AS qrCode,
        a.instructions_html AS instructionsHtml,
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

  try {
    await pool.execute(
      `
        UPDATE assets
        SET building_id = ?, apartment_id = ?, name = ?, asset_type = ?, location = ?, serial_number = ?, qr_code = ?, criticality = ?, instructions_html = ?
        WHERE id = ?
      `,
      [
        asset.buildingId,
        asset.apartmentId,
        asset.name,
        asset.assetType,
        asset.location,
        asset.serialNumber,
        asset.qrCode,
        asset.criticality,
        asset.instructionsHtml,
        id
      ]
    );
  } catch (error) {
    handleDuplicateAsset(error);
  }

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

async function listAssetChecks(assetId) {
  const [rows] = await pool.execute(
    `
      SELECT
        id,
        asset_id AS assetId,
        label,
        sort_order AS sortOrder,
        created_at AS createdAt
      FROM asset_checks
      WHERE asset_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [assetId]
  );
  return rows;
}

async function createAssetCheck(assetId, input) {
  const asset = await getAssetById(assetId);
  if (!asset) {
    throw createError("Wartungsobjekt nicht gefunden.", 404);
  }

  const label = normalizeText(input.label);
  if (!label) {
    throw createError("Check ist ein Pflichtfeld.", 400);
  }

  const [[{ nextSortOrder }]] = await pool.execute(
    "SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextSortOrder FROM asset_checks WHERE asset_id = ?",
    [assetId]
  );

  const [result] = await pool.execute(
    "INSERT INTO asset_checks (asset_id, label, sort_order) VALUES (?, ?, ?)",
    [assetId, label, nextSortOrder]
  );

  await pool.execute(
    `
      INSERT IGNORE INTO work_order_checks (work_order_id, asset_check_id, label)
      SELECT wo.id, ?, ?
      FROM work_orders wo
      WHERE wo.asset_id = ?
        AND wo.status <> 'done'
    `,
    [result.insertId, label, assetId]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('asset', ?, ?)",
    [assetId, `Check "${label}" am Wartungsobjekt "${asset.name}" angelegt.`]
  );

  return getAssetDetails(assetId);
}

async function deleteAssetCheck(id) {
  const [[check]] = await pool.execute(
    `
      SELECT
        ac.id,
        ac.asset_id AS assetId,
        ac.label,
        a.name AS assetName
      FROM asset_checks ac
      INNER JOIN assets a ON a.id = ac.asset_id
      WHERE ac.id = ?
    `,
    [id]
  );
  if (!check) {
    throw createError("Check nicht gefunden.", 404);
  }

  await pool.execute("DELETE FROM asset_checks WHERE id = ?", [id]);
  await pool.execute("DELETE FROM work_order_checks WHERE asset_check_id = ? AND checked = FALSE", [id]);
  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('asset', ?, ?)",
    [check.assetId, `Check "${check.label}" am Wartungsobjekt "${check.assetName}" gelöscht.`]
  );

  return getAssetDetails(check.assetId);
}

async function syncWorkOrderChecksFromAsset(workOrderId, assetId) {
  if (!assetId) {
    return;
  }

  await pool.execute(
    `
      INSERT IGNORE INTO work_order_checks (work_order_id, asset_check_id, label)
      SELECT ?, ac.id, ac.label
      FROM asset_checks ac
      WHERE ac.asset_id = ?
      ORDER BY ac.sort_order ASC, ac.id ASC
    `,
    [workOrderId, assetId]
  );
}

async function listWorkOrderChecks(workOrderId) {
  const [checks] = await pool.execute(
    `
      SELECT
        id,
        work_order_id AS workOrderId,
        asset_check_id AS assetCheckId,
        label,
        checked,
        completed_at AS completedAt
      FROM work_order_checks
      WHERE work_order_id = ?
      ORDER BY id ASC
    `,
    [workOrderId]
  );
  return checks;
}

function validateWorkOrderPriority(priority) {
  const allowedPriorities = new Set(["low", "medium", "high", "critical"]);
  if (!allowedPriorities.has(priority)) {
    throw createError("Ungültige Priorität.", 400);
  }
}

function validateWorkOrderStatus(status) {
  const allowedStatuses = new Set(["open", "planned", "in_progress", "done"]);
  if (!allowedStatuses.has(status)) {
    throw createError("Ungültiger Status.", 400);
  }
}

async function getOpenWorkOrdersForAsset(assetId) {
  const [rows] = await pool.execute(
    `
      SELECT
        wo.id,
        wo.title,
        wo.description,
        wo.priority,
        wo.status,
        DATE_FORMAT(wo.due_date, '%Y-%m-%d') AS dueDate,
        wo.completed_at AS completedAt,
        (SELECT COUNT(*) FROM work_order_checks woc WHERE woc.work_order_id = wo.id) AS checkCount,
        (SELECT COUNT(*) FROM work_order_checks woc WHERE woc.work_order_id = wo.id AND woc.checked = TRUE) AS checkedCount
      FROM work_orders wo
      WHERE wo.asset_id = ?
        AND wo.status <> 'done'
      ORDER BY wo.due_date ASC, FIELD(wo.priority, 'critical', 'high', 'medium', 'low') ASC
    `,
    [assetId]
  );
  return rows;
}

async function getMaintenancePlansForAsset(assetId) {
  const [rows] = await pool.execute(
    `
      SELECT
        mp.id,
        mp.asset_id AS assetId,
        mp.target_type AS targetType,
        mp.target_id AS targetId,
        mp.employee_id AS employeeId,
        mp.title,
        mp.instructions_html AS instructionsHtml,
        mp.interval_days AS intervalDays,
        DATE_FORMAT(mp.next_due_on, '%Y-%m-%d') AS nextDueOn,
        mp.active,
        CONCAT(employee.first_name, ' ', employee.last_name) AS employeeName
      FROM maintenance_plans mp
      LEFT JOIN employees employee ON employee.id = mp.employee_id
      WHERE (mp.target_type = 'asset' AND mp.target_id = ?)
        OR mp.asset_id = ?
      ORDER BY mp.active DESC, mp.next_due_on ASC
    `,
    [assetId, assetId]
  );
  return rows;
}

async function getAssetDetails(id) {
  const asset = await getAssetById(id);
  if (!asset) {
    throw createError("Wartungsobjekt nicht gefunden.", 404);
  }

  const openOrders = await getOpenWorkOrdersForAsset(id);
  await Promise.all(openOrders.map((order) => syncWorkOrderChecksFromAsset(order.id, id)));

  return {
    asset,
    checks: await listAssetChecks(id),
    maintenancePlans: await getMaintenancePlansForAsset(id),
    workOrders: await getOpenWorkOrdersForAsset(id)
  };
}

async function getAssetDetailsByQrCode(qrCode) {
  const normalizedQrCode = normalizeText(qrCode);
  if (!normalizedQrCode) {
    throw createError("QR-Code ist ein Pflichtfeld.", 400);
  }

  const [[asset]] = await pool.execute("SELECT id FROM assets WHERE qr_code = ?", [normalizedQrCode]);
  if (!asset) {
    throw createError("Kein Wartungsobjekt zu diesem QR-Code gefunden.", 404);
  }

  return getAssetDetails(asset.id);
}

async function listWorkOrders(filter = "open") {
  const conditions = [];
  const allowedFilters = new Set(["open", "overdue", "done", "all"]);
  const activeFilter = allowedFilters.has(filter) ? filter : "open";

  if (activeFilter === "open") {
    conditions.push("wo.status <> 'done'");
  } else if (activeFilter === "overdue") {
    conditions.push("wo.status <> 'done'");
    conditions.push("wo.due_date < CURDATE()");
  } else if (activeFilter === "done") {
    conditions.push("wo.status = 'done'");
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.query(`
    SELECT
      wo.id,
      wo.title,
      wo.description,
      wo.priority,
      wo.status,
      DATE_FORMAT(wo.due_date, '%Y-%m-%d') AS dueDate,
      wo.completed_at AS completedAt,
      a.name AS assetName,
      a.location AS location,
      a.id AS assetId,
      (SELECT COUNT(*) FROM work_order_checks woc WHERE woc.work_order_id = wo.id) AS checkCount,
      (SELECT COUNT(*) FROM work_order_checks woc WHERE woc.work_order_id = wo.id AND woc.checked = TRUE) AS checkedCount
    FROM work_orders wo
    LEFT JOIN assets a ON a.id = wo.asset_id
    ${whereClause}
    ORDER BY wo.due_date ASC, FIELD(wo.priority, 'critical', 'high', 'medium', 'low') ASC, wo.created_at DESC
  `);
  return rows;
}

async function createWorkOrder(input) {
  const title = normalizeText(input.title);
  const description = normalizeText(input.description);
  const priority = input.priority || "medium";
  const dueDate = normalizeText(input.dueDate);
  const assetId = input.assetId ? Number(input.assetId) : null;

  if (!title || !dueDate) {
    throw createError("Titel und Fälligkeitsdatum sind Pflichtfelder.", 400);
  }

  validateWorkOrderPriority(priority);

  const [result] = await pool.execute(
    `
      INSERT INTO work_orders (asset_id, title, description, priority, status, due_date)
      VALUES (?, ?, ?, ?, 'open', ?)
    `,
    [
      assetId,
      title,
      description,
      priority,
      dueDate
    ]
  );
  await syncWorkOrderChecksFromAsset(result.insertId, assetId);

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('work_order', ?, ?)",
    [result.insertId, `Auftrag "${title}" erstellt.`]
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
        DATE_FORMAT(wo.due_date, '%Y-%m-%d') AS dueDate,
        a.name AS assetName,
        a.id AS assetId
      FROM work_orders wo
      LEFT JOIN assets a ON a.id = wo.asset_id
      WHERE wo.id = ?
    `,
    [id]
  );
  if (!row) {
    throw createError("Auftrag nicht gefunden.", 404);
  }

  await syncWorkOrderChecksFromAsset(row.id, row.assetId);
  return {
    ...row,
    checks: await listWorkOrderChecks(row.id)
  };
}

async function updateWorkOrder(id, input) {
  const existingWorkOrder = await getWorkOrderById(id);
  const title = normalizeText(input.title) || existingWorkOrder.title;
  const description = input.description === undefined ? existingWorkOrder.description : normalizeText(input.description);
  const priority = input.priority || existingWorkOrder.priority;
  const status = input.status || existingWorkOrder.status;
  const dueDate = normalizeText(input.dueDate) || existingWorkOrder.dueDate;
  const assetId = input.assetId === undefined
    ? existingWorkOrder.assetId
    : (input.assetId ? Number(input.assetId) : null);

  validateWorkOrderPriority(priority);
  validateWorkOrderStatus(status);

  await pool.execute(
    `
      UPDATE work_orders
      SET
        asset_id = ?,
        title = ?,
        description = ?,
        priority = ?,
        status = ?,
        due_date = ?,
        completed_at = CASE WHEN ? = 'done' THEN COALESCE(completed_at, CURRENT_TIMESTAMP) ELSE NULL END
      WHERE id = ?
    `,
    [assetId, title, description, priority, status, dueDate, status, id]
  );
  await syncWorkOrderChecksFromAsset(id, assetId);

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('work_order', ?, ?)",
    [id, `Auftrag "${title}" aktualisiert.`]
  );

  return getWorkOrderById(id);
}

async function updateWorkOrderCheck(workOrderId, checkId, checked) {
  await getWorkOrderById(workOrderId);
  const isChecked = parseBoolean(checked);
  const [result] = await pool.execute(
    `
      UPDATE work_order_checks
      SET checked = ?, completed_at = CASE WHEN ? = TRUE THEN CURRENT_TIMESTAMP ELSE NULL END
      WHERE id = ?
        AND work_order_id = ?
    `,
    [isChecked, isChecked, checkId, workOrderId]
  );
  if (result.affectedRows === 0) {
    throw createError("Check nicht gefunden.", 404);
  }

  return getWorkOrderById(workOrderId);
}

async function updateWorkOrderStatus(id, status) {
  validateWorkOrderStatus(status);

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
  listUserRoles,
  createUserRole,
  updateUserRole,
  deleteUserRole,
  listEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  listEmployeeFunctions,
  createEmployeeFunction,
  updateEmployeeFunction,
  deleteEmployeeFunction,
  listBuildingTypes,
  createBuildingType,
  updateBuildingType,
  deleteBuildingType,
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
  updateMaintenancePlan,
  deleteMaintenancePlan,
  getCalendarEvents,
  listAssets,
  getAssetDetails,
  getAssetDetailsByQrCode,
  createAsset,
  updateAsset,
  deleteAsset,
  createAssetCheck,
  deleteAssetCheck,
  listWorkOrders,
  createWorkOrder,
  getWorkOrderById,
  updateWorkOrder,
  updateWorkOrderCheck,
  updateWorkOrderStatus
};
