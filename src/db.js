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
    CREATE TABLE IF NOT EXISTS buildings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      address VARCHAR(220) NULL,
      building_type ENUM('private_house', 'multi_family', 'commercial', 'other') NOT NULL DEFAULT 'private_house',
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_buildings_name (name),
      INDEX idx_buildings_type (building_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS apartments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      building_id INT NOT NULL,
      apartment_number VARCHAR(80) NOT NULL,
      name VARCHAR(160) NOT NULL,
      floor VARCHAR(80) NULL,
      notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_apartments_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE CASCADE,
      UNIQUE KEY uq_apartment_per_building (building_id, apartment_number),
      INDEX idx_apartments_building (building_id),
      INDEX idx_apartments_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS maintenance_plans (
      id INT AUTO_INCREMENT PRIMARY KEY,
      asset_id INT NULL,
      target_type ENUM('asset', 'building', 'apartment') NULL,
      target_id INT NULL,
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
      INDEX idx_plans_target (target_type, target_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query("ALTER TABLE maintenance_plans MODIFY COLUMN asset_id INT NULL");
  await pool.query("ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS target_type ENUM('asset', 'building', 'apartment') NULL AFTER asset_id");
  await pool.query("ALTER TABLE maintenance_plans ADD COLUMN IF NOT EXISTS target_id INT NULL AFTER target_type");
  await pool.query("ALTER TABLE maintenance_plans ADD INDEX IF NOT EXISTS idx_plans_target (target_type, target_id)");
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

  const [assetResult] = await pool.query(
    `
      INSERT INTO assets (name, asset_type, location, serial_number, criticality)
      VALUES
        ('Klimaanlage Wellnessbereich', 'Klima', 'Wellnessbereich', 'KLIMA-001', 'high'),
        ('Dampfbad Steuerung', 'Wellness', 'Spa-Bereich', 'DAMPF-001', 'critical'),
        ('PV Wechselrichter 1', 'Energie', 'Dachzentrale', 'PV-WR-001', 'medium'),
        ('Wasserenthärter', 'Sanitär', 'Technikraum UG', 'SAN-WE-004', 'medium')
    `
  );

  await pool.query(
    `
      INSERT INTO maintenance_plans (asset_id, title, interval_days, last_done_on, next_due_on)
      VALUES
        (?, 'Filter und Kondensatablauf prüfen', 90, CURDATE() - INTERVAL 70 DAY, CURDATE() + INTERVAL 20 DAY),
        (?, 'Dampfgenerator und Türdichtung prüfen', 180, CURDATE() - INTERVAL 150 DAY, CURDATE() + INTERVAL 30 DAY),
        (?, 'Ertragsdaten und Lüfter prüfen', 60, CURDATE() - INTERVAL 65 DAY, CURDATE() - INTERVAL 5 DAY),
        (?, 'Salzstand und Harzspülung prüfen', 45, CURDATE() - INTERVAL 35 DAY, CURDATE() + INTERVAL 10 DAY)
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

  const [buildingResult] = await pool.query(
    `
      INSERT INTO buildings (name, address, building_type, notes)
      VALUES
        ('DR Home Privathaus', 'Musterstraße 12', 'private_house', 'Einzelobjekt ohne Appartments.'),
        ('Wohnhaus Gartenblick', 'Gartenweg 8', 'multi_family', 'Mehrparteienhaus mit Appartments.')
    `
  );

  const privateHouseId = buildingResult.insertId;
  const multiFamilyId = buildingResult.insertId + 1;

  const [apartmentResult] = await pool.execute(
    `
      INSERT INTO apartments (building_id, apartment_number, name, floor)
      VALUES
        (?, 'EG-01', 'Appartment EG links', 'EG'),
        (?, 'OG-02', 'Appartment OG rechts', 'OG')
    `,
    [multiFamilyId, multiFamilyId]
  );

  await pool.execute(
    `
      INSERT INTO maintenance_plans (asset_id, target_type, target_id, title, interval_days, last_done_on, next_due_on)
      VALUES
        (NULL, 'building', ?, 'Dachrinne und Außenbereich prüfen', 180, CURDATE() - INTERVAL 120 DAY, CURDATE() + INTERVAL 60 DAY),
        (NULL, 'apartment', ?, 'Rauchmelder und Fenster prüfen', 365, CURDATE() - INTERVAL 330 DAY, CURDATE() + INTERVAL 35 DAY)
    `,
    [privateHouseId, apartmentResult.insertId]
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
    ["assets", "name"],
    ["assets", "asset_type"],
    ["assets", "location"],
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
  const [[summary]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM assets) AS assetCount,
      (SELECT COUNT(*) FROM maintenance_plans WHERE active = TRUE) AS activePlanCount,
      (SELECT COUNT(*) FROM work_orders WHERE status <> 'done') AS openWorkOrderCount,
      (SELECT COUNT(*) FROM work_orders WHERE status <> 'done' AND due_date < CURDATE()) AS overdueCount,
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
    WHERE mp.active = TRUE
    ORDER BY mp.next_due_on ASC
  `);

  const [assets] = await pool.query(`
    SELECT id, name, asset_type AS assetType, location, serial_number AS serialNumber, criticality
    FROM assets
    ORDER BY FIELD(criticality, 'critical', 'high', 'medium', 'low') ASC, name ASC
  `);

  const [activity] = await pool.query(`
    SELECT id, message, created_at AS createdAt
    FROM activity_log
    ORDER BY created_at DESC
    LIMIT 8
  `);

  const users = await listUsers();

  return {
    summary,
    workOrders,
    plans,
    assets,
    activity,
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

async function listProperties() {
  const [buildings] = await pool.query(`
    SELECT
      b.id,
      b.name,
      b.address,
      b.building_type AS buildingType,
      b.notes,
      COUNT(a.id) AS apartmentCount
    FROM buildings b
    LEFT JOIN apartments a ON a.building_id = b.id
    GROUP BY b.id, b.name, b.address, b.building_type, b.notes
    ORDER BY b.name ASC
  `);

  const [apartments] = await pool.query(`
    SELECT
      id,
      building_id AS buildingId,
      apartment_number AS apartmentNumber,
      name,
      floor,
      notes
    FROM apartments
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

async function createBuilding(input) {
  const name = input.name?.trim();
  if (!name) {
    throw createError("Gebäudename ist ein Pflichtfeld.", 400);
  }

  const buildingType = input.buildingType || "private_house";
  const allowedTypes = new Set(["private_house", "multi_family", "commercial", "other"]);
  if (!allowedTypes.has(buildingType)) {
    throw createError("Ungültiger Gebäudetyp.", 400);
  }

  const [result] = await pool.execute(
    `
      INSERT INTO buildings (name, address, building_type, notes)
      VALUES (?, ?, ?, ?)
    `,
    [
      name,
      input.address?.trim() || null,
      buildingType,
      input.notes?.trim() || null
    ]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('building', ?, ?)",
    [result.insertId, `Gebäude "${name}" angelegt.`]
  );

  return getBuildingById(result.insertId);
}

async function getBuildingById(id) {
  const [[building]] = await pool.execute(
    `
      SELECT
        id,
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

async function createApartment(input) {
  const buildingId = Number(input.buildingId);
  const apartmentNumber = input.apartmentNumber?.trim();
  const name = input.name?.trim();

  if (!buildingId || !apartmentNumber || !name) {
    throw createError("Gebäude, Appartment-Nummer und Name sind Pflichtfelder.", 400);
  }

  try {
    const [result] = await pool.execute(
      `
        INSERT INTO apartments (building_id, apartment_number, name, floor, notes)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        buildingId,
        apartmentNumber,
        name,
        input.floor?.trim() || null,
        input.notes?.trim() || null
      ]
    );

    await pool.execute(
      "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('apartment', ?, ?)",
      [result.insertId, `Appartment "${name}" angelegt.`]
    );

    return getApartmentById(result.insertId);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      throw createError("Dieses Appartment existiert in dem Gebäude bereits.", 409);
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      throw createError("Das ausgewählte Gebäude existiert nicht.", 400);
    }

    throw error;
  }
}

async function getApartmentById(id) {
  const [[apartment]] = await pool.execute(
    `
      SELECT
        id,
        building_id AS buildingId,
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
        'apartment' AS targetType,
        a.id AS targetId,
        CONCAT(b.name, ' / ', a.name) AS label,
        CONCAT('Appartment ', a.apartment_number, COALESCE(CONCAT(' - ', a.floor), '')) AS subtitle,
        1 AS sortOrder
      FROM apartments a
      INNER JOIN buildings b ON b.id = a.building_id

      UNION ALL

      SELECT
        'building' AS targetType,
        b.id AS targetId,
        b.name AS label,
        COALESCE(b.address, 'Gebäude ohne Appartments') AS subtitle,
        2 AS sortOrder
      FROM buildings b
      WHERE NOT EXISTS (
        SELECT 1
        FROM apartments a
        WHERE a.building_id = b.id
      )

      UNION ALL

      SELECT
        'asset' AS targetType,
        a.id AS targetId,
        a.name AS label,
        CONCAT(a.asset_type, ' - ', a.location) AS subtitle,
        3 AS sortOrder
      FROM assets a
    ) targets
    ORDER BY sortOrder ASC, label ASC
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
  const intervalDays = Number(input.intervalDays);

  if (!title || !targetType || !targetId || !intervalDays || !input.nextDueOn) {
    throw createError("Titel, Objekt, Intervall und Fälligkeit sind Pflichtfelder.", 400);
  }

  if (intervalDays < 1) {
    throw createError("Das Intervall muss mindestens 1 Tag betragen.", 400);
  }

  await assertMaintenanceTarget(targetType, targetId);

  const assetId = targetType === "asset" ? targetId : null;
  const [result] = await pool.execute(
    `
      INSERT INTO maintenance_plans (asset_id, target_type, target_id, title, interval_days, last_done_on, next_due_on)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      assetId,
      targetType,
      targetId,
      title,
      intervalDays,
      input.lastDoneOn || null,
      input.nextDueOn
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
      WHERE mp.id = ?
    `,
    [id]
  );
  return plan;
}

async function getCalendarEvents(startDate, endDate) {
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
      WHERE mp.active = TRUE
        AND mp.next_due_on BETWEEN ? AND ?
      ORDER BY mp.next_due_on ASC, mp.title ASC
    `,
    [startDate, endDate]
  );

  return rows;
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
  const name = input.name?.trim();
  const assetType = input.assetType?.trim();
  const location = input.location?.trim();
  const serialNumber = input.serialNumber?.trim() || null;
  const criticality = input.criticality || "medium";
  const allowedCriticalities = new Set(["low", "medium", "high", "critical"]);

  if (!name || !assetType || !location) {
    throw createError("Name, Typ und Standort sind Pflichtfelder.", 400);
  }

  if (!allowedCriticalities.has(criticality)) {
    throw createError("Ungültige Kritikalität.", 400);
  }

  const [result] = await pool.execute(
    `
      INSERT INTO assets (name, asset_type, location, serial_number, criticality)
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      name,
      assetType,
      location,
      serialNumber,
      criticality
    ]
  );

  await pool.execute(
    "INSERT INTO activity_log (entity_type, entity_id, message) VALUES ('asset', ?, ?)",
    [result.insertId, `Wartungsobjekt "${name}" angelegt.`]
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
  authenticateUser,
  createSession,
  getUserBySessionToken,
  deleteSession,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  listProperties,
  createBuilding,
  deleteBuilding,
  createApartment,
  deleteApartment,
  listMaintenanceTargets,
  createMaintenancePlan,
  deleteMaintenancePlan,
  getCalendarEvents,
  listAssets,
  createAsset,
  deleteAsset,
  listWorkOrders,
  createWorkOrder,
  updateWorkOrderStatus
};
