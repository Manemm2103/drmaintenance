const els = {
  connectionStatus: document.querySelector("#connectionStatus"),
  assetCount: document.querySelector("#assetCount"),
  planCount: document.querySelector("#planCount"),
  orderCount: document.querySelector("#orderCount"),
  overdueCount: document.querySelector("#overdueCount"),
  workOrderRows: document.querySelector("#workOrderRows"),
  assetList: document.querySelector("#assetList"),
  planList: document.querySelector("#planList"),
  activityList: document.querySelector("#activityList"),
  assetSelect: document.querySelector("#assetSelect"),
  refreshButton: document.querySelector("#refreshButton"),
  workOrderForm: document.querySelector("#workOrderForm"),
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

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

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

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 2400);
}

function setConnectionStatus(ok) {
  els.connectionStatus.textContent = ok ? "Datenbank verbunden" : "Keine Verbindung";
  document.querySelector(".status-dot").style.background = ok ? "#f7f7f7" : "#777777";
}

function renderSummary(payload) {
  const { summary, workOrders, assets, plans, activity } = payload;

  els.assetCount.textContent = summary.assetCount;
  els.planCount.textContent = summary.activePlanCount;
  els.orderCount.textContent = summary.openWorkOrderCount;
  els.overdueCount.textContent = summary.overdueCount;

  renderWorkOrders(workOrders);
  renderAssets(assets);
  renderPlans(plans);
  renderActivity(activity);
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
  els.planList.innerHTML = plans.map((plan) => `
    <div class="list-item">
      <strong>${escapeHtml(plan.title)}</strong>
      <div class="list-meta">
        <span>${escapeHtml(plan.assetName)}</span>
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

function renderAssetOptions(assets) {
  const currentValue = els.assetSelect.value;
  els.assetSelect.innerHTML = '<option value="">Ohne Anlage</option>' + assets.map((asset) => (
    `<option value="${asset.id}">${escapeHtml(asset.name)}</option>`
  )).join("");
  els.assetSelect.value = currentValue;
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
    const payload = await api("/api/summary");
    renderSummary(payload);
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

function bindEvents() {
  els.refreshButton.addEventListener("click", loadDashboard);

  document.addEventListener("click", (event) => {
    const scrollTarget = event.target.closest("[data-scroll-target]");
    if (scrollTarget) {
      document.querySelector(`#${scrollTarget.dataset.scrollTarget}`)?.scrollIntoView({ behavior: "smooth" });
    }

    const completeButton = event.target.closest("[data-complete]");
    if (completeButton) {
      completeWorkOrder(completeButton.dataset.complete).catch((error) => showToast(error.message));
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
}

bindEvents();
loadDashboard();
