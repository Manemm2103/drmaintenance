const els = {
  connectionStatus: document.querySelector("#connectionStatus"),
  appVersion: document.querySelector("#appVersion"),
  currentUser: document.querySelector("#currentUser"),
  logoutButton: document.querySelector("#logoutButton"),
  assetCount: document.querySelector("#assetCount"),
  planCount: document.querySelector("#planCount"),
  orderCount: document.querySelector("#orderCount"),
  overdueCount: document.querySelector("#overdueCount"),
  userCount: document.querySelector("#userCount"),
  workOrderRows: document.querySelector("#workOrderRows"),
  assetList: document.querySelector("#assetList"),
  planList: document.querySelector("#planList"),
  activityList: document.querySelector("#activityList"),
  userList: document.querySelector("#userList"),
  propertyList: document.querySelector("#propertyList"),
  assetSelect: document.querySelector("#assetSelect"),
  apartmentBuildingSelect: document.querySelector("#apartmentBuildingSelect"),
  maintenanceTargetSelect: document.querySelector("#maintenanceTargetSelect"),
  maintenanceDueDate: document.querySelector("#maintenanceDueDate"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarMonthLabel: document.querySelector("#calendarMonthLabel"),
  prevMonthButton: document.querySelector("#prevMonthButton"),
  nextMonthButton: document.querySelector("#nextMonthButton"),
  refreshButton: document.querySelector("#refreshButton"),
  workOrderForm: document.querySelector("#workOrderForm"),
  maintenanceForm: document.querySelector("#maintenanceForm"),
  buildingForm: document.querySelector("#buildingForm"),
  apartmentForm: document.querySelector("#apartmentForm"),
  userForm: document.querySelector("#userForm"),
  toast: document.querySelector("#toast")
};

const priorityLabels = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
  critical: "Kritisch"
};

const statusLabels = {
  open: "Offen",
  planned: "Geplant",
  in_progress: "In Arbeit",
  done: "Erledigt"
};

const roleLabels = {
  admin: "Admin",
  manager: "Manager",
  technician: "Techniker",
  viewer: "Leser"
};

const buildingTypeLabels = {
  private_house: "Privathaus",
  multi_family: "Mehrfamilienhaus",
  commercial: "Gewerbe",
  other: "Sonstiges"
};

let visibleMonth = startOfMonth(new Date());

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (response.status === 401) {
    window.location.href = "/login";
    throw new Error("Bitte anmelden.");
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Anfrage fehlgeschlagen");
  }

  return response.json();
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getCalendarRange() {
  const start = startOfMonth(visibleMonth);
  const end = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);

  return {
    start: toDateKey(start),
    end: toDateKey(end)
  };
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 2400);
}

function setConnectionStatus(ok) {
  els.connectionStatus.textContent = ok ? "Datenbank verbunden" : "Keine Verbindung";
  document.querySelector(".status-dot").style.background = ok ? "#050505" : "#777777";
}

async function loadAppVersion() {
  try {
    const payload = await api("/api/version");
    els.appVersion.textContent = `Version ${payload.version}`;
  } catch (_error) {
    els.appVersion.textContent = "Version unbekannt";
  }
}

async function loadCurrentUser() {
  const payload = await api("/api/auth/me");
  if (!payload.authenticated) {
    window.location.href = "/login";
    return;
  }

  els.currentUser.textContent = `${payload.user.displayName} · ${roleLabels[payload.user.role] || payload.user.role}`;
}

function renderSummary(payload) {
  const { summary, workOrders, assets, plans, activity, users } = payload;

  els.assetCount.textContent = summary.assetCount;
  els.planCount.textContent = summary.activePlanCount;
  els.orderCount.textContent = summary.openWorkOrderCount;
  els.overdueCount.textContent = summary.overdueCount;
  els.userCount.textContent = summary.activeUserCount;

  renderWorkOrders(workOrders);
  renderAssets(assets);
  renderPlans(plans);
  renderActivity(activity);
  renderUsers(users);
  renderAssetOptions(assets);
}

function renderWorkOrders(workOrders) {
  if (workOrders.length === 0) {
    els.workOrderRows.innerHTML = '<tr><td colspan="6">Keine offenen Auftraege.</td></tr>';
    return;
  }

  els.workOrderRows.innerHTML = workOrders.map((order) => `
    <tr>
      <td>
        <strong>${escapeHtml(order.title)}</strong>
        <div class="muted">${escapeHtml(order.description || "Keine Beschreibung")}</div>
      </td>
      <td>
        ${escapeHtml(order.assetName || "Ohne Anlage")}
        <div class="muted">${escapeHtml(order.location || "")}</div>
      </td>
      <td>${formatDate(order.dueDate)}</td>
      <td><span class="badge">${statusLabels[order.status] || order.status}</span></td>
      <td><span class="badge ${order.priority === "critical" ? "light" : ""}">${priorityLabels[order.priority] || order.priority}</span></td>
      <td>
        <button class="compact-button" type="button" title="Als erledigt markieren" aria-label="Als erledigt markieren" data-complete="${order.id}">OK</button>
      </td>
    </tr>
  `).join("");
}

function renderAssets(assets) {
  els.assetList.innerHTML = assets.map((asset) => `
    <div class="list-item">
      <strong>${escapeHtml(asset.name)}</strong>
      <div class="list-meta">
        <span>${escapeHtml(asset.assetType)}</span>
        <span>${escapeHtml(asset.location)}</span>
        <span>${priorityLabels[asset.criticality] || asset.criticality}</span>
      </div>
    </div>
  `).join("");
}

function renderPlans(plans) {
  if (!plans || plans.length === 0) {
    els.planList.innerHTML = '<div class="list-item">Keine Wartungsplaene.</div>';
    return;
  }

  els.planList.innerHTML = plans.map((plan) => `
    <div class="list-item">
      <strong>${escapeHtml(plan.title)}</strong>
      <div class="list-meta">
        <span>${escapeHtml(plan.targetName || "Kein Objekt")}</span>
        <span>${escapeHtml(plan.targetSubtitle || "")}</span>
        <span>${formatDate(plan.nextDueOn)}</span>
        <span>${plan.intervalDays} Tage</span>
      </div>
    </div>
  `).join("");
}

function renderActivity(activity) {
  els.activityList.innerHTML = activity.map((entry) => `
    <div class="timeline-item">
      <strong>${escapeHtml(entry.message)}</strong>
      <span class="muted">${formatDate(entry.createdAt)}</span>
    </div>
  `).join("");
}

function renderUsers(users) {
  if (!users || users.length === 0) {
    els.userList.innerHTML = '<div class="list-item">Keine Benutzer angelegt.</div>';
    return;
  }

  els.userList.innerHTML = users.map((user) => `
    <div class="user-item">
      <div>
        <strong>${escapeHtml(user.displayName)}</strong>
        <div class="list-meta">
          <span>@${escapeHtml(user.username)}</span>
          <span>${escapeHtml(user.email || "Keine E-Mail")}</span>
          <span>${roleLabels[user.role] || user.role}</span>
          <span>${Number(user.active) === 1 ? "Aktiv" : "Inaktiv"}</span>
        </div>
      </div>
      <div class="user-actions">
        ${Number(user.isSystem) === 1
          ? '<span class="system-note">Systemadmin</span>'
          : `<button class="compact-button" type="button" title="Benutzer loeschen" aria-label="Benutzer loeschen" data-delete-user="${user.id}">X</button>`
        }
      </div>
    </div>
  `).join("");
}

function renderProperties(properties) {
  renderApartmentBuildingOptions(properties);

  if (!properties || properties.length === 0) {
    els.propertyList.innerHTML = '<div class="list-item">Keine Objekte angelegt.</div>';
    return;
  }

  els.propertyList.innerHTML = properties.map((building) => `
    <div class="property-card">
      <div>
        <strong>${escapeHtml(building.name)}</strong>
        <div class="list-meta">
          <span>${buildingTypeLabels[building.buildingType] || building.buildingType}</span>
          <span>${escapeHtml(building.address || "Keine Adresse")}</span>
          <span>${building.apartments.length === 0 ? "Als Wartungsobjekt verfuegbar" : `${building.apartments.length} Appartments`}</span>
        </div>
      </div>
      ${building.apartments.length === 0
        ? '<span class="badge light">Gebaeude ohne Appartments</span>'
        : `<div class="apartment-list">
            ${building.apartments.map((apartment) => `
              <div class="apartment-chip">
                <span>${escapeHtml(apartment.name)}</span>
                <span class="muted">${escapeHtml(apartment.apartmentNumber)}${apartment.floor ? ` - ${escapeHtml(apartment.floor)}` : ""}</span>
              </div>
            `).join("")}
          </div>`
      }
    </div>
  `).join("");
}

function renderCalendar(events) {
  const monthLabel = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric"
  }).format(visibleMonth);
  els.calendarMonthLabel.textContent = monthLabel;

  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const leadingEmptyDays = (firstDay.getDay() + 6) % 7;
  const todayKey = toDateKey(new Date());
  const eventsByDate = groupEventsByDate(events);
  const cells = [];

  for (let index = 0; index < leadingEmptyDays; index += 1) {
    cells.push('<div class="calendar-day is-empty"></div>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
    const dateKey = toDateKey(date);
    const dayEvents = eventsByDate.get(dateKey) || [];

    cells.push(`
      <button class="calendar-day ${dateKey === todayKey ? "is-today" : ""}" type="button" data-calendar-day="${dateKey}">
        <span class="calendar-date">${day}</span>
        ${dayEvents.slice(0, 3).map((event) => `
          <span class="calendar-event" title="${escapeHtml(event.title)}">
            ${escapeHtml(event.title)}
            <small>${escapeHtml(event.targetName || "Kein Objekt")}</small>
          </span>
        `).join("")}
        ${dayEvents.length > 3 ? `<span class="muted">+${dayEvents.length - 3} weitere</span>` : ""}
      </button>
    `);
  }

  els.calendarGrid.innerHTML = cells.join("");
}

function groupEventsByDate(events) {
  return events.reduce((groups, event) => {
    const list = groups.get(event.dueDate) || [];
    list.push(event);
    groups.set(event.dueDate, list);
    return groups;
  }, new Map());
}

function renderAssetOptions(assets) {
  const currentValue = els.assetSelect.value;
  els.assetSelect.innerHTML = '<option value="">Ohne Anlage</option>' + assets.map((asset) => (
    `<option value="${asset.id}">${escapeHtml(asset.name)}</option>`
  )).join("");
  els.assetSelect.value = currentValue;
}

function renderApartmentBuildingOptions(properties) {
  const currentValue = els.apartmentBuildingSelect.value;
  els.apartmentBuildingSelect.innerHTML = '<option value="">Gebaeude auswaehlen</option>' + properties.map((building) => (
    `<option value="${building.id}">${escapeHtml(building.name)}</option>`
  )).join("");
  els.apartmentBuildingSelect.value = currentValue;
}

function renderMaintenanceTargetOptions(targets) {
  const currentValue = els.maintenanceTargetSelect.value;
  els.maintenanceTargetSelect.innerHTML = '<option value="">Objekt auswaehlen</option>' + targets.map((target) => (
    `<option value="${target.targetType}:${target.targetId}">${escapeHtml(target.label)} - ${escapeHtml(target.subtitle || "")}</option>`
  )).join("");
  els.maintenanceTargetSelect.value = currentValue;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadDashboard() {
  try {
    const range = getCalendarRange();
    const [summary, properties, targets, calendarEvents] = await Promise.all([
      api("/api/summary"),
      api("/api/properties"),
      api("/api/maintenance-targets"),
      api(`/api/calendar?start=${range.start}&end=${range.end}`)
    ]);

    renderSummary(summary);
    renderProperties(properties);
    renderMaintenanceTargetOptions(targets);
    renderCalendar(calendarEvents);
    setConnectionStatus(true);
  } catch (error) {
    setConnectionStatus(false);
    showToast(error.message);
  }
}

async function completeWorkOrder(id) {
  await api(`/api/work-orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "done" })
  });
  showToast("Auftrag erledigt.");
  await loadDashboard();
}

async function deleteUser(id) {
  await api(`/api/users/${id}`, {
    method: "DELETE"
  });
  showToast("Benutzer geloescht.");
  await loadDashboard();
}

async function logout() {
  await api("/api/auth/logout", {
    method: "POST",
    body: JSON.stringify({})
  });
  window.location.href = "/login";
}

function setMaintenanceDate(dateKey) {
  els.maintenanceDueDate.value = dateKey;
  document.querySelector("#new-maintenance").scrollIntoView({ behavior: "smooth" });
  showToast(`Wartung fuer ${formatDate(dateKey)} vorbereiten.`);
}

function parseTargetValue(value) {
  const [targetType, targetId] = value.split(":");
  return {
    targetType,
    targetId: Number(targetId)
  };
}

function bindEvents() {
  els.refreshButton.addEventListener("click", loadDashboard);
  els.logoutButton.addEventListener("click", () => {
    logout().catch((error) => showToast(error.message));
  });

  els.prevMonthButton.addEventListener("click", () => {
    visibleMonth = addMonths(visibleMonth, -1);
    loadDashboard();
  });

  els.nextMonthButton.addEventListener("click", () => {
    visibleMonth = addMonths(visibleMonth, 1);
    loadDashboard();
  });

  document.addEventListener("click", (event) => {
    const scrollTarget = event.target.closest("[data-scroll-target]");
    if (scrollTarget) {
      document.querySelector(`#${scrollTarget.dataset.scrollTarget}`)?.scrollIntoView({ behavior: "smooth" });
    }

    const calendarDay = event.target.closest("[data-calendar-day]");
    if (calendarDay) {
      setMaintenanceDate(calendarDay.dataset.calendarDay);
    }

    const completeButton = event.target.closest("[data-complete]");
    if (completeButton) {
      completeWorkOrder(completeButton.dataset.complete).catch((error) => showToast(error.message));
    }

    const deleteUserButton = event.target.closest("[data-delete-user]");
    if (deleteUserButton) {
      deleteUser(deleteUserButton.dataset.deleteUser).catch((error) => showToast(error.message));
    }
  });

  els.workOrderForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.workOrderForm));

    await api("/api/work-orders", {
      method: "POST",
      body: JSON.stringify({
        title: data.title,
        assetId: data.assetId ? Number(data.assetId) : null,
        priority: data.priority,
        dueDate: data.dueDate,
        description: data.description
      })
    });

    els.workOrderForm.reset();
    showToast("Auftrag gespeichert.");
    await loadDashboard();
  });

  els.maintenanceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.maintenanceForm));
    const target = parseTargetValue(data.target);

    await api("/api/maintenance-plans", {
      method: "POST",
      body: JSON.stringify({
        title: data.title,
        targetType: target.targetType,
        targetId: target.targetId,
        intervalDays: Number(data.intervalDays),
        nextDueOn: data.nextDueOn
      })
    });

    els.maintenanceForm.reset();
    showToast("Wartung gespeichert.");
    await loadDashboard();
  });

  els.buildingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.buildingForm));

    await api("/api/buildings", {
      method: "POST",
      body: JSON.stringify({
        name: data.name,
        address: data.address,
        buildingType: data.buildingType
      })
    });

    els.buildingForm.reset();
    showToast("Gebaeude angelegt.");
    await loadDashboard();
  });

  els.apartmentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.apartmentForm));

    await api("/api/apartments", {
      method: "POST",
      body: JSON.stringify({
        buildingId: Number(data.buildingId),
        apartmentNumber: data.apartmentNumber,
        name: data.name,
        floor: data.floor
      })
    });

    els.apartmentForm.reset();
    showToast("Appartment angelegt.");
    await loadDashboard();
  });

  els.userForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.userForm));

    await api("/api/users", {
      method: "POST",
      body: JSON.stringify({
        username: data.username,
        displayName: data.displayName,
        email: data.email,
        role: data.role,
        password: data.password
      })
    });

    els.userForm.reset();
    showToast("Benutzer angelegt.");
    await loadDashboard();
  });
}

bindEvents();
loadAppVersion();
loadCurrentUser().catch(() => {
  window.location.href = "/login";
});
loadDashboard();
