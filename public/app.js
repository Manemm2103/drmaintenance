const els = {
  connectionStatus: document.querySelector("#connectionStatus"),
  appVersion: document.querySelector("#appVersion"),
  currentUser: document.querySelector("#currentUser"),
  logoutButton: document.querySelector("#logoutButton"),
  pageEyebrow: document.querySelector("#pageEyebrow"),
  pageTitle: document.querySelector("#pageTitle"),
  pageAction: document.querySelector("#pageAction"),
  pageActionLabel: document.querySelector("#pageActionLabel"),
  views: document.querySelectorAll("[data-view]"),
  viewLinks: document.querySelectorAll("[data-view-link]"),
  assetCount: document.querySelector("#assetCount"),
  planCount: document.querySelector("#planCount"),
  orderCount: document.querySelector("#orderCount"),
  overdueCount: document.querySelector("#overdueCount"),
  customerCount: document.querySelector("#customerCount"),
  workOrderList: document.querySelector("#workOrderList"),
  workOrderStatusFilter: document.querySelector("#workOrderStatusFilter"),
  workOrderResultCount: document.querySelector("#workOrderResultCount"),
  workOrderRefreshButton: document.querySelector("#workOrderRefreshButton"),
  workOrderDetailEmpty: document.querySelector("#workOrderDetailEmpty"),
  workOrderDetailForm: document.querySelector("#workOrderDetailForm"),
  workOrderIdInput: document.querySelector("#workOrderIdInput"),
  workOrderCheckList: document.querySelector("#workOrderCheckList"),
  workOrderDoneButton: document.querySelector("#workOrderDoneButton"),
  assetList: document.querySelector("#assetList"),
  assetSearchInput: document.querySelector("#assetSearchInput"),
  assetCustomerFilter: document.querySelector("#assetCustomerFilter"),
  assetAddressFilterInput: document.querySelector("#assetAddressFilterInput"),
  assetCriticalityFilter: document.querySelector("#assetCriticalityFilter"),
  assetFilterResetButton: document.querySelector("#assetFilterResetButton"),
  assetResultCount: document.querySelector("#assetResultCount"),
  planList: document.querySelector("#planList"),
  activityList: document.querySelector("#activityList"),
  customerList: document.querySelector("#customerList"),
  customerSearchInput: document.querySelector("#customerSearchInput"),
  customerAddressFilterInput: document.querySelector("#customerAddressFilterInput"),
  customerWeekdayFilter: document.querySelector("#customerWeekdayFilter"),
  customerFilterResetButton: document.querySelector("#customerFilterResetButton"),
  customerResultCount: document.querySelector("#customerResultCount"),
  employeeList: document.querySelector("#employeeList"),
  employeeFunctionList: document.querySelector("#employeeFunctionList"),
  userList: document.querySelector("#userList"),
  userRoleList: document.querySelector("#userRoleList"),
  propertyList: document.querySelector("#propertyList"),
  propertySearchInput: document.querySelector("#propertySearchInput"),
  propertyCustomerFilter: document.querySelector("#propertyCustomerFilter"),
  propertyAddressFilterInput: document.querySelector("#propertyAddressFilterInput"),
  propertyTypeFilter: document.querySelector("#propertyTypeFilter"),
  propertyFilterResetButton: document.querySelector("#propertyFilterResetButton"),
  propertyResultCount: document.querySelector("#propertyResultCount"),
  assetPropertyTargetSelect: document.querySelector("#assetPropertyTargetSelect"),
  apartmentBuildingSelect: document.querySelector("#apartmentBuildingSelect"),
  buildingCustomerSelect: document.querySelector("#buildingCustomerSelect"),
  apartmentCustomerSelect: document.querySelector("#apartmentCustomerSelect"),
  maintenanceTargetSelect: document.querySelector("#maintenanceTargetSelect"),
  maintenanceEmployeeSelect: document.querySelector("#maintenanceEmployeeSelect"),
  employeeFunctionSelect: document.querySelector("#employeeFunctionSelect"),
  userRoleSelect: document.querySelector("#userRoleSelect"),
  maintenanceDueDate: document.querySelector("#maintenanceDueDate"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarMonthLabel: document.querySelector("#calendarMonthLabel"),
  prevMonthButton: document.querySelector("#prevMonthButton"),
  nextMonthButton: document.querySelector("#nextMonthButton"),
  maintenanceForm: document.querySelector("#maintenanceForm"),
  maintenancePlanIdInput: document.querySelector("#maintenancePlanIdInput"),
  maintenanceSubmitButton: document.querySelector("#maintenanceSubmitButton"),
  maintenanceNewButton: document.querySelector("#maintenanceNewButton"),
  assetForm: document.querySelector("#assetForm"),
  assetIdInput: document.querySelector("#assetIdInput"),
  assetSubmitButton: document.querySelector("#assetSubmitButton"),
  assetNewButton: document.querySelector("#assetNewButton"),
  assetDetailPanel: document.querySelector("#assetDetailPanel"),
  assetCheckForm: document.querySelector("#assetCheckForm"),
  assetCheckAssetIdInput: document.querySelector("#assetCheckAssetIdInput"),
  assetCheckList: document.querySelector("#assetCheckList"),
  assetMaintenancePlanList: document.querySelector("#assetMaintenancePlanList"),
  assetOpenOrderList: document.querySelector("#assetOpenOrderList"),
  buildingForm: document.querySelector("#buildingForm"),
  buildingIdInput: document.querySelector("#buildingIdInput"),
  buildingSubmitButton: document.querySelector("#buildingSubmitButton"),
  buildingNewButton: document.querySelector("#buildingNewButton"),
  apartmentForm: document.querySelector("#apartmentForm"),
  apartmentIdInput: document.querySelector("#apartmentIdInput"),
  apartmentSubmitButton: document.querySelector("#apartmentSubmitButton"),
  apartmentNewButton: document.querySelector("#apartmentNewButton"),
  customerForm: document.querySelector("#customerForm"),
  customerIdInput: document.querySelector("#customerIdInput"),
  customerSubmitButton: document.querySelector("#customerSubmitButton"),
  customerNewButton: document.querySelector("#customerNewButton"),
  billingAddressDiffersInput: document.querySelector("#billingAddressDiffersInput"),
  billingFields: document.querySelector("#billingFields"),
  countrySelects: document.querySelectorAll("[data-country-select]"),
  employeeForm: document.querySelector("#employeeForm"),
  employeeIdInput: document.querySelector("#employeeIdInput"),
  employeeSubmitButton: document.querySelector("#employeeSubmitButton"),
  employeeNewButton: document.querySelector("#employeeNewButton"),
  employeeActiveInput: document.querySelector("#employeeActiveInput"),
  employeeFunctionForm: document.querySelector("#employeeFunctionForm"),
  employeeFunctionIdInput: document.querySelector("#employeeFunctionIdInput"),
  employeeFunctionSubmitButton: document.querySelector("#employeeFunctionSubmitButton"),
  employeeFunctionNewButton: document.querySelector("#employeeFunctionNewButton"),
  appSettingsForm: document.querySelector("#appSettingsForm"),
  skipSaturdaysForMaintenanceInput: document.querySelector("#skipSaturdaysForMaintenanceInput"),
  skipSundaysForMaintenanceInput: document.querySelector("#skipSundaysForMaintenanceInput"),
  userForm: document.querySelector("#userForm"),
  userRoleForm: document.querySelector("#userRoleForm"),
  userRoleKeyInput: document.querySelector("#userRoleKeyInput"),
  userRoleSubmitButton: document.querySelector("#userRoleSubmitButton"),
  userRoleNewButton: document.querySelector("#userRoleNewButton"),
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
  customer: "Kunde"
};

const buildingTypeLabels = {
  private_house: "Privathaus",
  multi_family: "Mehrfamilienhaus",
  commercial: "Gewerbe",
  other: "Sonstiges"
};

const maintenanceWeekdayFields = [
  { key: "maintenanceMonday", label: "Mo", defaultValue: true },
  { key: "maintenanceTuesday", label: "Di", defaultValue: true },
  { key: "maintenanceWednesday", label: "Mi", defaultValue: true },
  { key: "maintenanceThursday", label: "Do", defaultValue: true },
  { key: "maintenanceFriday", label: "Fr", defaultValue: true },
  { key: "maintenanceSaturday", label: "Sa", defaultValue: true },
  { key: "maintenanceSunday", label: "So", defaultValue: false }
];

const countryOptions = [
  "Deutschland",
  "Österreich",
  "Schweiz",
  "Afghanistan",
  "Ägypten",
  "Albanien",
  "Algerien",
  "Andorra",
  "Angola",
  "Antigua und Barbuda",
  "Äquatorialguinea",
  "Argentinien",
  "Armenien",
  "Aserbaidschan",
  "Äthiopien",
  "Australien",
  "Bahamas",
  "Bahrain",
  "Bangladesch",
  "Barbados",
  "Belgien",
  "Belize",
  "Benin",
  "Bhutan",
  "Bolivien",
  "Bosnien und Herzegowina",
  "Botsuana",
  "Brasilien",
  "Brunei",
  "Bulgarien",
  "Burkina Faso",
  "Burundi",
  "Chile",
  "China",
  "Costa Rica",
  "Dänemark",
  "Demokratische Republik Kongo",
  "Dominica",
  "Dominikanische Republik",
  "Dschibuti",
  "Ecuador",
  "El Salvador",
  "Elfenbeinküste",
  "Eritrea",
  "Estland",
  "Eswatini",
  "Fidschi",
  "Finnland",
  "Frankreich",
  "Gabun",
  "Gambia",
  "Georgien",
  "Ghana",
  "Grenada",
  "Griechenland",
  "Guatemala",
  "Guinea",
  "Guinea-Bissau",
  "Guyana",
  "Haiti",
  "Honduras",
  "Indien",
  "Indonesien",
  "Irak",
  "Iran",
  "Irland",
  "Island",
  "Israel",
  "Italien",
  "Jamaika",
  "Japan",
  "Jemen",
  "Jordanien",
  "Kambodscha",
  "Kamerun",
  "Kanada",
  "Kap Verde",
  "Kasachstan",
  "Katar",
  "Kenia",
  "Kirgisistan",
  "Kiribati",
  "Kolumbien",
  "Komoren",
  "Kongo",
  "Kosovo",
  "Kroatien",
  "Kuba",
  "Kuwait",
  "Laos",
  "Lesotho",
  "Lettland",
  "Libanon",
  "Liberia",
  "Libyen",
  "Liechtenstein",
  "Litauen",
  "Luxemburg",
  "Madagaskar",
  "Malawi",
  "Malaysia",
  "Malediven",
  "Mali",
  "Malta",
  "Marokko",
  "Marshallinseln",
  "Mauretanien",
  "Mauritius",
  "Mexiko",
  "Mikronesien",
  "Moldau",
  "Monaco",
  "Mongolei",
  "Montenegro",
  "Mosambik",
  "Myanmar",
  "Namibia",
  "Nauru",
  "Nepal",
  "Neuseeland",
  "Nicaragua",
  "Niederlande",
  "Niger",
  "Nigeria",
  "Nordkorea",
  "Nordmazedonien",
  "Norwegen",
  "Oman",
  "Pakistan",
  "Palau",
  "Palästina",
  "Panama",
  "Papua-Neuguinea",
  "Paraguay",
  "Peru",
  "Philippinen",
  "Polen",
  "Portugal",
  "Ruanda",
  "Rumänien",
  "Russland",
  "Salomonen",
  "Sambia",
  "Samoa",
  "San Marino",
  "São Tomé und Príncipe",
  "Saudi-Arabien",
  "Schweden",
  "Senegal",
  "Serbien",
  "Seychellen",
  "Sierra Leone",
  "Simbabwe",
  "Singapur",
  "Slowakei",
  "Slowenien",
  "Somalia",
  "Spanien",
  "Sri Lanka",
  "St. Kitts und Nevis",
  "St. Lucia",
  "St. Vincent und die Grenadinen",
  "Südafrika",
  "Sudan",
  "Südkorea",
  "Südsudan",
  "Suriname",
  "Syrien",
  "Tadschikistan",
  "Tansania",
  "Thailand",
  "Timor-Leste",
  "Togo",
  "Tonga",
  "Trinidad und Tobago",
  "Tschad",
  "Tschechien",
  "Tunesien",
  "Türkei",
  "Turkmenistan",
  "Tuvalu",
  "Uganda",
  "Ukraine",
  "Ungarn",
  "Uruguay",
  "Usbekistan",
  "Vanuatu",
  "Vatikanstadt",
  "Venezuela",
  "Vereinigte Arabische Emirate",
  "Vereinigte Staaten",
  "Vereinigtes Königreich",
  "Vietnam",
  "Weißrussland",
  "Zentralafrikanische Republik",
  "Zypern"
];

const allowedMaintenanceHtmlTags = new Set([
  "a",
  "br",
  "div",
  "em",
  "figcaption",
  "figure",
  "h3",
  "h4",
  "img",
  "li",
  "ol",
  "p",
  "span",
  "strong",
  "ul"
]);

const allowedMaintenanceHtmlAttributes = {
  a: new Set(["href", "target", "title"]),
  img: new Set(["alt", "height", "src", "title", "width"])
};

const viewConfig = {
  dashboard: {
    eyebrow: "Wartungsplaner",
    title: "Alles Wichtige auf einen Blick.",
    actionLabel: "Wartungsplan",
    actionTitle: "Neuen Wartungsplan erfassen",
    actionView: "planung",
    scrollTarget: "new-maintenance"
  },
  stammdaten: {
    eyebrow: "Stammdaten",
    title: "Globale Einstellungen verwalten.",
    actionLabel: "Stammdaten",
    actionTitle: "Stammdaten bearbeiten",
    actionView: "stammdaten",
    scrollTarget: "appSettingsForm"
  },
  kunden: {
    eyebrow: "Stammdaten",
    title: "Kunden verwalten.",
    actionLabel: "Kunde",
    actionTitle: "Neuen Kunden anlegen",
    actionView: "kunden",
    scrollTarget: "customerForm"
  },
  auftraege: {
    eyebrow: "Aufträge",
    title: "Offene und fällige Aufträge bearbeiten.",
    actionLabel: "Offene",
    actionTitle: "Offene Aufträge anzeigen",
    actionView: "auftraege",
    scrollTarget: "auftraege"
  },
  wartungsobjekte: {
    eyebrow: "Inventar",
    title: "Wartungsobjekte verwalten.",
    actionLabel: "Objekt",
    actionTitle: "Neues Wartungsobjekt erfassen",
    actionView: "wartungsobjekte",
    scrollTarget: "assetForm"
  },
  gebaeude: {
    eyebrow: "Gebäude",
    title: "Gebäude und Appartments verwalten.",
    actionLabel: "Gebäude",
    actionTitle: "Neues Gebäude erfassen",
    actionView: "gebaeude",
    scrollTarget: "buildingForm"
  },
  planung: {
    eyebrow: "Planung",
    title: "Wartungspläne verwalten.",
    actionLabel: "Wartungsplan",
    actionTitle: "Neuen Wartungsplan erfassen",
    actionView: "planung",
    scrollTarget: "new-maintenance"
  },
  mitarbeiter: {
    eyebrow: "Team",
    title: "Mitarbeiter verwalten.",
    actionLabel: "Mitarbeiter",
    actionTitle: "Neuen Mitarbeiter anlegen",
    actionView: "mitarbeiter",
    scrollTarget: "employeeForm"
  },
  benutzer: {
    eyebrow: "Administration",
    title: "Benutzer verwalten.",
    actionLabel: "Benutzer",
    actionTitle: "Neuen Benutzer anlegen",
    actionView: "benutzer",
    scrollTarget: "userForm"
  }
};

const hashViewMap = {
  dashboard: "dashboard",
  kalender: "dashboard",
  auftraege: "auftraege",
  stammdaten: "stammdaten",
  kunden: "kunden",
  wartungsobjekte: "wartungsobjekte",
  gebaeude: "gebaeude",
  planung: "planung",
  "new-maintenance": "planung",
  mitarbeiter: "mitarbeiter",
  benutzer: "benutzer"
};

let visibleMonth = startOfMonth(new Date());
let latestAssets = [];
let latestProperties = [];
let latestCustomers = [];
let latestEmployees = [];
let latestEmployeeFunctions = [];
let latestPlans = [];
let latestUserRoles = [];
let latestWorkOrders = [];
let activeWorkOrder = null;
const searchableSelects = new Map();

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

function normalizeSearchValue(value) {
  return String(value || "")
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function createSearchableSelect(select) {
  if (!select || searchableSelects.has(select)) {
    return;
  }

  const required = select.required;
  select.required = false;
  select.classList.add("native-search-select");

  const wrapper = document.createElement("div");
  wrapper.className = "searchable-select";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "searchable-input";
  input.autocomplete = "off";
  input.placeholder = select.options[0]?.textContent?.trim() || "Suchen";
  input.required = required;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");

  const list = document.createElement("div");
  list.className = "searchable-options";
  list.hidden = true;
  list.setAttribute("role", "listbox");

  wrapper.append(input, list);
  select.insertAdjacentElement("afterend", wrapper);

  const state = {
    activeIndex: -1,
    filtered: [],
    input,
    list,
    options: [],
    required,
    select,
    wrapper
  };
  searchableSelects.set(select, state);

  input.addEventListener("focus", () => openSearchableSelect(select));
  input.addEventListener("input", () => {
    const exactOption = findExactSearchableOption(state, input.value);
    select.value = exactOption ? exactOption.value : "";
    renderSearchableOptions(select);
  });
  input.addEventListener("keydown", (event) => handleSearchableKeydown(event, select));
  input.addEventListener("blur", () => {
    window.setTimeout(() => closeSearchableSelect(select), 120);
  });

  list.addEventListener("mousedown", (event) => event.preventDefault());
  list.addEventListener("click", (event) => {
    const optionButton = event.target.closest("[data-search-option]");
    if (!optionButton) {
      return;
    }

    selectSearchableOption(select, state.filtered[Number(optionButton.dataset.searchOption)]);
  });

  refreshSearchableSelect(select);
}

function ensureSelectOption(select, value) {
  const normalizedValue = String(value || "").trim();
  if (!select || !normalizedValue) {
    return;
  }

  const exists = Array.from(select.options).some((option) => option.value === normalizedValue);
  if (!exists) {
    select.append(new Option(normalizedValue, normalizedValue));
  }
}

function populateCountrySelects() {
  els.countrySelects.forEach((select) => {
    const currentValue = select.value || select.dataset.defaultCountry || "Deutschland";
    select.innerHTML = '<option value="">Land auswählen</option>' + countryOptions.map((country) => (
      `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`
    )).join("");
    ensureSelectOption(select, currentValue);
    select.value = currentValue;
  });
}

function setSelectValue(select, value, fallback = "") {
  const nextValue = value || fallback;
  ensureSelectOption(select, nextValue);
  select.value = nextValue;
  syncSearchableSelect(select);
}

function syncCountrySelects() {
  els.countrySelects.forEach(syncSearchableSelect);
}

function validateRequiredSearchableSelect(select, message) {
  const state = searchableSelects.get(select);
  if (!state) {
    return Boolean(select?.value);
  }

  const exactOption = findExactSearchableOption(state, state.input.value);
  if (exactOption) {
    select.value = exactOption.value;
    syncSearchableSelect(select);
    return true;
  }

  if (select.value) {
    return true;
  }

  showToast(message || "Bitte einen Eintrag aus der Liste auswählen.");
  state.input.focus();
  openSearchableSelect(select);
  return false;
}

function initializeSearchableSelects() {
  [
    ...els.countrySelects,
    els.assetPropertyTargetSelect,
    els.apartmentBuildingSelect,
    els.buildingCustomerSelect,
    els.apartmentCustomerSelect,
    els.maintenanceTargetSelect,
    els.maintenanceEmployeeSelect,
    els.employeeFunctionSelect,
    els.userRoleSelect
  ].forEach(createSearchableSelect);
}

function refreshSearchableSelect(select) {
  const state = searchableSelects.get(select);
  if (!state) {
    return;
  }

  state.options = Array.from(select.options)
    .filter((option) => !option.disabled)
    .map((option) => ({
      label: option.textContent.trim(),
      value: option.value
    }));
  syncSearchableSelect(select);
}

function syncSearchableSelect(select) {
  const state = searchableSelects.get(select);
  if (!state) {
    return;
  }

  const selectedOption = state.options.find((option) => option.value === select.value);
  state.input.value = selectedOption?.value ? selectedOption.label : "";
  renderSearchableOptions(select);
}

function findExactSearchableOption(state, value) {
  const query = normalizeSearchValue(value.trim());
  if (!query) {
    return null;
  }

  return state.options.find((option) => option.value && normalizeSearchValue(option.label) === query) || null;
}

function getFilteredSearchableOptions(state) {
  const query = normalizeSearchValue(state.input.value.trim());
  if (!query) {
    return state.options.slice(0, 60);
  }

  return state.options
    .filter((option) => option.value && (
      normalizeSearchValue(option.label).includes(query)
      || normalizeSearchValue(option.value).includes(query)
    ))
    .slice(0, 60);
}

function renderSearchableOptions(select) {
  const state = searchableSelects.get(select);
  if (!state) {
    return;
  }

  state.filtered = getFilteredSearchableOptions(state);
  state.activeIndex = state.filtered.length > 0 ? Math.min(Math.max(state.activeIndex, 0), state.filtered.length - 1) : -1;

  if (state.filtered.length === 0) {
    state.list.innerHTML = '<div class="searchable-empty">Keine Treffer</div>';
    return;
  }

  state.list.innerHTML = state.filtered.map((option, index) => `
    <button
      class="searchable-option ${index === state.activeIndex ? "is-active" : ""} ${option.value ? "" : "is-empty"}"
      type="button"
      role="option"
      data-search-option="${index}"
    >
      ${escapeHtml(option.label)}
    </button>
  `).join("");
}

function openSearchableSelect(select) {
  const state = searchableSelects.get(select);
  if (!state) {
    return;
  }

  renderSearchableOptions(select);
  state.list.hidden = false;
  state.wrapper.classList.add("is-open");
  state.input.setAttribute("aria-expanded", "true");
}

function closeSearchableSelect(select) {
  const state = searchableSelects.get(select);
  if (!state) {
    return;
  }

  state.list.hidden = true;
  state.wrapper.classList.remove("is-open");
  state.input.setAttribute("aria-expanded", "false");
}

function selectSearchableOption(select, option) {
  const state = searchableSelects.get(select);
  if (!state || !option) {
    return;
  }

  select.value = option.value;
  state.input.value = option.value ? option.label : "";
  closeSearchableSelect(select);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function handleSearchableKeydown(event, select) {
  const state = searchableSelects.get(select);
  if (!state) {
    return;
  }

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    openSearchableSelect(select);
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const maxIndex = state.filtered.length - 1;
    state.activeIndex = Math.min(Math.max(state.activeIndex + direction, 0), maxIndex);
    renderSearchableOptions(select);
    return;
  }

  if (event.key === "Enter" && !state.list.hidden && state.activeIndex >= 0) {
    event.preventDefault();
    selectSearchableOption(select, state.filtered[state.activeIndex]);
    return;
  }

  if (event.key === "Escape") {
    closeSearchableSelect(select);
  }
}

function validateSearchableSelect(select, message) {
  const state = searchableSelects.get(select);
  if (!state) {
    return true;
  }

  const exactOption = findExactSearchableOption(state, state.input.value);
  if (exactOption) {
    select.value = exactOption.value;
    syncSearchableSelect(select);
    return true;
  }

  if (select.value) {
    return true;
  }

  if (!state.input.value.trim() && !state.required) {
    return true;
  }

  showToast(message || "Bitte einen Eintrag aus der Liste auswählen.");
  state.input.focus();
  openSearchableSelect(select);
  return false;
}

function scrollToTarget(targetId) {
  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setView(viewName, options = {}) {
  const nextView = viewConfig[viewName] ? viewName : "dashboard";
  const config = viewConfig[nextView];
  const activeNav = options.activeNav || nextView;

  els.views.forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === nextView);
  });

  els.viewLinks.forEach((link) => {
    link.classList.toggle("active", (link.dataset.navKey || link.dataset.viewLink) === activeNav);
  });

  els.pageEyebrow.textContent = config.eyebrow;
  els.pageTitle.textContent = config.title;
  els.pageActionLabel.textContent = config.actionLabel;
  els.pageAction.title = config.actionTitle;
  els.pageAction.dataset.viewTarget = config.actionView;
  els.pageAction.dataset.scrollTarget = config.scrollTarget;

  const hashTarget = options.hashTarget || nextView;
  if (options.updateHash !== false && window.location.hash !== `#${hashTarget}`) {
    window.history.pushState(null, "", `#${hashTarget}`);
  }

  if (options.scrollTop !== false) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function showViewFromHash() {
  const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  const viewName = hashViewMap[hash] || "dashboard";
  const activeNav = hash === "kalender" ? "kalender" : viewName;
  setView(viewName, { updateHash: false, scrollTop: false, activeNav });

  if (hash && hash !== viewName && hashViewMap[hash]) {
    window.setTimeout(() => scrollToTarget(hash), 0);
  }
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

  els.currentUser.textContent = `${payload.user.displayName} - ${payload.user.roleName || roleLabels[payload.user.role] || payload.user.role}`;
}

function renderSummary(payload) {
  const { summary, assets, plans, activity, customers, employees, employeeFunctions, settings, users, userRoles } = payload;
  latestAssets = assets || [];
  latestCustomers = customers || [];
  latestEmployees = employees || [];
  latestEmployeeFunctions = employeeFunctions || [];
  latestPlans = plans || [];
  latestUserRoles = userRoles || [];

  els.assetCount.textContent = summary.assetCount;
  els.planCount.textContent = summary.activePlanCount;
  els.orderCount.textContent = summary.openWorkOrderCount;
  els.overdueCount.textContent = summary.overdueCount;
  els.customerCount.textContent = summary.customerCount;

  renderAssetCustomerFilterOptions(customers);
  renderAssets(assets);
  renderPlans(plans);
  renderActivity(activity);
  renderCustomers(customers);
  renderEmployees(employees);
  renderEmployeeFunctions(employeeFunctions);
  renderUsers(users);
  renderUserRoles(userRoles);
  renderCustomerOptions(customers);
  renderEmployeeOptions(employees);
  renderEmployeeFunctionOptions(employeeFunctions);
  renderUserRoleOptions(userRoles);
  renderAppSettings(settings);
}

function renderAppSettings(settings) {
  els.skipSaturdaysForMaintenanceInput.checked = Boolean(settings?.skipSaturdaysForMaintenance);
  els.skipSundaysForMaintenanceInput.checked = Boolean(settings?.skipSundaysForMaintenance);
}

function renderWorkOrders(workOrders) {
  latestWorkOrders = workOrders || [];
  if (!els.workOrderList) {
    return;
  }

  els.workOrderResultCount.textContent = `${latestWorkOrders.length} Aufträge`;

  if (latestWorkOrders.length === 0) {
    els.workOrderList.innerHTML = '<div class="list-item">Keine Aufträge für diesen Filter.</div>';
    return;
  }

  els.workOrderList.innerHTML = latestWorkOrders.map((order) => {
    const checkCount = Number(order.checkCount || 0);
    const checkedCount = Number(order.checkedCount || 0);
    const isOverdue = order.status !== "done" && order.dueDate && order.dueDate < toDateKey(new Date());

    return `
    <div class="work-order-card clickable-list-item ${isOverdue ? "is-overdue" : ""}" role="button" tabindex="0" data-edit-work-order="${order.id}" title="Auftrag öffnen">
      <div>
        <strong>${escapeHtml(order.title)}</strong>
        <div class="list-meta">
          <span>${escapeHtml(order.assetName || "Ohne Objekt")}</span>
          <span>${formatDate(order.dueDate)}</span>
          <span>${statusLabels[order.status] || order.status}</span>
          <span>${priorityLabels[order.priority] || order.priority}</span>
          <span>${checkCount > 0 ? `${checkedCount}/${checkCount} Checks` : "Keine Checks"}</span>
        </div>
        ${order.description ? `<div class="muted">${escapeHtml(order.description)}</div>` : ""}
      </div>
      <div class="inline-actions">
        ${order.status === "done" ? '<span class="system-note">erledigt</span>' : `<button class="compact-button" type="button" title="Als erledigt markieren" aria-label="Als erledigt markieren" data-complete="${order.id}">OK</button>`}
      </div>
    </div>
  `;
  }).join("");
}

function renderWorkOrderChecks(checks = []) {
  if (!els.workOrderCheckList) {
    return;
  }

  if (checks.length === 0) {
    els.workOrderCheckList.innerHTML = '<div class="list-item">Für dieses Objekt sind keine Checks hinterlegt.</div>';
    return;
  }

  els.workOrderCheckList.innerHTML = checks.map((check) => `
    <label class="check-item">
      <input type="checkbox" data-work-order-check="${check.id}" ${Number(check.checked) === 1 || check.checked === true ? "checked" : ""}>
      <span>${escapeHtml(check.label)}</span>
    </label>
  `).join("");
}

function renderWorkOrderDetail(order) {
  activeWorkOrder = order;
  els.workOrderDetailEmpty.hidden = true;
  els.workOrderDetailForm.hidden = false;
  els.workOrderDetailForm.elements.workOrderId.value = order.id;
  els.workOrderDetailForm.elements.title.value = order.title || "";
  els.workOrderDetailForm.elements.assetName.value = order.assetName || "Ohne Objekt";
  els.workOrderDetailForm.elements.status.value = order.status || "open";
  els.workOrderDetailForm.elements.priority.value = order.priority || "medium";
  els.workOrderDetailForm.elements.dueDate.value = order.dueDate || "";
  els.workOrderDetailForm.elements.description.value = order.description || "";
  els.workOrderDoneButton.hidden = order.status === "done";
  renderWorkOrderChecks(order.checks || []);
}

function getAssetAddressLabel(asset) {
  return formatAddressLabel(asset.customerStreet, asset.customerHouseNumber, asset.customerPostalCode, asset.customerCity, asset.customerCountry);
}

function getAssetSearchText(asset) {
  return [
    asset.name,
    asset.assetType,
    asset.location,
    asset.serialNumber,
    asset.qrCode,
    asset.instructionsHtml,
    asset.criticality,
    asset.assignmentLabel,
    asset.buildingAddress,
    asset.customerNumber,
    asset.customerName,
    asset.customerStreet,
    asset.customerHouseNumber,
    asset.customerPostalCode,
    asset.customerCity,
    asset.customerCountry
  ].filter(Boolean).join(" ");
}

function getFilteredAssets(assets) {
  const search = normalizeSearchValue(els.assetSearchInput.value);
  const customerId = els.assetCustomerFilter.value;
  const address = normalizeSearchValue(els.assetAddressFilterInput.value);
  const criticality = els.assetCriticalityFilter.value;

  return (assets || []).filter((asset) => {
    const searchText = normalizeSearchValue(getAssetSearchText(asset));
    const addressText = normalizeSearchValue([
      asset.assignmentLabel,
      asset.buildingAddress,
      asset.customerStreet,
      asset.customerHouseNumber,
      asset.customerPostalCode,
      asset.customerCity,
      asset.customerCountry,
      asset.location
    ].filter(Boolean).join(" "));

    return (!search || searchText.includes(search))
      && (!customerId || String(asset.customerId || "") === customerId)
      && (!address || addressText.includes(address))
      && (!criticality || asset.criticality === criticality);
  });
}

function renderAssetCustomerFilterOptions(customers) {
  const currentValue = els.assetCustomerFilter.value;
  els.assetCustomerFilter.innerHTML = '<option value="">Alle Kunden</option>' + (customers || []).map((customer) => (
    `<option value="${customer.id}">${escapeHtml(formatCustomerLabel(customer.customerNumber, customer.name))}</option>`
  )).join("");
  els.assetCustomerFilter.value = currentValue;
}

function renderAssets(assets = latestAssets) {
  if (!assets || assets.length === 0) {
    els.assetList.innerHTML = '<div class="list-item">Keine Wartungsobjekte angelegt.</div>';
    els.assetResultCount.textContent = "0 Objekte";
    return;
  }

  const filteredAssets = getFilteredAssets(assets);
  els.assetResultCount.textContent = `${filteredAssets.length} von ${assets.length} Objekten`;

  if (filteredAssets.length === 0) {
    els.assetList.innerHTML = '<div class="list-item">Keine Wartungsobjekte für diesen Filter.</div>';
    return;
  }

  els.assetList.innerHTML = filteredAssets.map((asset) => `
    <div class="list-item list-item-with-actions clickable-list-item" role="button" tabindex="0" data-edit-asset="${asset.id}" title="Wartungsobjekt bearbeiten">
      <div>
        <strong>${escapeHtml(asset.name)}</strong>
        <div class="list-meta">
          <span>${escapeHtml(formatCustomerLabel(asset.customerNumber, asset.customerName))}</span>
          <span>${escapeHtml(asset.assignmentLabel || "Keine Zuordnung")}</span>
          <span>${escapeHtml(asset.buildingAddress || getAssetAddressLabel(asset) || "Keine Adresse")}</span>
          <span>${escapeHtml(asset.assetType)}</span>
          <span>${escapeHtml(asset.location)}</span>
          <span>${priorityLabels[asset.criticality] || asset.criticality}</span>
          ${asset.serialNumber ? `<span>${escapeHtml(asset.serialNumber)}</span>` : ""}
          ${asset.qrCode ? `<span>QR: ${escapeHtml(asset.qrCode)}</span>` : ""}
        </div>
        ${asset.instructionsHtml ? `<div class="maintenance-html-preview">${sanitizeMaintenanceHtml(asset.instructionsHtml)}</div>` : ""}
      </div>
      <div class="inline-actions">
        <button class="compact-button" type="button" title="Wartungsobjekt duplizieren" aria-label="Wartungsobjekt duplizieren" data-duplicate-asset="${asset.id}">Kopie</button>
        <button class="compact-button" type="button" title="Wartungsobjekt löschen" aria-label="Wartungsobjekt löschen" data-delete-asset="${asset.id}">X</button>
      </div>
    </div>
  `).join("");
}

function renderAssetChecks(checks = []) {
  if (!checks.length) {
    els.assetCheckList.innerHTML = '<div class="list-item">Noch keine Checks für dieses Objekt.</div>';
    return;
  }

  els.assetCheckList.innerHTML = checks.map((check) => `
    <div class="list-item list-item-with-actions">
      <strong>${escapeHtml(check.label)}</strong>
      <button class="compact-button" type="button" title="Check löschen" aria-label="Check löschen" data-delete-asset-check="${check.id}">X</button>
    </div>
  `).join("");
}

function renderAssetMaintenancePlans(plans = []) {
  if (!plans.length) {
    els.assetMaintenancePlanList.innerHTML = '<div class="list-item">Keine Wartungspläne für dieses Objekt.</div>';
    return;
  }

  els.assetMaintenancePlanList.innerHTML = plans.map((plan) => `
    <div class="list-item clickable-list-item" role="button" tabindex="0" data-edit-plan="${plan.id}" title="Wartungsplan bearbeiten">
      <strong>${escapeHtml(plan.title || "Wartungsplan")}</strong>
      <div class="list-meta">
        <span>${formatDate(plan.nextDueOn)}</span>
        <span>${plan.intervalDays} Tage</span>
        <span>${escapeHtml(plan.employeeName || "Kein Mitarbeiter")}</span>
        <span>${Number(plan.active) === 1 || plan.active === true ? "Aktiv" : "Inaktiv"}</span>
      </div>
    </div>
  `).join("");
}

function renderAssetOpenOrders(workOrders = []) {
  if (!workOrders.length) {
    els.assetOpenOrderList.innerHTML = '<div class="list-item">Keine offenen Aufträge für dieses Objekt.</div>';
    return;
  }

  els.assetOpenOrderList.innerHTML = workOrders.map((order) => {
    const checkCount = Number(order.checkCount || 0);
    const checkedCount = Number(order.checkedCount || 0);
    return `
      <div class="list-item clickable-list-item" role="button" tabindex="0" data-open-work-order="${order.id}" title="Auftrag öffnen">
        <strong>${escapeHtml(order.title)}</strong>
        <div class="list-meta">
          <span>${formatDate(order.dueDate)}</span>
          <span>${statusLabels[order.status] || order.status}</span>
          <span>${priorityLabels[order.priority] || order.priority}</span>
          <span>${checkCount > 0 ? `${checkedCount}/${checkCount} Checks` : "Keine Checks"}</span>
        </div>
      </div>
    `;
  }).join("");
}

function renderAssetDetails(details) {
  els.assetDetailPanel.hidden = false;
  els.assetCheckAssetIdInput.value = details.asset.id;
  renderAssetChecks(details.checks || []);
  renderAssetMaintenancePlans(details.maintenancePlans || []);
  renderAssetOpenOrders(details.workOrders || []);
}

function renderPlans(plans) {
  if (!plans || plans.length === 0) {
    els.planList.innerHTML = '<div class="list-item">Keine Wartungspläne.</div>';
    return;
  }

  els.planList.innerHTML = plans.map((plan) => `
    <div class="list-item list-item-with-actions clickable-list-item" role="button" tabindex="0" data-edit-plan="${plan.id}" title="Wartungsplan bearbeiten">
      <div>
        <strong>${escapeHtml(plan.targetName || plan.title || "Wartungsobjekt")}</strong>
        <div class="list-meta">
          <span>${escapeHtml(plan.targetSubtitle || "")}</span>
          <span>${escapeHtml(plan.employeeName || "Kein Mitarbeiter")}</span>
          <span>${formatDate(plan.nextDueOn)}</span>
          <span>${plan.intervalDays} Tage</span>
        </div>
        ${plan.instructionsHtml ? `<div class="maintenance-html-preview">${sanitizeMaintenanceHtml(plan.instructionsHtml)}</div>` : ""}
      </div>
      <button class="compact-button" type="button" title="Wartungsplan löschen" aria-label="Wartungsplan löschen" data-delete-plan="${plan.id}">X</button>
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
          <span>${escapeHtml(user.roleName || roleLabels[user.role] || user.role)}</span>
          <span>${Number(user.active) === 1 ? "Aktiv" : "Inaktiv"}</span>
        </div>
      </div>
      <div class="user-actions">
        ${Number(user.isSystem) === 1
          ? '<span class="system-note">Systemadmin</span>'
          : `<button class="compact-button" type="button" title="Benutzer löschen" aria-label="Benutzer löschen" data-delete-user="${user.id}">X</button>`
        }
      </div>
    </div>
  `).join("");
}

function renderEmployees(employees) {
  if (!employees || employees.length === 0) {
    els.employeeList.innerHTML = '<div class="list-item">Keine Mitarbeiter angelegt.</div>';
    return;
  }

  els.employeeList.innerHTML = employees.map((employee) => `
    <div class="user-item clickable-list-item" role="button" tabindex="0" data-edit-employee="${employee.id}" title="Mitarbeiter bearbeiten">
      <div>
        <strong>${escapeHtml(employee.name)}</strong>
        <div class="list-meta">
          <span>${escapeHtml(employee.employeeNumber || "Ohne Nummer")}</span>
          <span>${escapeHtml(employee.roleTitle || "Keine Funktion")}</span>
          <span>${escapeHtml(employee.email || "Keine E-Mail")}</span>
          <span>${escapeHtml(employee.phone || "Kein Telefon")}</span>
          <span>${Number(employee.active) === 1 ? "Aktiv" : "Inaktiv"}</span>
        </div>
      </div>
      <div class="user-actions">
        <button class="compact-button" type="button" title="Mitarbeiter löschen" aria-label="Mitarbeiter löschen" data-delete-employee="${employee.id}">X</button>
      </div>
    </div>
  `).join("");
}

function renderEmployeeFunctions(employeeFunctions) {
  if (!employeeFunctions || employeeFunctions.length === 0) {
    els.employeeFunctionList.innerHTML = '<div class="list-item">Keine Funktionen angelegt.</div>';
    return;
  }

  els.employeeFunctionList.innerHTML = employeeFunctions.map((employeeFunction) => `
    <div class="user-item clickable-list-item" role="button" tabindex="0" data-edit-employee-function="${employeeFunction.id}" title="Funktion bearbeiten">
      <div>
        <strong>${escapeHtml(employeeFunction.name)}</strong>
        <div class="list-meta">
          <span>${Number(employeeFunction.employeeCount || 0)} Mitarbeiter</span>
          <span>${escapeHtml(employeeFunction.notes || "Keine Notizen")}</span>
        </div>
      </div>
      <div class="user-actions">
        <button class="compact-button" type="button" title="Funktion löschen" aria-label="Funktion löschen" data-delete-employee-function="${employeeFunction.id}">X</button>
      </div>
    </div>
  `).join("");
}

function renderUserRoles(userRoles) {
  if (!userRoles || userRoles.length === 0) {
    els.userRoleList.innerHTML = '<div class="list-item">Keine Rollen angelegt.</div>';
    return;
  }

  els.userRoleList.innerHTML = userRoles.map((role) => `
    <div class="user-item clickable-list-item" role="button" tabindex="0" data-edit-user-role="${escapeHtml(role.roleKey)}" title="Rolle bearbeiten">
      <div>
        <strong>${escapeHtml(role.name)}</strong>
        <div class="list-meta">
          <span>${escapeHtml(role.roleKey)}</span>
          <span>${Number(role.userCount || 0)} Benutzer</span>
          <span>${Number(role.isSystem) === 1 || role.isSystem === true ? "Systemrolle" : "Eigene Rolle"}</span>
        </div>
      </div>
      <div class="user-actions">
        ${Number(role.isSystem) === 1 || role.isSystem === true
          ? '<span class="system-note">geschützt</span>'
          : `<button class="compact-button" type="button" title="Rolle löschen" aria-label="Rolle löschen" data-delete-user-role="${escapeHtml(role.roleKey)}">X</button>`
        }
      </div>
    </div>
  `).join("");
}

function formatCustomerLabel(customerNumber, customerName) {
  if (!customerNumber && !customerName) {
    return "Kein Kunde";
  }

  return [customerNumber, customerName].filter(Boolean).join(" - ");
}

function formatMaintenanceWeekdays(source) {
  const activeDays = maintenanceWeekdayFields
    .filter((field) => Number(source?.[field.key]) === 1 || source?.[field.key] === true)
    .map((field) => field.label);
  return activeDays.length > 0 ? activeDays.join(", ") : "Keine Wunschtage";
}

function formatAddressLabel(street, houseNumber, postalCode, city, country) {
  const streetLine = [street, houseNumber].filter(Boolean).join(" ");
  const cityLine = [postalCode, city].filter(Boolean).join(" ");
  return [streetLine, cityLine, country].filter(Boolean).join(", ");
}

function getCustomerSearchText(customer) {
  return [
    customer.customerNumber,
    customer.name,
    customer.firstName,
    customer.lastName,
    customer.contactName,
    customer.email,
    customer.phone,
    customer.street,
    customer.houseNumber,
    customer.postalCode,
    customer.city,
    customer.country,
    customer.billingRecipient,
    customer.billingStreet,
    customer.billingHouseNumber,
    customer.billingPostalCode,
    customer.billingCity,
    customer.billingCountry
  ].filter(Boolean).join(" ");
}

function getFilteredCustomers(customers) {
  const search = normalizeSearchValue(els.customerSearchInput.value);
  const address = normalizeSearchValue(els.customerAddressFilterInput.value);
  const weekday = els.customerWeekdayFilter.value;

  return (customers || []).filter((customer) => {
    const searchText = normalizeSearchValue(getCustomerSearchText(customer));
    const addressText = normalizeSearchValue([
      customer.street,
      customer.houseNumber,
      customer.postalCode,
      customer.city,
      customer.country,
      customer.billingStreet,
      customer.billingHouseNumber,
      customer.billingPostalCode,
      customer.billingCity,
      customer.billingCountry
    ].filter(Boolean).join(" "));

    return (!search || searchText.includes(search))
      && (!address || addressText.includes(address))
      && (!weekday || Number(customer[weekday]) === 1 || customer[weekday] === true);
  });
}

function renderCustomers(customers = latestCustomers) {
  if (!customers || customers.length === 0) {
    els.customerList.innerHTML = '<div class="list-item">Keine Kunden angelegt.</div>';
    els.customerResultCount.textContent = "0 Kunden";
    return;
  }

  const filteredCustomers = getFilteredCustomers(customers);
  els.customerResultCount.textContent = `${filteredCustomers.length} von ${customers.length} Kunden`;

  if (filteredCustomers.length === 0) {
    els.customerList.innerHTML = '<div class="list-item">Keine Kunden für diesen Filter.</div>';
    return;
  }

  els.customerList.innerHTML = filteredCustomers.map((customer) => `
    <div class="user-item clickable-list-item" role="button" tabindex="0" data-edit-customer="${customer.id}" title="Kunde bearbeiten">
      <div>
        <strong>${escapeHtml(customer.name)}</strong>
        <div class="list-meta">
          <span>${escapeHtml(customer.customerNumber)}</span>
          <span>${escapeHtml(formatAddressLabel(customer.street, customer.houseNumber, customer.postalCode, customer.city, customer.country) || "Keine Adresse")}</span>
          <span>Wartung: ${escapeHtml(formatMaintenanceWeekdays(customer))}</span>
          ${Number(customer.billingAddressDiffers) === 1 ? `<span>RE: ${escapeHtml(formatAddressLabel(customer.billingStreet, customer.billingHouseNumber, customer.billingPostalCode, customer.billingCity, customer.billingCountry))}</span>` : ""}
          <span>${escapeHtml(customer.contactName || "Kein Ansprechpartner")}</span>
          <span>${escapeHtml(customer.email || "Keine E-Mail")}</span>
          <span>${escapeHtml(customer.phone || "Kein Telefon")}</span>
        </div>
      </div>
      <div class="user-actions">
        <button class="compact-button" type="button" title="Kunde löschen" aria-label="Kunde löschen" data-delete-customer="${customer.id}">X</button>
      </div>
    </div>
  `).join("");
}

function getPropertyAddressLabel(building) {
  return formatAddressLabel(building.street, building.houseNumber, building.postalCode, building.city, building.country)
    || building.address;
}

function getPropertySearchText(building) {
  return [
    building.name,
    building.customerNumber,
    building.customerName,
    building.buildingType,
    getPropertyAddressLabel(building),
    ...(building.apartments || []).flatMap((apartment) => [
      apartment.apartmentNumber,
      apartment.name,
      apartment.floor,
      apartment.customerNumber,
      apartment.customerName
    ])
  ].filter(Boolean).join(" ");
}

function getFilteredProperties(properties) {
  const search = normalizeSearchValue(els.propertySearchInput.value);
  const customerId = els.propertyCustomerFilter.value;
  const address = normalizeSearchValue(els.propertyAddressFilterInput.value);
  const buildingType = els.propertyTypeFilter.value;

  return (properties || []).filter((building) => {
    const searchText = normalizeSearchValue(getPropertySearchText(building));
    const addressText = normalizeSearchValue(getPropertyAddressLabel(building) || "");
    const hasCustomer = String(building.customerId || "") === customerId
      || (building.apartments || []).some((apartment) => String(apartment.customerId || "") === customerId);

    return (!search || searchText.includes(search))
      && (!customerId || hasCustomer)
      && (!address || addressText.includes(address))
      && (!buildingType || building.buildingType === buildingType);
  });
}

function renderProperties(properties = latestProperties) {
  latestProperties = properties || [];
  renderApartmentBuildingOptions(properties);
  renderAssetAssignmentOptions(properties);

  if (!properties || properties.length === 0) {
    els.propertyList.innerHTML = '<div class="list-item">Keine Gebäude angelegt.</div>';
    els.propertyResultCount.textContent = "0 Gebäude";
    return;
  }

  const filteredProperties = getFilteredProperties(properties);
  els.propertyResultCount.textContent = `${filteredProperties.length} von ${properties.length} Gebäude`;

  if (filteredProperties.length === 0) {
    els.propertyList.innerHTML = '<div class="list-item">Keine Gebäude oder Appartments für diesen Filter.</div>';
    return;
  }

  els.propertyList.innerHTML = filteredProperties.map((building) => `
    <div class="property-card clickable-list-item" role="button" tabindex="0" data-edit-building="${building.id}" title="Gebäude bearbeiten">
      <div class="property-card-header">
        <div>
          <strong>${escapeHtml(building.name)}</strong>
          <div class="list-meta">
            <span>${escapeHtml(formatCustomerLabel(building.customerNumber, building.customerName))}</span>
            <span>${buildingTypeLabels[building.buildingType] || building.buildingType}</span>
            <span>${escapeHtml(getPropertyAddressLabel(building) || "Keine Adresse")}</span>
            <span>${building.apartments.length === 0 ? "Als Wartungsobjekt verfügbar" : `${building.apartments.length} Appartments`}</span>
          </div>
        </div>
        <button class="compact-button" type="button" title="Gebäude löschen" aria-label="Gebäude löschen" data-delete-building="${building.id}">X</button>
      </div>
      ${building.apartments.length === 0
        ? '<span class="badge light">Gebäude ohne Appartments</span>'
        : `<div class="apartment-list">
            ${building.apartments.map((apartment) => `
              <div class="apartment-chip clickable-list-item" role="button" tabindex="0" data-edit-apartment="${apartment.id}" title="Appartment bearbeiten">
                <div>
                  <span>${escapeHtml(apartment.name)}</span>
                  <span class="muted">${escapeHtml(apartment.apartmentNumber)}${apartment.floor ? ` - ${escapeHtml(apartment.floor)}` : ""}</span>
                  <span class="muted">${escapeHtml(formatCustomerLabel(apartment.customerNumber, apartment.customerName))}</span>
                </div>
                <button class="compact-button" type="button" title="Appartment löschen" aria-label="Appartment löschen" data-delete-apartment="${apartment.id}">X</button>
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
          <span class="calendar-event" title="${escapeHtml(event.targetName || event.title)}">
            ${escapeHtml(event.targetName || event.title)}
            <small>${escapeHtml([event.employeeName || "", event.intervalDays ? `alle ${event.intervalDays} Tage` : ""].filter(Boolean).join(" - "))}</small>
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

function renderCustomerOptions(customers) {
  const buildingValue = els.buildingCustomerSelect.value;
  const apartmentValue = els.apartmentCustomerSelect.value;
  const propertyFilterValue = els.propertyCustomerFilter.value;
  const options = (customers || []).map((customer) => (
    `<option value="${customer.id}">${escapeHtml(formatCustomerLabel(customer.customerNumber, customer.name))}</option>`
  )).join("");

  els.buildingCustomerSelect.innerHTML = '<option value="">Kein Kunde zugewiesen</option>' + options;
  els.apartmentCustomerSelect.innerHTML = '<option value="">Wie Gebäude / kein Kunde</option>' + options;
  els.propertyCustomerFilter.innerHTML = '<option value="">Alle Kunden</option>' + options;
  els.buildingCustomerSelect.value = buildingValue;
  els.apartmentCustomerSelect.value = apartmentValue;
  els.propertyCustomerFilter.value = propertyFilterValue;
  refreshSearchableSelect(els.buildingCustomerSelect);
  refreshSearchableSelect(els.apartmentCustomerSelect);
}

function renderEmployeeFunctionOptions(employeeFunctions) {
  const currentValue = els.employeeFunctionSelect.value;
  els.employeeFunctionSelect.innerHTML = '<option value="">Keine Funktion</option>' + (employeeFunctions || []).map((employeeFunction) => (
    `<option value="${employeeFunction.id}">${escapeHtml(employeeFunction.name)}</option>`
  )).join("");
  els.employeeFunctionSelect.value = currentValue;
  refreshSearchableSelect(els.employeeFunctionSelect);
}

function renderUserRoleOptions(userRoles) {
  const currentValue = els.userRoleSelect.value || "customer";
  els.userRoleSelect.innerHTML = (userRoles || []).map((role) => (
    `<option value="${escapeHtml(role.roleKey)}">${escapeHtml(role.name)}</option>`
  )).join("");
  els.userRoleSelect.value = currentValue;
  if (!els.userRoleSelect.value && els.userRoleSelect.options.length > 0) {
    els.userRoleSelect.value = els.userRoleSelect.options[0].value;
  }
  refreshSearchableSelect(els.userRoleSelect);
}

function renderApartmentBuildingOptions(properties) {
  const currentValue = els.apartmentBuildingSelect.value;
  els.apartmentBuildingSelect.innerHTML = '<option value="">Gebäude auswählen</option>' + properties.map((building) => (
    `<option value="${building.id}">${escapeHtml(building.name)}${building.customerNumber ? ` - ${escapeHtml(building.customerNumber)}` : ""}</option>`
  )).join("");
  els.apartmentBuildingSelect.value = currentValue;
  refreshSearchableSelect(els.apartmentBuildingSelect);
}

function renderAssetAssignmentOptions(properties) {
  const currentValue = els.assetPropertyTargetSelect.value;
  const options = [];

  for (const building of properties || []) {
    if (building.apartments?.length > 0) {
      for (const apartment of building.apartments) {
        options.push(
          `<option value="apartment:${apartment.id}">${escapeHtml(building.name)} / ${escapeHtml(apartment.name)}${apartment.customerNumber ? ` - ${escapeHtml(apartment.customerNumber)}` : ""}</option>`
        );
      }
    } else {
      options.push(
        `<option value="building:${building.id}">${escapeHtml(building.name)}${building.customerNumber ? ` - ${escapeHtml(building.customerNumber)}` : ""}</option>`
      );
    }
  }

  els.assetPropertyTargetSelect.innerHTML = '<option value="">Noch nicht zugewiesen</option>' + options.join("");
  els.assetPropertyTargetSelect.value = currentValue;
  refreshSearchableSelect(els.assetPropertyTargetSelect);
}

function renderMaintenanceTargetOptions(targets) {
  const currentValue = els.maintenanceTargetSelect.value;
  els.maintenanceTargetSelect.innerHTML = '<option value="">Wartungsobjekt auswählen</option>' + targets.map((target) => (
    `<option value="${target.targetType}:${target.targetId}">${escapeHtml(target.label)} - ${escapeHtml(target.subtitle || "")}</option>`
  )).join("");
  els.maintenanceTargetSelect.value = currentValue;
  refreshSearchableSelect(els.maintenanceTargetSelect);
}

function renderEmployeeOptions(employees) {
  const currentValue = els.maintenanceEmployeeSelect.value;
  els.maintenanceEmployeeSelect.innerHTML = '<option value="">Noch nicht zugewiesen</option>' + (employees || []).map((employee) => {
    const status = Number(employee.active) === 1 ? "" : " - inaktiv";
    const number = employee.employeeNumber ? `${employee.employeeNumber} - ` : "";
    return `<option value="${employee.id}">${escapeHtml(`${number}${employee.name}${status}`)}</option>`;
  }).join("");
  els.maintenanceEmployeeSelect.value = currentValue;
  refreshSearchableSelect(els.maintenanceEmployeeSelect);
}

function getMaintenancePlanTargetValue(plan) {
  const targetType = plan.targetType || "asset";
  const targetId = plan.targetId || plan.assetId;
  return targetType && targetId ? `${targetType}:${targetId}` : "";
}

function resetMaintenanceForm() {
  els.maintenanceForm.reset();
  els.maintenancePlanIdInput.value = "";
  syncSearchableSelect(els.maintenanceTargetSelect);
  syncSearchableSelect(els.maintenanceEmployeeSelect);
  els.maintenanceSubmitButton.textContent = "Wartungsplan speichern";
}

function loadMaintenancePlanIntoForm(plan) {
  els.maintenanceForm.elements.maintenancePlanId.value = plan.id;
  els.maintenanceForm.elements.target.value = getMaintenancePlanTargetValue(plan);
  els.maintenanceForm.elements.employeeId.value = plan.employeeId || "";
  els.maintenanceForm.elements.intervalDays.value = plan.intervalDays || 365;
  els.maintenanceForm.elements.nextDueOn.value = plan.rawNextDueOn || plan.nextDueOn || "";
  els.maintenanceForm.elements.instructionsHtml.value = plan.instructionsHtml || "";
  syncSearchableSelect(els.maintenanceTargetSelect);
  syncSearchableSelect(els.maintenanceEmployeeSelect);
  els.maintenanceSubmitButton.textContent = "Änderungen speichern";
  setView("planung", { updateHash: true, scrollTop: false });
  window.setTimeout(() => scrollToTarget("new-maintenance"), 0);
}

function getAssetFormPayload() {
  const data = Object.fromEntries(new FormData(els.assetForm));
  return {
    id: data.assetId ? Number(data.assetId) : null,
    name: data.name,
    assetType: data.assetType,
    location: data.location,
    serialNumber: data.serialNumber,
    qrCode: data.qrCode,
    instructionsHtml: data.instructionsHtml,
    criticality: data.criticality,
    propertyTarget: data.propertyTarget
  };
}

function resetAssetForm() {
  els.assetForm.reset();
  els.assetIdInput.value = "";
  syncSearchableSelect(els.assetPropertyTargetSelect);
  els.assetSubmitButton.textContent = "Objekt speichern";
  els.assetDetailPanel.hidden = true;
  els.assetCheckAssetIdInput.value = "";
  els.assetCheckList.innerHTML = "";
  els.assetMaintenancePlanList.innerHTML = "";
  els.assetOpenOrderList.innerHTML = "";
}

function loadAssetIntoForm(asset) {
  els.assetForm.elements.assetId.value = asset.id;
  els.assetForm.elements.name.value = asset.name || "";
  els.assetForm.elements.assetType.value = asset.assetType || "";
  els.assetForm.elements.location.value = asset.location || "";
  els.assetForm.elements.serialNumber.value = asset.serialNumber || "";
  els.assetForm.elements.qrCode.value = asset.qrCode || "";
  els.assetForm.elements.criticality.value = asset.criticality || "medium";
  els.assetForm.elements.instructionsHtml.value = asset.instructionsHtml || "";
  els.assetForm.elements.propertyTarget.value = asset.assignmentType && asset.assignmentId
    ? `${asset.assignmentType}:${asset.assignmentId}`
    : "";
  syncSearchableSelect(els.assetPropertyTargetSelect);
  els.assetSubmitButton.textContent = "Änderungen speichern";
  setView("wartungsobjekte", { updateHash: true, scrollTop: false });
  if (asset.id) {
    loadAssetDetails(asset.id).catch((error) => showToast(error.message));
  }
  window.setTimeout(() => scrollToTarget("assetForm"), 0);
}

function duplicateAssetInForm(asset) {
  loadAssetIntoForm({
    ...asset,
    id: "",
    name: `${asset.name} Kopie`,
    qrCode: ""
  });
  els.assetIdInput.value = "";
  els.assetDetailPanel.hidden = true;
  els.assetSubmitButton.textContent = "Kopie speichern";
}

function getCustomerMaintenanceWeekdayPayload() {
  return Object.fromEntries(maintenanceWeekdayFields.map((field) => [
    field.key,
    Boolean(els.customerForm.elements[field.key]?.checked)
  ]));
}

function applyCustomerMaintenanceWeekdays(source = {}) {
  maintenanceWeekdayFields.forEach((field) => {
    const input = els.customerForm.elements[field.key];
    if (input) {
      input.checked = source[field.key] === undefined ? field.defaultValue : Boolean(Number(source[field.key]));
    }
  });
}

function getCustomerFormPayload() {
  const data = Object.fromEntries(new FormData(els.customerForm));
  return {
    id: data.customerId ? Number(data.customerId) : null,
    customerNumber: data.customerNumber,
    firstName: data.firstName,
    lastName: data.lastName,
    contactName: data.contactName,
    email: data.email,
    phone: data.phone,
    street: data.street,
    houseNumber: data.houseNumber,
    postalCode: data.postalCode,
    city: data.city,
    country: data.country,
    billingAddressDiffers: els.billingAddressDiffersInput.checked,
    billingRecipient: data.billingRecipient,
    billingStreet: data.billingStreet,
    billingHouseNumber: data.billingHouseNumber,
    billingPostalCode: data.billingPostalCode,
    billingCity: data.billingCity,
    billingCountry: data.billingCountry,
    ...getCustomerMaintenanceWeekdayPayload(),
    notes: data.notes
  };
}

function syncBillingAddressFields() {
  const isVisible = els.billingAddressDiffersInput.checked;
  const billingCountrySelect = els.customerForm.elements.billingCountry;
  els.billingFields.hidden = !isVisible;
  els.billingFields.querySelectorAll("input").forEach((input) => {
    input.required = isVisible;
    if (!isVisible) {
      input.value = "";
    }
  });
  if (!isVisible || !billingCountrySelect.value || billingCountrySelect.value === "Deutschland") {
    setSelectValue(billingCountrySelect, els.customerForm.elements.country.value || "Deutschland");
  }
  syncSearchableSelect(billingCountrySelect);
}

function resetCustomerForm() {
  els.customerForm.reset();
  els.customerIdInput.value = "";
  setSelectValue(els.customerForm.elements.country, "Deutschland");
  setSelectValue(els.customerForm.elements.billingCountry, "Deutschland");
  applyCustomerMaintenanceWeekdays();
  syncBillingAddressFields();
  els.customerSubmitButton.textContent = "Kunde speichern";
}

function loadCustomerIntoForm(customer) {
  els.customerForm.elements.customerId.value = customer.id;
  els.customerForm.elements.customerNumber.value = customer.customerNumber || "";
  els.customerForm.elements.firstName.value = customer.firstName || "";
  els.customerForm.elements.lastName.value = customer.lastName || "";
  els.customerForm.elements.contactName.value = customer.contactName || "";
  els.customerForm.elements.email.value = customer.email || "";
  els.customerForm.elements.phone.value = customer.phone || "";
  els.customerForm.elements.street.value = customer.street || "";
  els.customerForm.elements.houseNumber.value = customer.houseNumber || "";
  els.customerForm.elements.postalCode.value = customer.postalCode || "";
  els.customerForm.elements.city.value = customer.city || "";
  setSelectValue(els.customerForm.elements.country, customer.country, "Deutschland");
  els.customerForm.elements.billingAddressDiffers.checked = Number(customer.billingAddressDiffers) === 1;
  syncBillingAddressFields();
  els.customerForm.elements.billingRecipient.value = customer.billingRecipient || "";
  els.customerForm.elements.billingStreet.value = customer.billingStreet || "";
  els.customerForm.elements.billingHouseNumber.value = customer.billingHouseNumber || "";
  els.customerForm.elements.billingPostalCode.value = customer.billingPostalCode || "";
  els.customerForm.elements.billingCity.value = customer.billingCity || "";
  setSelectValue(els.customerForm.elements.billingCountry, customer.billingCountry || customer.country, "Deutschland");
  applyCustomerMaintenanceWeekdays(customer);
  els.customerForm.elements.notes.value = customer.notes || "";
  els.customerSubmitButton.textContent = "Änderungen speichern";
  setView("kunden", { updateHash: true, scrollTop: false });
  window.setTimeout(() => scrollToTarget("customerForm"), 0);
}

function getEmployeeFormPayload() {
  const data = Object.fromEntries(new FormData(els.employeeForm));
  return {
    id: data.employeeId ? Number(data.employeeId) : null,
    employeeNumber: data.employeeNumber,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    phone: data.phone,
    functionId: data.functionId ? Number(data.functionId) : null,
    active: els.employeeActiveInput.checked,
    notes: data.notes
  };
}

function resetEmployeeForm() {
  els.employeeForm.reset();
  els.employeeIdInput.value = "";
  els.employeeActiveInput.checked = true;
  syncSearchableSelect(els.employeeFunctionSelect);
  els.employeeSubmitButton.textContent = "Mitarbeiter speichern";
}

function loadEmployeeIntoForm(employee) {
  els.employeeForm.elements.employeeId.value = employee.id;
  els.employeeForm.elements.employeeNumber.value = employee.employeeNumber || "";
  els.employeeForm.elements.firstName.value = employee.firstName || "";
  els.employeeForm.elements.lastName.value = employee.lastName || "";
  els.employeeForm.elements.email.value = employee.email || "";
  els.employeeForm.elements.phone.value = employee.phone || "";
  els.employeeForm.elements.functionId.value = employee.functionId || "";
  els.employeeForm.elements.active.checked = Number(employee.active) === 1;
  els.employeeForm.elements.notes.value = employee.notes || "";
  syncSearchableSelect(els.employeeFunctionSelect);
  els.employeeSubmitButton.textContent = "Änderungen speichern";
  setView("mitarbeiter", { updateHash: true, scrollTop: false });
  window.setTimeout(() => scrollToTarget("employeeForm"), 0);
}

function resetEmployeeFunctionForm() {
  els.employeeFunctionForm.reset();
  els.employeeFunctionIdInput.value = "";
  els.employeeFunctionSubmitButton.textContent = "Funktion speichern";
}

function loadEmployeeFunctionIntoForm(employeeFunction) {
  els.employeeFunctionForm.elements.employeeFunctionId.value = employeeFunction.id;
  els.employeeFunctionForm.elements.name.value = employeeFunction.name || "";
  els.employeeFunctionForm.elements.notes.value = employeeFunction.notes || "";
  els.employeeFunctionSubmitButton.textContent = "Änderungen speichern";
  setView("stammdaten", { updateHash: true, scrollTop: false });
  window.setTimeout(() => scrollToTarget("employeeFunctionForm"), 0);
}

function resetUserRoleForm() {
  els.userRoleForm.reset();
  els.userRoleKeyInput.value = "";
  els.userRoleSubmitButton.textContent = "Rolle speichern";
}

function loadUserRoleIntoForm(role) {
  els.userRoleForm.elements.roleKey.value = role.roleKey || "";
  els.userRoleForm.elements.name.value = role.name || "";
  els.userRoleSubmitButton.textContent = "Änderungen speichern";
  setView("benutzer", { updateHash: true, scrollTop: false });
  window.setTimeout(() => scrollToTarget("userRoleForm"), 0);
}

function findApartmentById(id) {
  for (const building of latestProperties) {
    const apartment = building.apartments.find((item) => String(item.id) === String(id));
    if (apartment) {
      return apartment;
    }
  }

  return null;
}

function resetBuildingForm() {
  els.buildingForm.reset();
  els.buildingIdInput.value = "";
  setSelectValue(els.buildingForm.elements.country, "Deutschland");
  syncSearchableSelect(els.buildingCustomerSelect);
  els.buildingSubmitButton.textContent = "Gebäude speichern";
}

function loadBuildingIntoForm(building) {
  els.buildingForm.elements.buildingId.value = building.id;
  els.buildingForm.elements.customerId.value = building.customerId || "";
  els.buildingForm.elements.name.value = building.name || "";
  els.buildingForm.elements.buildingType.value = building.buildingType || "private_house";
  els.buildingForm.elements.street.value = building.street || "";
  els.buildingForm.elements.houseNumber.value = building.houseNumber || "";
  els.buildingForm.elements.postalCode.value = building.postalCode || "";
  els.buildingForm.elements.city.value = building.city || "";
  setSelectValue(els.buildingForm.elements.country, building.country, "Deutschland");
  syncSearchableSelect(els.buildingCustomerSelect);
  els.buildingSubmitButton.textContent = "Änderungen speichern";
  setView("gebaeude", { updateHash: true, scrollTop: false });
  window.setTimeout(() => scrollToTarget("buildingForm"), 0);
}

function resetApartmentForm() {
  els.apartmentForm.reset();
  els.apartmentIdInput.value = "";
  syncSearchableSelect(els.apartmentBuildingSelect);
  syncSearchableSelect(els.apartmentCustomerSelect);
  els.apartmentSubmitButton.textContent = "Appartment speichern";
}

function loadApartmentIntoForm(apartment) {
  els.apartmentForm.elements.apartmentId.value = apartment.id;
  els.apartmentForm.elements.buildingId.value = apartment.buildingId || "";
  els.apartmentForm.elements.customerId.value = apartment.customerId || "";
  els.apartmentForm.elements.apartmentNumber.value = apartment.apartmentNumber || "";
  els.apartmentForm.elements.name.value = apartment.name || "";
  els.apartmentForm.elements.floor.value = apartment.floor || "";
  syncSearchableSelect(els.apartmentBuildingSelect);
  syncSearchableSelect(els.apartmentCustomerSelect);
  els.apartmentSubmitButton.textContent = "Änderungen speichern";
  setView("gebaeude", { updateHash: true, scrollTop: false });
  window.setTimeout(() => scrollToTarget("apartmentForm"), 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isSafeMaintenanceHtmlUrl(value, allowDataImage = false) {
  const trimmedValue = String(value || "").trim();
  if (!trimmedValue) {
    return false;
  }

  if (trimmedValue.startsWith("/") || trimmedValue.startsWith("./") || trimmedValue.startsWith("../")) {
    return true;
  }

  if (allowDataImage && /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(trimmedValue)) {
    return true;
  }

  try {
    const url = new URL(trimmedValue, window.location.origin);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_error) {
    return false;
  }
}

function sanitizeMaintenanceHtmlNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    return document.createTextNode(node.textContent || "");
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return document.createDocumentFragment();
  }

  const tagName = node.tagName.toLowerCase();
  const fragment = document.createDocumentFragment();
  if (!allowedMaintenanceHtmlTags.has(tagName)) {
    node.childNodes.forEach((child) => fragment.append(sanitizeMaintenanceHtmlNode(child)));
    return fragment;
  }

  const element = document.createElement(tagName);
  const allowedAttributes = allowedMaintenanceHtmlAttributes[tagName] || new Set();
  Array.from(node.attributes).forEach((attribute) => {
    const attributeName = attribute.name.toLowerCase();
    if (!allowedAttributes.has(attributeName)) {
      return;
    }

    if (attributeName === "href" && !isSafeMaintenanceHtmlUrl(attribute.value)) {
      return;
    }

    if (attributeName === "src" && !isSafeMaintenanceHtmlUrl(attribute.value, true)) {
      return;
    }

    element.setAttribute(attributeName, attribute.value);
  });

  if (tagName === "a") {
    element.setAttribute("rel", "noopener noreferrer");
  }

  node.childNodes.forEach((child) => element.append(sanitizeMaintenanceHtmlNode(child)));
  return element;
}

function sanitizeMaintenanceHtml(html) {
  const template = document.createElement("template");
  template.innerHTML = String(html || "");
  const output = document.createElement("div");
  template.content.childNodes.forEach((child) => output.append(sanitizeMaintenanceHtmlNode(child)));
  return output.innerHTML;
}

async function loadDashboard() {
  try {
    const range = getCalendarRange();
    const workOrderFilter = els.workOrderStatusFilter?.value || "open";
    const [summary, properties, targets, calendarEvents, workOrders] = await Promise.all([
      api("/api/summary"),
      api("/api/properties"),
      api("/api/maintenance-targets"),
      api(`/api/calendar?start=${range.start}&end=${range.end}`),
      api(`/api/work-orders?filter=${encodeURIComponent(workOrderFilter)}`)
    ]);

    renderSummary(summary);
    renderProperties(properties);
    renderMaintenanceTargetOptions(targets);
    renderCalendar(calendarEvents);
    renderWorkOrders(workOrders);
    setConnectionStatus(true);
  } catch (error) {
    setConnectionStatus(false);
    showToast(error.message);
  }
}

async function loadWorkOrders() {
  const filter = els.workOrderStatusFilter?.value || "open";
  const workOrders = await api(`/api/work-orders?filter=${encodeURIComponent(filter)}`);
  renderWorkOrders(workOrders);
}

async function loadWorkOrderIntoDetail(id) {
  const order = await api(`/api/work-orders/${id}`);
  renderWorkOrderDetail(order);
  setView("auftraege", { updateHash: true, scrollTop: false });
  window.setTimeout(() => scrollToTarget("work-order-detail"), 0);
}

async function loadAssetDetails(id) {
  const details = await api(`/api/assets/${id}/details`);
  renderAssetDetails(details);
}

async function completeWorkOrder(id) {
  await api(`/api/work-orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: "done" })
  });
  showToast("Auftrag erledigt.");
  if (activeWorkOrder && String(activeWorkOrder.id) === String(id)) {
    activeWorkOrder = null;
    els.workOrderDetailForm.hidden = true;
    els.workOrderDetailEmpty.hidden = false;
  }
  await loadDashboard();
}

async function updateWorkOrderCheck(checkId, checked) {
  if (!activeWorkOrder) {
    return;
  }

  const order = await api(`/api/work-orders/${activeWorkOrder.id}/checks/${checkId}`, {
    method: "PATCH",
    body: JSON.stringify({ checked })
  });
  renderWorkOrderDetail(order);
  await loadWorkOrders();
}

async function deleteUser(id) {
  await api(`/api/users/${id}`, {
    method: "DELETE"
  });
  showToast("Benutzer gelöscht.");
  await loadDashboard();
}

async function deleteEmployee(id) {
  if (!window.confirm("Mitarbeiter wirklich löschen? Zugewiesene Wartungspläne bleiben erhalten, verlieren aber die Mitarbeiterzuordnung.")) {
    return;
  }

  await api(`/api/employees/${id}`, {
    method: "DELETE"
  });
  showToast("Mitarbeiter gelöscht.");
  await loadDashboard();
}

async function deleteEmployeeFunction(id) {
  if (!window.confirm("Funktion wirklich löschen? Das geht nur, wenn sie keinem Mitarbeiter zugewiesen ist.")) {
    return;
  }

  await api(`/api/employee-functions/${id}`, {
    method: "DELETE"
  });
  showToast("Funktion gelöscht.");
  await loadDashboard();
}

async function deleteUserRole(roleKey) {
  if (!window.confirm("Rolle wirklich löschen? Admin und Kunde sind geschützt.")) {
    return;
  }

  await api(`/api/user-roles/${encodeURIComponent(roleKey)}`, {
    method: "DELETE"
  });
  showToast("Rolle gelöscht.");
  await loadDashboard();
}

async function deleteCustomer(id) {
  if (!window.confirm("Kunde wirklich löschen? Gebäude und Appartments bleiben erhalten, verlieren aber die Kundenzuordnung.")) {
    return;
  }

  await api(`/api/customers/${id}`, {
    method: "DELETE"
  });
  showToast("Kunde gelöscht.");
  await loadDashboard();
}

async function deleteAsset(id) {
  if (!window.confirm("Wartungsobjekt wirklich löschen? Zugehörige Wartungspläne werden ebenfalls entfernt.")) {
    return;
  }

  await api(`/api/assets/${id}`, {
    method: "DELETE"
  });
  showToast("Wartungsobjekt gelöscht.");
  await loadDashboard();
}

async function deleteAssetCheck(id) {
  if (!window.confirm("Check wirklich löschen? Nicht erledigte Kopien in offenen Aufträgen werden entfernt.")) {
    return;
  }

  const details = await api(`/api/asset-checks/${id}`, {
    method: "DELETE"
  });
  renderAssetDetails(details);
  showToast("Check gelöscht.");
  await loadDashboard();
}

async function deleteMaintenancePlan(id) {
  if (!window.confirm("Wartungsplan wirklich löschen?")) {
    return;
  }

  await api(`/api/maintenance-plans/${id}`, {
    method: "DELETE"
  });
  showToast("Wartungsplan gelöscht.");
  await loadDashboard();
}

async function deleteBuilding(id) {
  if (!window.confirm("Gebäude wirklich löschen? Appartments und zugehörige Wartungspläne werden ebenfalls entfernt.")) {
    return;
  }

  await api(`/api/buildings/${id}`, {
    method: "DELETE"
  });
  showToast("Gebäude gelöscht.");
  await loadDashboard();
}

async function deleteApartment(id) {
  if (!window.confirm("Appartment wirklich löschen? Zugehörige Wartungspläne werden ebenfalls entfernt.")) {
    return;
  }

  await api(`/api/apartments/${id}`, {
    method: "DELETE"
  });
  showToast("Appartment gelöscht.");
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
  resetMaintenanceForm();
  els.maintenanceDueDate.value = dateKey;
  setView("planung", { updateHash: true, scrollTop: false });
  window.setTimeout(() => scrollToTarget("new-maintenance"), 0);
  showToast(`Wartungsplan für ${formatDate(dateKey)} vorbereiten.`);
}

function parseTargetValue(value) {
  const [targetType, targetId] = value.split(":");
  return {
    targetType,
    targetId: Number(targetId)
  };
}

function bindEvents() {
  els.viewLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const hashTarget = link.getAttribute("href")?.replace(/^#/, "") || link.dataset.viewLink;
      setView(link.dataset.viewLink, {
        updateHash: true,
        activeNav: link.dataset.navKey || link.dataset.viewLink,
        hashTarget
      });

      if (link.dataset.scrollTarget) {
        window.setTimeout(() => scrollToTarget(link.dataset.scrollTarget), 0);
      }
    });
  });

  window.addEventListener("hashchange", showViewFromHash);
  window.addEventListener("popstate", showViewFromHash);

  els.workOrderRefreshButton.addEventListener("click", () => {
    loadWorkOrders().catch((error) => showToast(error.message));
  });
  els.workOrderStatusFilter.addEventListener("change", () => {
    loadWorkOrders().catch((error) => showToast(error.message));
  });
  els.logoutButton.addEventListener("click", () => {
    logout().catch((error) => showToast(error.message));
  });

  els.assetSearchInput.addEventListener("input", () => renderAssets(latestAssets));
  els.assetAddressFilterInput.addEventListener("input", () => renderAssets(latestAssets));
  els.assetCustomerFilter.addEventListener("change", () => renderAssets(latestAssets));
  els.assetCriticalityFilter.addEventListener("change", () => renderAssets(latestAssets));
  els.assetFilterResetButton.addEventListener("click", () => {
    els.assetSearchInput.value = "";
    els.assetAddressFilterInput.value = "";
    els.assetCustomerFilter.value = "";
    els.assetCriticalityFilter.value = "";
    renderAssets(latestAssets);
  });

  els.customerSearchInput.addEventListener("input", () => renderCustomers(latestCustomers));
  els.customerAddressFilterInput.addEventListener("input", () => renderCustomers(latestCustomers));
  els.customerWeekdayFilter.addEventListener("change", () => renderCustomers(latestCustomers));
  els.customerFilterResetButton.addEventListener("click", () => {
    els.customerSearchInput.value = "";
    els.customerAddressFilterInput.value = "";
    els.customerWeekdayFilter.value = "";
    renderCustomers(latestCustomers);
  });

  els.propertySearchInput.addEventListener("input", () => renderProperties(latestProperties));
  els.propertyAddressFilterInput.addEventListener("input", () => renderProperties(latestProperties));
  els.propertyCustomerFilter.addEventListener("change", () => renderProperties(latestProperties));
  els.propertyTypeFilter.addEventListener("change", () => renderProperties(latestProperties));
  els.propertyFilterResetButton.addEventListener("click", () => {
    els.propertySearchInput.value = "";
    els.propertyAddressFilterInput.value = "";
    els.propertyCustomerFilter.value = "";
    els.propertyTypeFilter.value = "";
    renderProperties(latestProperties);
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
      if (scrollTarget.dataset.viewTarget) {
        setView(scrollTarget.dataset.viewTarget, { updateHash: true, scrollTop: false });
      }
      window.setTimeout(() => scrollToTarget(scrollTarget.dataset.scrollTarget), 0);
    }

    const calendarDay = event.target.closest("[data-calendar-day]");
    if (calendarDay) {
      setMaintenanceDate(calendarDay.dataset.calendarDay);
    }

    const completeButton = event.target.closest("[data-complete]");
    if (completeButton) {
      event.stopPropagation();
      completeWorkOrder(completeButton.dataset.complete).catch((error) => showToast(error.message));
      return;
    }

    const editWorkOrder = event.target.closest("[data-edit-work-order]");
    if (editWorkOrder) {
      loadWorkOrderIntoDetail(editWorkOrder.dataset.editWorkOrder).catch((error) => showToast(error.message));
      return;
    }

    const openWorkOrder = event.target.closest("[data-open-work-order]");
    if (openWorkOrder) {
      loadWorkOrderIntoDetail(openWorkOrder.dataset.openWorkOrder).catch((error) => showToast(error.message));
      return;
    }

    const deleteAssetCheckButton = event.target.closest("[data-delete-asset-check]");
    if (deleteAssetCheckButton) {
      event.stopPropagation();
      deleteAssetCheck(deleteAssetCheckButton.dataset.deleteAssetCheck).catch((error) => showToast(error.message));
      return;
    }

    const deleteUserButton = event.target.closest("[data-delete-user]");
    if (deleteUserButton) {
      deleteUser(deleteUserButton.dataset.deleteUser).catch((error) => showToast(error.message));
    }

    const deleteEmployeeButton = event.target.closest("[data-delete-employee]");
    if (deleteEmployeeButton) {
      event.stopPropagation();
      deleteEmployee(deleteEmployeeButton.dataset.deleteEmployee).catch((error) => showToast(error.message));
      return;
    }

    const deleteEmployeeFunctionButton = event.target.closest("[data-delete-employee-function]");
    if (deleteEmployeeFunctionButton) {
      event.stopPropagation();
      deleteEmployeeFunction(deleteEmployeeFunctionButton.dataset.deleteEmployeeFunction).catch((error) => showToast(error.message));
      return;
    }

    const deleteUserRoleButton = event.target.closest("[data-delete-user-role]");
    if (deleteUserRoleButton) {
      event.stopPropagation();
      deleteUserRole(deleteUserRoleButton.dataset.deleteUserRole).catch((error) => showToast(error.message));
      return;
    }

    const deleteCustomerButton = event.target.closest("[data-delete-customer]");
    if (deleteCustomerButton) {
      event.stopPropagation();
      deleteCustomer(deleteCustomerButton.dataset.deleteCustomer).catch((error) => showToast(error.message));
      return;
    }

    const deleteAssetButton = event.target.closest("[data-delete-asset]");
    if (deleteAssetButton) {
      event.stopPropagation();
      deleteAsset(deleteAssetButton.dataset.deleteAsset).catch((error) => showToast(error.message));
      return;
    }

    const duplicateAssetButton = event.target.closest("[data-duplicate-asset]");
    if (duplicateAssetButton) {
      event.stopPropagation();
      const asset = latestAssets.find((item) => String(item.id) === String(duplicateAssetButton.dataset.duplicateAsset));
      if (asset) {
        duplicateAssetInForm(asset);
      }
      return;
    }

    const deletePlanButton = event.target.closest("[data-delete-plan]");
    if (deletePlanButton) {
      event.stopPropagation();
      deleteMaintenancePlan(deletePlanButton.dataset.deletePlan).catch((error) => showToast(error.message));
      return;
    }

    const deleteBuildingButton = event.target.closest("[data-delete-building]");
    if (deleteBuildingButton) {
      event.stopPropagation();
      deleteBuilding(deleteBuildingButton.dataset.deleteBuilding).catch((error) => showToast(error.message));
      return;
    }

    const deleteApartmentButton = event.target.closest("[data-delete-apartment]");
    if (deleteApartmentButton) {
      event.stopPropagation();
      deleteApartment(deleteApartmentButton.dataset.deleteApartment).catch((error) => showToast(error.message));
      return;
    }

    const editAsset = event.target.closest("[data-edit-asset]");
    if (editAsset) {
      const asset = latestAssets.find((item) => String(item.id) === String(editAsset.dataset.editAsset));
      if (asset) {
        loadAssetIntoForm(asset);
      }
    }

    const editCustomer = event.target.closest("[data-edit-customer]");
    if (editCustomer) {
      const customer = latestCustomers.find((item) => String(item.id) === String(editCustomer.dataset.editCustomer));
      if (customer) {
        loadCustomerIntoForm(customer);
      }
    }

    const editEmployee = event.target.closest("[data-edit-employee]");
    if (editEmployee) {
      const employee = latestEmployees.find((item) => String(item.id) === String(editEmployee.dataset.editEmployee));
      if (employee) {
        loadEmployeeIntoForm(employee);
      }
      return;
    }

    const editEmployeeFunction = event.target.closest("[data-edit-employee-function]");
    if (editEmployeeFunction) {
      const employeeFunction = latestEmployeeFunctions.find((item) => String(item.id) === String(editEmployeeFunction.dataset.editEmployeeFunction));
      if (employeeFunction) {
        loadEmployeeFunctionIntoForm(employeeFunction);
      }
      return;
    }

    const editUserRole = event.target.closest("[data-edit-user-role]");
    if (editUserRole) {
      const role = latestUserRoles.find((item) => item.roleKey === editUserRole.dataset.editUserRole);
      if (role) {
        loadUserRoleIntoForm(role);
      }
      return;
    }

    const editPlan = event.target.closest("[data-edit-plan]");
    if (editPlan) {
      const plan = latestPlans.find((item) => String(item.id) === String(editPlan.dataset.editPlan));
      if (plan) {
        loadMaintenancePlanIntoForm(plan);
      }
      return;
    }

    const editApartment = event.target.closest("[data-edit-apartment]");
    if (editApartment) {
      event.stopPropagation();
      const apartment = findApartmentById(editApartment.dataset.editApartment);
      if (apartment) {
        loadApartmentIntoForm(apartment);
      }
      return;
    }

    const editBuilding = event.target.closest("[data-edit-building]");
    if (editBuilding) {
      const building = latestProperties.find((item) => String(item.id) === String(editBuilding.dataset.editBuilding));
      if (building) {
        loadBuildingIntoForm(building);
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    if (event.target.closest("button")) {
      return;
    }

    const editWorkOrder = event.target.closest("[data-edit-work-order]");
    if (editWorkOrder) {
      event.preventDefault();
      loadWorkOrderIntoDetail(editWorkOrder.dataset.editWorkOrder).catch((error) => showToast(error.message));
      return;
    }

    const openWorkOrder = event.target.closest("[data-open-work-order]");
    if (openWorkOrder) {
      event.preventDefault();
      loadWorkOrderIntoDetail(openWorkOrder.dataset.openWorkOrder).catch((error) => showToast(error.message));
      return;
    }

    const editAsset = event.target.closest("[data-edit-asset]");
    if (editAsset) {
      event.preventDefault();
      const asset = latestAssets.find((item) => String(item.id) === String(editAsset.dataset.editAsset));
      if (asset) {
        loadAssetIntoForm(asset);
      }
      return;
    }

    const editCustomer = event.target.closest("[data-edit-customer]");
    if (editCustomer) {
      event.preventDefault();
      const customer = latestCustomers.find((item) => String(item.id) === String(editCustomer.dataset.editCustomer));
      if (customer) {
        loadCustomerIntoForm(customer);
      }
      return;
    }

    const editEmployee = event.target.closest("[data-edit-employee]");
    if (editEmployee) {
      event.preventDefault();
      const employee = latestEmployees.find((item) => String(item.id) === String(editEmployee.dataset.editEmployee));
      if (employee) {
        loadEmployeeIntoForm(employee);
      }
      return;
    }

    const editEmployeeFunction = event.target.closest("[data-edit-employee-function]");
    if (editEmployeeFunction) {
      event.preventDefault();
      const employeeFunction = latestEmployeeFunctions.find((item) => String(item.id) === String(editEmployeeFunction.dataset.editEmployeeFunction));
      if (employeeFunction) {
        loadEmployeeFunctionIntoForm(employeeFunction);
      }
      return;
    }

    const editUserRole = event.target.closest("[data-edit-user-role]");
    if (editUserRole) {
      event.preventDefault();
      const role = latestUserRoles.find((item) => item.roleKey === editUserRole.dataset.editUserRole);
      if (role) {
        loadUserRoleIntoForm(role);
      }
      return;
    }

    const editApartment = event.target.closest("[data-edit-apartment]");
    if (editApartment) {
      event.preventDefault();
      const apartment = findApartmentById(editApartment.dataset.editApartment);
      if (apartment) {
        loadApartmentIntoForm(apartment);
      }
      return;
    }

    const editBuilding = event.target.closest("[data-edit-building]");
    if (editBuilding) {
      event.preventDefault();
      const building = latestProperties.find((item) => String(item.id) === String(editBuilding.dataset.editBuilding));
      if (building) {
        loadBuildingIntoForm(building);
      }
    }
  });

  els.workOrderDetailForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.workOrderDetailForm));
    if (!data.workOrderId) {
      return;
    }

    const order = await api(`/api/work-orders/${data.workOrderId}`, {
      method: "PATCH",
      body: JSON.stringify({
        title: data.title,
        status: data.status,
        priority: data.priority,
        dueDate: data.dueDate,
        description: data.description
      })
    });

    renderWorkOrderDetail(order);
    showToast("Auftrag aktualisiert.");
    await loadDashboard();
  });

  els.workOrderDoneButton.addEventListener("click", () => {
    if (activeWorkOrder) {
      completeWorkOrder(activeWorkOrder.id).catch((error) => showToast(error.message));
    }
  });

  els.workOrderCheckList.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-work-order-check]");
    if (!checkbox) {
      return;
    }

    updateWorkOrderCheck(checkbox.dataset.workOrderCheck, checkbox.checked).catch((error) => showToast(error.message));
  });

  els.maintenanceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateSearchableSelect(els.maintenanceTargetSelect, "Bitte ein Wartungsobjekt aus der Liste auswählen.")) {
      return;
    }

    if (!validateSearchableSelect(els.maintenanceEmployeeSelect, "Bitte einen Mitarbeiter aus der Liste auswählen oder das Feld leeren.")) {
      return;
    }

    const data = Object.fromEntries(new FormData(els.maintenanceForm));
    const target = parseTargetValue(data.target);
    const planId = data.maintenancePlanId ? Number(data.maintenancePlanId) : null;

    await api(planId ? `/api/maintenance-plans/${planId}` : "/api/maintenance-plans", {
      method: planId ? "PATCH" : "POST",
      body: JSON.stringify({
        targetType: target.targetType,
        targetId: target.targetId,
        employeeId: data.employeeId ? Number(data.employeeId) : null,
        intervalDays: Number(data.intervalDays),
        nextDueOn: data.nextDueOn,
        instructionsHtml: data.instructionsHtml
      })
    });

    resetMaintenanceForm();
    showToast(planId ? "Wartungsplan aktualisiert." : "Wartungsplan gespeichert.");
    await loadDashboard();
  });

  els.maintenanceNewButton.addEventListener("click", resetMaintenanceForm);

  els.assetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateSearchableSelect(els.assetPropertyTargetSelect, "Bitte eine Zuordnung aus der Liste auswählen oder das Feld leeren.")) {
      return;
    }

    const data = getAssetFormPayload();
    const isUpdate = Boolean(data.id);

    await api(isUpdate ? `/api/assets/${data.id}` : "/api/assets", {
      method: isUpdate ? "PATCH" : "POST",
      body: JSON.stringify({
        name: data.name,
        assetType: data.assetType,
        location: data.location,
        serialNumber: data.serialNumber,
        qrCode: data.qrCode,
        criticality: data.criticality,
        instructionsHtml: data.instructionsHtml,
        propertyTarget: data.propertyTarget
      })
    });

    resetAssetForm();
    showToast(isUpdate ? "Wartungsobjekt aktualisiert." : "Wartungsobjekt gespeichert.");
    await loadDashboard();
  });

  els.assetNewButton.addEventListener("click", resetAssetForm);

  els.assetCheckForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.assetCheckForm));
    const assetId = data.assetCheckAssetId;
    const label = data.label?.trim();
    if (!assetId || !label) {
      showToast("Bitte zuerst ein Objekt wählen und einen Check eingeben.");
      return;
    }

    const details = await api(`/api/assets/${assetId}/checks`, {
      method: "POST",
      body: JSON.stringify({ label })
    });

    els.assetCheckForm.reset();
    els.assetCheckAssetIdInput.value = assetId;
    renderAssetDetails(details);
    showToast("Check hinzugefügt.");
    await loadDashboard();
  });

  els.customerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateRequiredSearchableSelect(els.customerForm.elements.country, "Bitte ein Land aus der Liste auswählen.")) {
      return;
    }
    if (els.billingAddressDiffersInput.checked && !validateRequiredSearchableSelect(els.customerForm.elements.billingCountry, "Bitte ein RE-Land aus der Liste auswählen.")) {
      return;
    }

    const data = getCustomerFormPayload();
    const isUpdate = Boolean(data.id);

    await api(isUpdate ? `/api/customers/${data.id}` : "/api/customers", {
      method: isUpdate ? "PATCH" : "POST",
      body: JSON.stringify({
        customerNumber: data.customerNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        street: data.street,
        houseNumber: data.houseNumber,
        postalCode: data.postalCode,
        city: data.city,
        country: data.country,
        billingAddressDiffers: data.billingAddressDiffers,
        billingRecipient: data.billingRecipient,
        billingStreet: data.billingStreet,
        billingHouseNumber: data.billingHouseNumber,
        billingPostalCode: data.billingPostalCode,
        billingCity: data.billingCity,
        billingCountry: data.billingCountry,
        maintenanceMonday: data.maintenanceMonday,
        maintenanceTuesday: data.maintenanceTuesday,
        maintenanceWednesday: data.maintenanceWednesday,
        maintenanceThursday: data.maintenanceThursday,
        maintenanceFriday: data.maintenanceFriday,
        maintenanceSaturday: data.maintenanceSaturday,
        maintenanceSunday: data.maintenanceSunday,
        notes: data.notes
      })
    });

    resetCustomerForm();
    showToast(isUpdate ? "Kunde aktualisiert." : "Kunde angelegt.");
    await loadDashboard();
  });

  els.customerNewButton.addEventListener("click", resetCustomerForm);
  els.billingAddressDiffersInput.addEventListener("change", syncBillingAddressFields);
  els.customerForm.elements.country.addEventListener("change", () => {
    if (!els.billingAddressDiffersInput.checked) {
      setSelectValue(els.customerForm.elements.billingCountry, els.customerForm.elements.country.value || "Deutschland");
    }
  });

  els.buildingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateSearchableSelect(els.buildingCustomerSelect, "Bitte einen Kunden aus der Liste auswählen oder das Feld leeren.")) {
      return;
    }
    if (!validateRequiredSearchableSelect(els.buildingForm.elements.country, "Bitte ein Land aus der Liste auswählen.")) {
      return;
    }

    const data = Object.fromEntries(new FormData(els.buildingForm));
    const isUpdate = Boolean(data.buildingId);

    await api(isUpdate ? `/api/buildings/${data.buildingId}` : "/api/buildings", {
      method: isUpdate ? "PATCH" : "POST",
      body: JSON.stringify({
        customerId: data.customerId ? Number(data.customerId) : null,
        name: data.name,
        street: data.street,
        houseNumber: data.houseNumber,
        postalCode: data.postalCode,
        city: data.city,
        country: data.country,
        buildingType: data.buildingType
      })
    });

    resetBuildingForm();
    showToast(isUpdate ? "Gebäude aktualisiert." : "Gebäude angelegt.");
    await loadDashboard();
  });

  els.apartmentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateSearchableSelect(els.apartmentBuildingSelect, "Bitte ein Gebäude aus der Liste auswählen.")) {
      return;
    }

    if (!validateSearchableSelect(els.apartmentCustomerSelect, "Bitte einen Kunden aus der Liste auswählen oder das Feld leeren.")) {
      return;
    }

    const data = Object.fromEntries(new FormData(els.apartmentForm));
    const isUpdate = Boolean(data.apartmentId);

    await api(isUpdate ? `/api/apartments/${data.apartmentId}` : "/api/apartments", {
      method: isUpdate ? "PATCH" : "POST",
      body: JSON.stringify({
        buildingId: Number(data.buildingId),
        customerId: data.customerId ? Number(data.customerId) : null,
        apartmentNumber: data.apartmentNumber,
        name: data.name,
        floor: data.floor
      })
    });

    resetApartmentForm();
    showToast(isUpdate ? "Appartment aktualisiert." : "Appartment angelegt.");
    await loadDashboard();
  });

  els.buildingNewButton.addEventListener("click", resetBuildingForm);
  els.apartmentNewButton.addEventListener("click", resetApartmentForm);

  els.employeeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateSearchableSelect(els.employeeFunctionSelect, "Bitte eine Funktion aus der Liste auswählen oder das Feld leeren.")) {
      return;
    }

    const data = getEmployeeFormPayload();
    const isUpdate = Boolean(data.id);

    await api(isUpdate ? `/api/employees/${data.id}` : "/api/employees", {
      method: isUpdate ? "PATCH" : "POST",
      body: JSON.stringify({
        employeeNumber: data.employeeNumber,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        functionId: data.functionId,
        active: data.active,
        notes: data.notes
      })
    });

    resetEmployeeForm();
    showToast(isUpdate ? "Mitarbeiter aktualisiert." : "Mitarbeiter angelegt.");
    await loadDashboard();
  });

  els.employeeNewButton.addEventListener("click", resetEmployeeForm);

  els.employeeFunctionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.employeeFunctionForm));
    const isUpdate = Boolean(data.employeeFunctionId);

    await api(isUpdate ? `/api/employee-functions/${data.employeeFunctionId}` : "/api/employee-functions", {
      method: isUpdate ? "PATCH" : "POST",
      body: JSON.stringify({
        name: data.name,
        notes: data.notes
      })
    });

    resetEmployeeFunctionForm();
    showToast(isUpdate ? "Funktion aktualisiert." : "Funktion angelegt.");
    await loadDashboard();
  });

  els.employeeFunctionNewButton.addEventListener("click", resetEmployeeFunctionForm);

  els.appSettingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    await api("/api/settings", {
      method: "PATCH",
      body: JSON.stringify({
        skipSaturdaysForMaintenance: els.skipSaturdaysForMaintenanceInput.checked,
        skipSundaysForMaintenance: els.skipSundaysForMaintenanceInput.checked
      })
    });

    showToast("Stammdaten gespeichert.");
    await loadDashboard();
  });

  els.userForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateSearchableSelect(els.userRoleSelect, "Bitte eine Rolle aus der Liste auswählen.")) {
      return;
    }

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
    els.userRoleSelect.value = "customer";
    syncSearchableSelect(els.userRoleSelect);
    showToast("Benutzer angelegt.");
    await loadDashboard();
  });

  els.userRoleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(els.userRoleForm));
    const isUpdate = Boolean(data.roleKey);

    await api(isUpdate ? `/api/user-roles/${encodeURIComponent(data.roleKey)}` : "/api/user-roles", {
      method: isUpdate ? "PATCH" : "POST",
      body: JSON.stringify({
        name: data.name
      })
    });

    resetUserRoleForm();
    showToast(isUpdate ? "Rolle aktualisiert." : "Rolle angelegt.");
    await loadDashboard();
  });

  els.userRoleNewButton.addEventListener("click", resetUserRoleForm);
}

populateCountrySelects();
initializeSearchableSelects();
syncBillingAddressFields();
bindEvents();
showViewFromHash();
loadAppVersion();
loadCurrentUser().catch(() => {
  window.location.href = "/login";
});
loadDashboard();
