const path = require("path");
const express = require("express");
const db = require("./db");
const { APP_VERSION } = require("./version");

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

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

app.get("/api/summary", asyncRoute(async (_req, res) => {
  res.json(await db.getDashboardSummary());
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

app.get("/api/properties", asyncRoute(async (_req, res) => {
  res.json(await db.listProperties());
}));

app.post("/api/buildings", asyncRoute(async (req, res) => {
  requireFields(req.body, ["name"]);
  const building = await db.createBuilding(req.body);
  res.status(201).json(building);
}));

app.post("/api/apartments", asyncRoute(async (req, res) => {
  requireFields(req.body, ["buildingId", "apartmentNumber", "name"]);
  const apartment = await db.createApartment(req.body);
  res.status(201).json(apartment);
}));

app.get("/api/maintenance-targets", asyncRoute(async (_req, res) => {
  res.json(await db.listMaintenanceTargets());
}));

app.post("/api/maintenance-plans", asyncRoute(async (req, res) => {
  requireFields(req.body, ["title", "targetType", "targetId", "intervalDays", "nextDueOn"]);
  const maintenancePlan = await db.createMaintenancePlan(req.body);
  res.status(201).json(maintenancePlan);
}));

app.get("/api/calendar", asyncRoute(async (req, res) => {
  requireFields(req.query, ["start", "end"]);
  res.json(await db.getCalendarEvents(req.query.start, req.query.end));
}));

app.get("/api/assets", asyncRoute(async (_req, res) => {
  res.json(await db.listAssets());
}));

app.post("/api/assets", asyncRoute(async (req, res) => {
  requireFields(req.body, ["name", "assetType", "location"]);
  const asset = await db.createAsset(req.body);
  res.status(201).json(asset);
}));

app.get("/api/work-orders", asyncRoute(async (_req, res) => {
  res.json(await db.listWorkOrders());
}));

app.post("/api/work-orders", asyncRoute(async (req, res) => {
  requireFields(req.body, ["title", "dueDate"]);
  const workOrder = await db.createWorkOrder(req.body);
  res.status(201).json(workOrder);
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
