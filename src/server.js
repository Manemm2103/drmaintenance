const path = require("path");
const express = require("express");
const db = require("./db");
const { APP_VERSION } = require("./version");

const app = express();
const port = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "..", "public");
const sessionCookieName = "drmaintenance_session";

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function requireFields(body, fields) {
  const missing = fields.filter((field) => !body[field]);
  if (missing.length > 0) {
    const error = new Error(`Pflichtfelder fehlen: ${missing.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
}

function createError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return header.split(";").reduce((cookies, part) => {
    const [name, ...valueParts] = part.trim().split("=");
    if (!name) {
      return cookies;
    }

    try {
      cookies[name] = decodeURIComponent(valueParts.join("="));
    } catch (_error) {
      cookies[name] = valueParts.join("=");
    }
    return cookies;
  }, {});
}

function getSessionToken(req) {
  return parseCookies(req)[sessionCookieName];
}

function shouldUseSecureCookie() {
  return process.env.COOKIE_SECURE === "true";
}

function buildSessionCookie(token, maxAgeSeconds) {
  const parts = [
    `${sessionCookieName}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax"
  ];

  if (maxAgeSeconds) {
    parts.push(`Max-Age=${maxAgeSeconds}`);
  }

  if (shouldUseSecureCookie()) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

function buildClearSessionCookie() {
  const parts = [
    `${sessionCookieName}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0"
  ];

  if (shouldUseSecureCookie()) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

async function getCurrentUser(req) {
  return db.getUserBySessionToken(getSessionToken(req));
}

async function requireAuth(req, res, next) {
  const user = await getCurrentUser(req);
  if (!user) {
    if (req.originalUrl.startsWith("/api/")) {
      res.status(401).json({ error: "Bitte anmelden." });
      return;
    }

    res.redirect("/login");
    return;
  }

  req.user = user;
  next();
}

app.get("/styles.css", (_req, res) => {
  res.sendFile(path.join(publicDir, "styles.css"));
});

app.get("/logo.png", (_req, res) => {
  res.sendFile(path.join(publicDir, "logo.png"));
});

app.get("/login.js", (_req, res) => {
  res.sendFile(path.join(publicDir, "login.js"));
});

app.get("/login", asyncRoute(async (req, res) => {
  const user = await getCurrentUser(req);
  if (user) {
    res.redirect("/");
    return;
  }

  res.sendFile(path.join(publicDir, "login.html"));
}));

app.get("/login.html", asyncRoute(async (req, res) => {
  const user = await getCurrentUser(req);
  if (user) {
    res.redirect("/");
    return;
  }

  res.sendFile(path.join(publicDir, "login.html"));
}));

app.get(["/", "/index.html"], asyncRoute(async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) {
    res.redirect("/login");
    return;
  }

  res.sendFile(path.join(publicDir, "index.html"));
}));

app.get("/app.js", asyncRoute(requireAuth), (_req, res) => {
  res.sendFile(path.join(publicDir, "app.js"));
});

app.get("/api/health", asyncRoute(async (_req, res) => {
  await db.pool.query("SELECT 1");
  res.json({
    status: "ok",
    service: "drmaintenance",
    version: APP_VERSION,
    database: "connected"
  });
}));

app.get("/api/version", (_req, res) => {
  res.json({
    version: APP_VERSION
  });
});

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  requireFields(req.body, ["username", "password"]);

  const user = await db.authenticateUser(req.body.username, req.body.password);
  if (!user) {
    throw createError("Benutzername oder Passwort ist falsch.", 401);
  }

  const session = await db.createSession(user.id, Boolean(req.body.remember));
  res.setHeader("Set-Cookie", buildSessionCookie(session.token, session.maxAgeSeconds));
  res.json({
    authenticated: true,
    user
  });
}));

app.post("/api/auth/logout", asyncRoute(async (req, res) => {
  await db.deleteSession(getSessionToken(req));
  res.setHeader("Set-Cookie", buildClearSessionCookie());
  res.json({ loggedOut: true });
}));

app.get("/api/auth/me", asyncRoute(async (req, res) => {
  const user = await getCurrentUser(req);
  res.json({
    authenticated: Boolean(user),
    user
  });
}));

app.use("/api", asyncRoute(requireAuth));

app.get("/api/summary", asyncRoute(async (_req, res) => {
  res.json(await db.getDashboardSummary());
}));

app.get("/api/settings", asyncRoute(async (_req, res) => {
  res.json(await db.getAppSettings());
}));

app.patch("/api/settings", asyncRoute(async (req, res) => {
  res.json(await db.updateAppSettings(req.body));
}));

app.get("/api/users", asyncRoute(async (_req, res) => {
  res.json(await db.listUsers());
}));

app.post("/api/users", asyncRoute(async (req, res) => {
  requireFields(req.body, ["username", "displayName", "password"]);
  const user = await db.createUser(req.body);
  res.status(201).json(user);
}));

app.patch("/api/users/:id", asyncRoute(async (req, res) => {
  const user = await db.updateUser(Number(req.params.id), req.body);
  res.json(user);
}));

app.delete("/api/users/:id", asyncRoute(async (req, res) => {
  res.json(await db.deleteUser(Number(req.params.id)));
}));

app.get("/api/employees", asyncRoute(async (_req, res) => {
  res.json(await db.listEmployees());
}));

app.post("/api/employees", asyncRoute(async (req, res) => {
  const employee = await db.createEmployee(req.body);
  res.status(201).json(employee);
}));

app.patch("/api/employees/:id", asyncRoute(async (req, res) => {
  res.json(await db.updateEmployee(Number(req.params.id), req.body));
}));

app.delete("/api/employees/:id", asyncRoute(async (req, res) => {
  res.json(await db.deleteEmployee(Number(req.params.id)));
}));

app.get("/api/employee-functions", asyncRoute(async (_req, res) => {
  res.json(await db.listEmployeeFunctions());
}));

app.post("/api/employee-functions", asyncRoute(async (req, res) => {
  requireFields(req.body, ["name"]);
  const employeeFunction = await db.createEmployeeFunction(req.body);
  res.status(201).json(employeeFunction);
}));

app.patch("/api/employee-functions/:id", asyncRoute(async (req, res) => {
  requireFields(req.body, ["name"]);
  res.json(await db.updateEmployeeFunction(Number(req.params.id), req.body));
}));

app.delete("/api/employee-functions/:id", asyncRoute(async (req, res) => {
  res.json(await db.deleteEmployeeFunction(Number(req.params.id)));
}));

app.get("/api/customers", asyncRoute(async (_req, res) => {
  res.json(await db.listCustomers());
}));

app.post("/api/customers", asyncRoute(async (req, res) => {
  const customer = await db.createCustomer(req.body);
  res.status(201).json(customer);
}));

app.patch("/api/customers/:id", asyncRoute(async (req, res) => {
  res.json(await db.updateCustomer(Number(req.params.id), req.body));
}));

app.delete("/api/customers/:id", asyncRoute(async (req, res) => {
  res.json(await db.deleteCustomer(Number(req.params.id)));
}));

app.get("/api/user-roles", asyncRoute(async (_req, res) => {
  res.json(await db.listUserRoles());
}));

app.post("/api/user-roles", asyncRoute(async (req, res) => {
  requireFields(req.body, ["name"]);
  const userRole = await db.createUserRole(req.body);
  res.status(201).json(userRole);
}));

app.patch("/api/user-roles/:roleKey", asyncRoute(async (req, res) => {
  requireFields(req.body, ["name"]);
  res.json(await db.updateUserRole(req.params.roleKey, req.body));
}));

app.delete("/api/user-roles/:roleKey", asyncRoute(async (req, res) => {
  res.json(await db.deleteUserRole(req.params.roleKey));
}));

app.get("/api/properties", asyncRoute(async (_req, res) => {
  res.json(await db.listProperties());
}));

app.post("/api/buildings", asyncRoute(async (req, res) => {
  requireFields(req.body, ["name"]);
  const building = await db.createBuilding(req.body);
  res.status(201).json(building);
}));

app.patch("/api/buildings/:id", asyncRoute(async (req, res) => {
  requireFields(req.body, ["name"]);
  res.json(await db.updateBuilding(Number(req.params.id), req.body));
}));

app.delete("/api/buildings/:id", asyncRoute(async (req, res) => {
  res.json(await db.deleteBuilding(Number(req.params.id)));
}));

app.post("/api/apartments", asyncRoute(async (req, res) => {
  requireFields(req.body, ["buildingId", "apartmentNumber", "name"]);
  const apartment = await db.createApartment(req.body);
  res.status(201).json(apartment);
}));

app.patch("/api/apartments/:id", asyncRoute(async (req, res) => {
  requireFields(req.body, ["buildingId", "apartmentNumber", "name"]);
  res.json(await db.updateApartment(Number(req.params.id), req.body));
}));

app.delete("/api/apartments/:id", asyncRoute(async (req, res) => {
  res.json(await db.deleteApartment(Number(req.params.id)));
}));

app.get("/api/maintenance-targets", asyncRoute(async (_req, res) => {
  res.json(await db.listMaintenanceTargets());
}));

app.post("/api/maintenance-plans", asyncRoute(async (req, res) => {
  requireFields(req.body, ["targetType", "targetId", "intervalDays", "nextDueOn"]);
  const maintenancePlan = await db.createMaintenancePlan(req.body);
  res.status(201).json(maintenancePlan);
}));

app.patch("/api/maintenance-plans/:id", asyncRoute(async (req, res) => {
  requireFields(req.body, ["targetType", "targetId", "intervalDays", "nextDueOn"]);
  res.json(await db.updateMaintenancePlan(Number(req.params.id), req.body));
}));

app.delete("/api/maintenance-plans/:id", asyncRoute(async (req, res) => {
  res.json(await db.deleteMaintenancePlan(Number(req.params.id)));
}));

app.get("/api/calendar", asyncRoute(async (req, res) => {
  requireFields(req.query, ["start", "end"]);
  res.json(await db.getCalendarEvents(req.query.start, req.query.end));
}));

app.get("/api/assets", asyncRoute(async (_req, res) => {
  res.json(await db.listAssets());
}));

app.get("/api/assets/by-qr/:qrCode", asyncRoute(async (req, res) => {
  res.json(await db.getAssetDetailsByQrCode(req.params.qrCode));
}));

app.get("/api/assets/:id/details", asyncRoute(async (req, res) => {
  res.json(await db.getAssetDetails(Number(req.params.id)));
}));

app.post("/api/assets", asyncRoute(async (req, res) => {
  requireFields(req.body, ["name", "assetType", "location"]);
  const asset = await db.createAsset(req.body);
  res.status(201).json(asset);
}));

app.patch("/api/assets/:id", asyncRoute(async (req, res) => {
  requireFields(req.body, ["name", "assetType", "location"]);
  res.json(await db.updateAsset(Number(req.params.id), req.body));
}));

app.delete("/api/assets/:id", asyncRoute(async (req, res) => {
  res.json(await db.deleteAsset(Number(req.params.id)));
}));

app.post("/api/assets/:id/checks", asyncRoute(async (req, res) => {
  requireFields(req.body, ["label"]);
  res.status(201).json(await db.createAssetCheck(Number(req.params.id), req.body));
}));

app.delete("/api/asset-checks/:id", asyncRoute(async (req, res) => {
  res.json(await db.deleteAssetCheck(Number(req.params.id)));
}));

app.get("/api/work-orders", asyncRoute(async (req, res) => {
  res.json(await db.listWorkOrders(req.query.filter));
}));

app.get("/api/work-orders/:id", asyncRoute(async (req, res) => {
  res.json(await db.getWorkOrderById(Number(req.params.id)));
}));

app.post("/api/work-orders", asyncRoute(async (req, res) => {
  requireFields(req.body, ["title", "dueDate"]);
  const workOrder = await db.createWorkOrder(req.body);
  res.status(201).json(workOrder);
}));

app.patch("/api/work-orders/:id", asyncRoute(async (req, res) => {
  res.json(await db.updateWorkOrder(Number(req.params.id), req.body));
}));

app.patch("/api/work-orders/:id/checks/:checkId", asyncRoute(async (req, res) => {
  res.json(await db.updateWorkOrderCheck(Number(req.params.id), Number(req.params.checkId), req.body.checked));
}));

app.patch("/api/work-orders/:id/status", asyncRoute(async (req, res) => {
  requireFields(req.body, ["status"]);
  const workOrder = await db.updateWorkOrderStatus(Number(req.params.id), req.body.status);
  res.json(workOrder);
}));

app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    error: err.message || "Interner Fehler"
  });
});

async function bootstrap() {
  await db.waitForDatabase();
  await db.runMigrations();

  app.listen(port, () => {
    console.log(`DR Maintenance listens on port ${port}`);
  });
}

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error("Startup failed", error);
    process.exit(1);
  });
}

module.exports = app;
