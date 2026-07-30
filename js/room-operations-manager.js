"use strict";

const PROFESSIONAL_ROOM_STATE = {
  daily: null,
  configuration: null,
  configurationSection: "masters",
  inventory: null,
  inventoryImages: [],
  inventoryLayout: "table",
  inventoryQuery: { page: 1, pageSize: 25, sort: "roomNumber", direction: "asc" },
  inventorySearchTimer: null,
  selectedRoomId: null,
  selectedRoomTrigger: null,
  report: null,
  view: "home"
};

function professionalRoomEscape(value = "") {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function professionalRoomMoney(value = 0) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
}

function professionalRoomStatus(id, message, isError = false) {
  const element = document.getElementById(id);
  if (!element) return;
  element.hidden = false;
  element.className = `staff-status${isError ? " is-error" : ""}`;
  element.textContent = message;
}

function professionalRoomJsonOptions(method, body) {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

function syncProfessionalRoomNavigation(view, { historyMode = "push" } = {}) {
  PROFESSIONAL_ROOM_STATE.view = view;
  document.querySelectorAll("[data-room-shell-view]").forEach((button) => {
    const active = button.dataset.roomShellView === view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
  if (historyMode === "none") return;
  const url = new URL(window.location.href);
  if (view === "home") url.searchParams.delete("roomView");
  else url.searchParams.set("roomView", view);
  const state = { ...(window.history.state || {}), roomView: view };
  window.history[historyMode === "replace" ? "replaceState" : "pushState"](state, "", url);
}

function showProfessionalRoomView(view, { historyMode = "push", focus = true } = {}) {
  const allowed = ["home", "daily", "availability", "bookings", "booking", "housekeeping", "maintenance", "service", "inventory", "configuration", "reports"];
  const managerOnly = ["inventory", "configuration", "reports"];
  const safeView = allowed.includes(view) && (!managerOnly.includes(view) || isStaffManagerSession()) ? view : "home";
  const legacyViews = ["home", "availability", "bookings", "booking", "service"];
  if (legacyViews.includes(safeView)) {
    showStaffRoomOperationsView(safeView, { focus, historyMode });
    if (safeView === "service") void ensureStaffRoomServiceMenuLoaded?.();
    if (safeView === "bookings") {
      const source = new URL(window.location.href).searchParams.get("roomSource") || STAFF_STATE.roomBookingSource || "website";
      selectStaffRoomBookingSource?.(source, { historyMode: "replace", load: true, acknowledge: true });
    }
    return;
  }
  document.querySelectorAll("[data-staff-room-operations-view]").forEach((panel) => {
    panel.hidden = panel.dataset.staffRoomOperationsView !== safeView;
  });
  STAFF_STATE.roomOperationsView = safeView;
  syncProfessionalRoomNavigation(safeView, { historyMode });
  if (focus) document.querySelector(`[data-staff-room-operations-view="${safeView}"] h4`)?.focus?.();
  if (["daily", "housekeeping", "maintenance"].includes(safeView)) void loadProfessionalRoomDaily(safeView);
  if (safeView === "inventory") void loadProfessionalRoomInventory();
  if (safeView === "configuration") void loadProfessionalRoomConfiguration();
  if (safeView === "reports") void loadProfessionalRoomReport();
}

function openProfessionalRoomDeepLink() {
  const requested = new URL(window.location.href).searchParams.get("roomView") || "home";
  showProfessionalRoomView(requested, { historyMode: "replace", focus: false });
}

window.syncProfessionalRoomNavigation = syncProfessionalRoomNavigation;
window.openProfessionalRoomDeepLink = openProfessionalRoomDeepLink;
function professionalRoomSummaryCard(label, value, detail = "") {
  return `<article class="staff-summary-card"><span>${professionalRoomEscape(label)}</span><strong>${professionalRoomEscape(value)}</strong>${detail ? `<small>${professionalRoomEscape(detail)}</small>` : ""}</article>`;
}

function professionalRoomBookingRows(title, records = [], kind = "booking") {
  const rows = records.length ? records.map((record) => `
    <div class="professional-room-list-row">
      <div><strong>${professionalRoomEscape(record.guest_name || `Booking #${record.id}`)}</strong><p>Room ${professionalRoomEscape(record.room_id)} · ${professionalRoomEscape(record.check_in_date)} to ${professionalRoomEscape(record.check_out_date)} · ${professionalRoomEscape(record.booking_status)}</p></div>
      ${kind === "stay" && isStaffManagerSession() ? professionalRoomStayActions(record) : ""}
    </div>`).join("") : '<div class="professional-room-empty">Nothing in this queue.</div>';
  return `<section class="professional-room-card"><h5>${professionalRoomEscape(title)}</h5>${rows}</section>`;
}

function professionalRoomStayActions(booking) {
  const rooms = PROFESSIONAL_ROOM_STATE.daily?.rooms || [];
  const targets = rooms.filter((room) => String(room.id) !== String(booking.room_id) && room.is_active !== false && !["maintenance", "inactive"].includes(room.status));
  return `<details><summary>Manage stay</summary>
    <form class="professional-room-inline" data-professional-shift-form="${professionalRoomEscape(booking.id)}">
      <label class="staff-field"><span class="staff-label">Move to</span><select class="staff-select" name="targetRoomId" required><option value="">Choose room</option>${targets.map((room) => `<option value="${professionalRoomEscape(room.id)}">Room ${professionalRoomEscape(room.room_number)}</option>`).join("")}</select></label>
      <label class="staff-field"><span class="staff-label">Reason</span><input class="staff-input" name="reason" minlength="2" maxlength="2000" required></label><button class="staff-btn" type="submit">Shift Room</button>
    </form>
    <form class="professional-room-inline" data-professional-extend-form="${professionalRoomEscape(booking.id)}">
      <label class="staff-field"><span class="staff-label">New checkout</span><input class="staff-input" type="date" name="newCheckOutDate" min="${professionalRoomEscape(booking.check_out_date)}" required></label>
      <label class="staff-field"><span class="staff-label">Reason</span><input class="staff-input" name="reason" maxlength="2000"></label><button class="staff-btn" type="submit">Extend Stay</button>
    </form></details>`;
}

function renderProfessionalRoomDaily(data) {
  const summary = data.summary || {};
  const summaryElement = document.getElementById("staffRoomDailySummary");
  if (summaryElement) summaryElement.innerHTML = [
    ["Arrivals", summary.arrivals || 0], ["Departures", summary.departures || 0],
    ["Current Guests", summary.currentGuests || 0], ["Pending", summary.pendingConfirmations || 0],
    ["Housekeeping", summary.housekeeping || 0], ["Maintenance", summary.maintenance || 0]
  ].map(([label, value]) => professionalRoomSummaryCard(label, value)).join("");
  const content = document.getElementById("staffRoomDailyContent");
  if (content) content.innerHTML = [
    professionalRoomBookingRows("Today’s Arrivals", data.arrivals || []),
    professionalRoomBookingRows("Today’s Departures", data.departures || []),
    professionalRoomBookingRows("Current Guests", data.currentStays || [], "stay"),
    professionalRoomBookingRows("Pending Confirmations", (data.arrivals || []).filter((item) => item.booking_status === "pending"))
  ].join("");
  renderProfessionalHousekeeping(data.housekeeping || []);
  renderProfessionalMaintenance(data.maintenance || []);
  populateProfessionalRoomOptions(data.rooms || []);
}

async function loadProfessionalRoomDaily(view = "daily") {
  professionalRoomStatus("staffRoomDailyStatus", "Loading today’s hotel room operations...");
  try {
    const data = await staffFetchJson(`${STAFF_API_BASE}/room-management/daily`);
    PROFESSIONAL_ROOM_STATE.daily = data;
    renderProfessionalRoomDaily(data);
    professionalRoomStatus("staffRoomDailyStatus", `Updated for ${data.date}.`);
    if (view === "housekeeping") professionalRoomStatus("staffRoomHousekeepingStatus", `${(data.housekeeping || []).length} active housekeeping tasks.`);
    if (view === "maintenance") professionalRoomStatus("staffRoomMaintenanceStatus", `${(data.maintenance || []).length} active maintenance blocks.`);
  } catch (error) {
    professionalRoomStatus(view === "daily" ? "staffRoomDailyStatus" : view === "housekeeping" ? "staffRoomHousekeepingStatus" : "staffRoomMaintenanceStatus", error.message || "Room Operations could not be loaded.", true);
  }
}

function populateProfessionalRoomOptions(rooms = []) {
  ["staffHousekeepingRoomInput", "staffMaintenanceRoomInput"].forEach((elementId) => {
    const element = document.getElementById(elementId);
    if (element) element.innerHTML = '<option value="">Choose room</option>' + rooms.map((room) => `<option value="${professionalRoomEscape(room.id)}">Room ${professionalRoomEscape(room.room_number)}</option>`).join("");
  });
}

function renderProfessionalHousekeeping(tasks) {
  const target = document.getElementById("staffRoomHousekeepingContent");
  if (!target) return;
  target.innerHTML = tasks.length ? tasks.map((task) => `<article class="professional-room-list-row"><div><strong>Room ${professionalRoomEscape(task.room_id)} · ${professionalRoomEscape(task.status)}</strong><p>${professionalRoomEscape(task.priority)} priority${task.assigned_to ? ` · ${professionalRoomEscape(task.assigned_to)}` : ""}${task.notes ? ` · ${professionalRoomEscape(task.notes)}` : ""}</p></div>${isStaffManagerSession() ? `<div class="staff-actions">${["cleaning", "clean", "inspected"].filter((status) => status !== task.status).map((status) => `<button class="staff-btn secondary" type="button" data-housekeeping-status="${status}" data-housekeeping-id="${professionalRoomEscape(task.id)}">Mark ${status}</button>`).join("")}</div>` : ""}</article>`).join("") : '<div class="professional-room-empty">No active housekeeping tasks.</div>';
}

function renderProfessionalMaintenance(records) {
  const target = document.getElementById("staffRoomMaintenanceContent");
  if (!target) return;
  target.innerHTML = records.length ? records.map((record) => `<article class="professional-room-list-row"><div><strong>Room ${professionalRoomEscape(record.room_id)} · ${professionalRoomEscape(record.maintenance_type)}</strong><p>${professionalRoomEscape(record.description)} · ${professionalRoomEscape(record.start_at)}${record.end_at ? ` to ${professionalRoomEscape(record.end_at)}` : " · open ended"}</p></div>${isStaffManagerSession() ? `<button class="staff-btn secondary" type="button" data-maintenance-complete="${professionalRoomEscape(record.id)}">Complete</button>` : ""}</article>`).join("") : '<div class="professional-room-empty">No active maintenance blocks.</div>';
}

function professionalConfigSection(title, rows) {
  return `<section><h5>${professionalRoomEscape(title)}</h5>${rows.length ? rows.join("") : '<div class="professional-room-empty">No records configured.</div>'}</section>`;
}

function renderProfessionalRoomConfiguration(data) {
  const floors = data.floors || [], roomTypes = data.roomTypes || [], rooms = data.rooms || [], ratePlans = data.ratePlans || [];
  const floorInput = document.getElementById("staffManagerRoomFloorInput");
  if (floorInput) floorInput.innerHTML = '<option value="">No persisted floor</option>' + floors.filter((item) => item.is_active).map((item) => `<option value="${item.id}">${professionalRoomEscape(item.floor_name)}</option>`).join("");
  ["staffManagerRoomTypeInput", "staffRatePlanRoomTypeInput"].forEach((id) => { const element = document.getElementById(id); if (element) element.innerHTML = '<option value="">All / no type</option>' + roomTypes.filter((item) => item.is_active).map((item) => `<option value="${item.id}">${professionalRoomEscape(item.name)}</option>`).join(""); });
  const row = (primary, secondary, kind, record) => `<div class="professional-room-list-row"><div><strong>${professionalRoomEscape(primary)}</strong><p>${professionalRoomEscape(secondary)}</p></div><button class="staff-btn secondary" type="button" data-config-toggle="${kind}" data-config-id="${record.id}" data-config-active="${record.is_active !== false}">${record.is_active === false ? "Activate" : "Deactivate"}</button></div>`;
  const rateRoomInput = document.getElementById("staffRatePlanRoomInput");
  if (rateRoomInput) rateRoomInput.innerHTML = '<option value="">All rooms in scope</option>' + rooms.filter((item) => item.is_active !== false).map((item) => `<option value="${item.id}">Room ${professionalRoomEscape(item.room_number)}</option>`).join("");
  const tax = data.roomTax || {};
  const settings = tax.settings || {};
  const setValue = (id, value) => { const element = document.getElementById(id); if (element && value !== undefined && value !== null) element.value = String(value); };
  setValue("staffRoomGstEnabledInput", settings.gst_enabled === true);
  setValue("staffRoomGstRegisteredInput", settings.gst_registered === true);
  setValue("staffRoomGstinInput", settings.gstin || "");
  setValue("staffRoomLegalNameInput", settings.legal_business_name || "");
  setValue("staffRoomTaxStateInput", settings.state_name || "");
  setValue("staffRoomTaxStateCodeInput", settings.state_code || "");
  setValue("staffRoomTaxPlaceInput", settings.place_of_supply || "");
  setValue("staffRoomTaxSacInput", settings.accommodation_sac || "");
  setValue("staffRoomTaxModeInput", settings.default_tax_mode || "exclusive");
  setValue("staffRoomSupplyTypeInput", settings.default_supply_type || "intrastate");
  setValue("staffRoomInvoiceTypeInput", settings.invoice_type || "guest_folio");
  setValue("staffRoomRoundingInput", settings.rounding_rule || "half_up");
  const taxSettingsForm = document.getElementById("staffRoomTaxSettingsForm");
  if (taxSettingsForm) taxSettingsForm.dataset.expectedVersion = settings.version || "";
  const target = document.getElementById("staffRoomConfigurationContent");
  if (target) target.innerHTML = [
    professionalConfigSection("Floors", floors.map((item) => row(item.floor_name, item.floor_code, "floor", item))),
    professionalConfigSection("Room Types", roomTypes.map((item) => row(item.name, professionalRoomMoney(item.base_price), "room-type", item))),
    professionalConfigSection("Room Inventory", rooms.map((item) => row(`Room ${item.room_number}`, `${item.floor || "No floor"} · ${professionalRoomMoney(item.base_price)}`, "room", item))),
    professionalConfigSection("Rate Plans", ratePlans.map((item) => row(item.plan_name, `${item.plan_code} · ${professionalRoomMoney(item.nightly_price)}`, "rate-plan", item)))
  ].join("");
  if (target) {
    const taxRows = (tax.rules || []).map((rule) => `<div class="professional-room-list-row"><div><strong>${professionalRoomEscape(rule.rule_name)}</strong><p>${professionalRoomEscape(`${rule.status} · ${rule.effective_from}${rule.effective_to ? ` to ${rule.effective_to}` : " onward"} · CGST ${rule.cgst_rate}% · SGST ${rule.sgst_rate}% · IGST ${rule.igst_rate}%`)}</p></div><div class="staff-actions"><button class="staff-btn secondary" type="button" data-room-tax-preview="${professionalRoomEscape(rule.id)}">Preview</button>${rule.status === "draft" ? `<button class="staff-btn" type="button" data-room-tax-activate="${professionalRoomEscape(rule.id)}" data-room-tax-version="${professionalRoomEscape(rule.version)}">Activate</button>` : ""}${rule.status === "active" ? `<button class="staff-btn secondary" type="button" data-room-tax-retire="${professionalRoomEscape(rule.id)}" data-room-tax-version="${professionalRoomEscape(rule.version)}">Retire</button>` : ""}</div></div>`);
    target.insertAdjacentHTML("beforeend", `${tax.schemaReady === false ? '<div class="staff-status is-error">Production Room pricing/GST migration is not applied yet. Existing Room configuration remains available.</div>' : ""}${professionalConfigSection("Room GST Rules", taxRows)}`);
  }
}

async function loadProfessionalRoomConfiguration() {
  if (!isStaffManagerSession()) return;
  professionalRoomStatus("staffRoomConfigurationStatus", "Loading hotel room configuration...");
  try {
    const data = await staffFetchJson(`${STAFF_API_BASE}/room-management/configuration`);
    PROFESSIONAL_ROOM_STATE.configuration = data;
    renderProfessionalRoomConfiguration(data);
    professionalRoomStatus("staffRoomConfigurationStatus", `${data.roomReferences?.total ?? (data.rooms || []).length} rooms across ${(data.floors || []).length} floors.`);
  } catch (error) { professionalRoomStatus("staffRoomConfigurationStatus", error.message || "Configuration could not be loaded.", true); }
}

function professionalReportDates() {
  const toInput = document.getElementById("staffRoomReportToInput"), fromInput = document.getElementById("staffRoomReportFromInput");
  const today = new Date(), from = new Date(today); from.setDate(from.getDate() - 29);
  if (toInput && !toInput.value) toInput.value = today.toISOString().slice(0, 10);
  if (fromInput && !fromInput.value) fromInput.value = from.toISOString().slice(0, 10);
  return { from: fromInput?.value || "", to: toInput?.value || "" };
}

async function loadProfessionalRoomReport() {
  if (!isStaffManagerSession()) return;
  const dates = professionalReportDates();
  professionalRoomStatus("staffRoomReportStatus", "Loading Room Reports...");
  try {
    const data = await staffFetchJson(`${STAFF_API_BASE}/room-management/reports/summary?${new URLSearchParams(dates)}`);
    PROFESSIONAL_ROOM_STATE.report = data;
    const summary = data.summary || {}, target = document.getElementById("staffRoomReportSummary");
    if (target) target.innerHTML = [["Bookings",summary.bookings],["Completed Stays",summary.completedStays],["Occupied Nights",summary.occupiedRoomNights],["Net Room Revenue",professionalRoomMoney(summary.netRoomRevenue)],["Room GST",professionalRoomMoney(summary.roomTax)],["Refunds",professionalRoomMoney(summary.refunds)],["Net Payments",professionalRoomMoney(summary.netPayments)],["ADR",professionalRoomMoney(summary.adr)],["Payments",professionalRoomMoney(summary.payments)],["Room Shifts",summary.roomShifts],["Maintenance",summary.maintenanceEvents]].map(([label,value])=>professionalRoomSummaryCard(label,value ?? 0)).join("");
    const content = document.getElementById("staffRoomReportContent");
    if (content) content.innerHTML = `<section><h5>Report formulas</h5>${Object.entries(data.formulas || {}).map(([key,value])=>`<div class="professional-room-list-row"><strong>${professionalRoomEscape(key)}</strong><p>${professionalRoomEscape(value)}</p></div>`).join("")}</section>`;
    professionalRoomStatus("staffRoomReportStatus", `Report loaded for ${data.period.from} to ${data.period.to}.`);
  } catch (error) { professionalRoomStatus("staffRoomReportStatus", error.message || "Report could not be loaded.", true); }
}

function safeCsvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function exportProfessionalRoomCsv() {
  const report = PROFESSIONAL_ROOM_STATE.report;
  if (!report) return professionalRoomStatus("staffRoomReportStatus", "Run the report before exporting.", true);
  const lines = [["Booking ID","Room ID","Check In","Check Out","Status","Source","Nights","Total"], ...(report.bookings || []).map((item)=>[item.id,item.room_id,item.check_in_date,item.check_out_date,item.booking_status,item.booking_source,item.total_nights,item.total_amount])].map((row)=>row.map(safeCsvCell).join(","));
  const url = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a"); anchor.href=url; anchor.download=`room-report-${report.period.from}-${report.period.to}.csv`; anchor.click(); URL.revokeObjectURL(url);
}

async function submitProfessionalForm(form, path, body, statusId) {
  const button = form.querySelector('button[type="submit"]'); if (button) button.disabled = true;
  try { await staffFetchJson(`${STAFF_API_BASE}/room-management${path}`, professionalRoomJsonOptions("POST", body)); professionalRoomStatus(statusId, "Saved successfully."); form.reset(); await Promise.all([loadProfessionalRoomConfiguration(), loadProfessionalRoomDaily()]); }
  catch (error) { professionalRoomStatus(statusId, error.message || "The room operation could not be completed.", true); }
  finally { if (button) button.disabled = false; }
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-professional-room-view], [data-room-shell-view]").forEach((button) => button.addEventListener("click", () => showProfessionalRoomView(button.dataset.professionalRoomView || button.dataset.roomShellView)));
  window.addEventListener("popstate", () => openProfessionalRoomDeepLink());
  document.getElementById("staffFloorForm")?.addEventListener("submit", (event) => { event.preventDefault(); void submitProfessionalForm(event.currentTarget,"/floors",{floorCode:document.getElementById("staffFloorCodeInput").value,floorName:document.getElementById("staffFloorNameInput").value},"staffRoomConfigurationStatus"); });
  document.getElementById("staffRoomTypeManagerForm")?.addEventListener("submit", (event) => { event.preventDefault(); void submitProfessionalForm(event.currentTarget,"/room-types",{name:document.getElementById("staffManagerRoomTypeNameInput").value,basePrice:Number(document.getElementById("staffManagerRoomTypeRateInput").value)},"staffRoomConfigurationStatus"); });
  document.getElementById("staffRoomInventoryForm")?.addEventListener("submit", (event) => { event.preventDefault(); const floorId=Number(document.getElementById("staffManagerRoomFloorInput").value)||null,roomTypeId=Number(document.getElementById("staffManagerRoomTypeInput").value)||null; void submitProfessionalForm(event.currentTarget,"/rooms",{roomNumber:document.getElementById("staffManagerRoomNumberInput").value,floorId,roomTypeId,basePrice:Number(document.getElementById("staffManagerRoomRateInput").value)},"staffRoomConfigurationStatus"); });
  document.getElementById("staffRatePlanForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const endDate = document.getElementById("staffRatePlanEndInput").value;
    const migrationReady = PROFESSIONAL_ROOM_STATE.configuration?.roomTax?.schemaReady === true;
    const payload = {
      planName: document.getElementById("staffRatePlanNameInput").value,
      planCode: document.getElementById("staffRatePlanCodeInput").value,
      roomTypeId: Number(document.getElementById("staffRatePlanRoomTypeInput").value) || null,
      startDate: document.getElementById("staffRatePlanStartInput").value,
      endDate: endDate || null,
      nightlyPrice: Number(document.getElementById("staffRatePlanPriceInput").value),
      isActive: true
    };
    if (migrationReady) {
      payload.roomId = Number(document.getElementById("staffRatePlanRoomInput").value) || null;
      payload.status = "active";
    }
    void submitProfessionalForm(event.currentTarget, "/rate-plans", payload, "staffRoomConfigurationStatus");
  });
  document.getElementById("staffRoomTaxSettingsForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    try {
      const expectedVersion = Number(form.dataset.expectedVersion || 0) || undefined;
      await staffFetchJson(`${STAFF_API_BASE}/room-management/tax/settings`, professionalRoomJsonOptions("PUT", {
        gstEnabled: document.getElementById("staffRoomGstEnabledInput").value === "true",
        gstRegistered: document.getElementById("staffRoomGstRegisteredInput").value === "true",
        gstin: document.getElementById("staffRoomGstinInput").value.trim().toUpperCase(),
        legalBusinessName: document.getElementById("staffRoomLegalNameInput").value.trim(),
        stateName: document.getElementById("staffRoomTaxStateInput").value.trim(),
        stateCode: document.getElementById("staffRoomTaxStateCodeInput").value.trim(),
        placeOfSupply: document.getElementById("staffRoomTaxPlaceInput").value.trim(),
        accommodationSac: document.getElementById("staffRoomTaxSacInput").value.trim(),
        defaultTaxMode: document.getElementById("staffRoomTaxModeInput").value,
        defaultSupplyType: document.getElementById("staffRoomSupplyTypeInput").value,
        invoiceType: document.getElementById("staffRoomInvoiceTypeInput").value,
        roundingRule: document.getElementById("staffRoomRoundingInput").value,
        currency: "INR",
        ...(expectedVersion ? { expectedVersion } : {})
      }));
      professionalRoomStatus("staffRoomConfigurationStatus", "Room GST settings saved.");
      await loadProfessionalRoomConfiguration();
    } catch (error) {
      professionalRoomStatus("staffRoomConfigurationStatus", error.message || "Room GST settings could not be saved.", true);
    } finally {
      if (button) button.disabled = false;
    }
  });
  document.getElementById("staffRoomTaxRuleForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const maximum = document.getElementById("staffRoomTaxRuleMaxInput").value;
    try {
      await staffFetchJson(`${STAFF_API_BASE}/room-management/tax/rules`, professionalRoomJsonOptions("POST", {
        ruleName: document.getElementById("staffRoomTaxRuleNameInput").value,
        accommodationCategory: "room_accommodation",
        calculationBasis: "transaction_value",
        minimumTaxableValue: Number(document.getElementById("staffRoomTaxRuleMinInput").value || 0),
        maximumTaxableValue: maximum === "" ? null : Number(maximum),
        cgstRate: Number(document.getElementById("staffRoomTaxRuleCgstInput").value || 0),
        sgstRate: Number(document.getElementById("staffRoomTaxRuleSgstInput").value || 0),
        igstRate: Number(document.getElementById("staffRoomTaxRuleIgstInput").value || 0),
        cessRate: Number(document.getElementById("staffRoomTaxRuleCessInput").value || 0),
        isExempt: document.getElementById("staffRoomTaxRuleExemptInput").value === "true",
        exemptionReason: document.getElementById("staffRoomTaxRuleExemptionReasonInput").value.trim(),
        taxInclusive: document.getElementById("staffRoomTaxRuleModeInput").value === "true",
        effectiveFrom: document.getElementById("staffRoomTaxRuleFromInput").value,
        effectiveTo: document.getElementById("staffRoomTaxRuleToInput").value || null,
        status: "draft"
      }));
      form.reset();
      professionalRoomStatus("staffRoomConfigurationStatus", "Draft Room GST rule saved. Review and activate it.");
      await loadProfessionalRoomConfiguration();
    } catch (error) {
      professionalRoomStatus("staffRoomConfigurationStatus", error.message || "Room GST rule could not be saved.", true);
    }
  });
  document.getElementById("staffRoomHousekeepingForm")?.addEventListener("submit", (event) => { event.preventDefault(); void submitProfessionalForm(event.currentTarget,"/housekeeping",{roomId:Number(document.getElementById("staffHousekeepingRoomInput").value),priority:document.getElementById("staffHousekeepingPriorityInput").value,notes:document.getElementById("staffHousekeepingNotesInput").value},"staffRoomHousekeepingStatus"); });
  document.getElementById("staffRoomMaintenanceForm")?.addEventListener("submit", (event) => { event.preventDefault(); const start=document.getElementById("staffMaintenanceStartInput").value,end=document.getElementById("staffMaintenanceEndInput").value; void submitProfessionalForm(event.currentTarget,"/maintenance",{roomId:Number(document.getElementById("staffMaintenanceRoomInput").value),startAt:new Date(start).toISOString(),endAt:end?new Date(end).toISOString():null,description:document.getElementById("staffMaintenanceDescriptionInput").value},"staffRoomMaintenanceStatus"); });
  document.getElementById("staffRoomReportRunBtn")?.addEventListener("click", () => void loadProfessionalRoomReport());
  document.getElementById("staffRoomReportCsvBtn")?.addEventListener("click", exportProfessionalRoomCsv);

  document.addEventListener("submit", async (event) => {
    const shiftForm=event.target.closest("[data-professional-shift-form]"),extendForm=event.target.closest("[data-professional-extend-form]"); if(!shiftForm&&!extendForm)return;event.preventDefault();
    const form=shiftForm||extendForm,bookingId=shiftForm?.dataset.professionalShiftForm||extendForm.dataset.professionalExtendForm,data=Object.fromEntries(new FormData(form));
    const path=shiftForm?`/bookings/${bookingId}/shift`:`/bookings/${bookingId}/extend`;if(shiftForm)data.targetRoomId=Number(data.targetRoomId);
    try{await staffFetchJson(`${STAFF_API_BASE}/room-management${path}`,professionalRoomJsonOptions("POST",data));await Promise.all([loadProfessionalRoomDaily(),loadStaffRoomOperations({silent:true})]);}catch(error){professionalRoomStatus("staffRoomDailyStatus",error.message||"Stay update failed.",true);}
  });
  document.addEventListener("click", async (event) => {
    const housekeeping=event.target.closest("[data-housekeeping-id]"),maintenance=event.target.closest("[data-maintenance-complete]"),toggle=event.target.closest("[data-config-toggle]");
    const activateTax = event.target.closest("[data-room-tax-activate]");
    const retireTax = event.target.closest("[data-room-tax-retire]");
    const previewTax = event.target.closest("[data-room-tax-preview]");
    try{
      if(housekeeping){await staffFetchJson(`${STAFF_API_BASE}/room-management/housekeeping/${housekeeping.dataset.housekeepingId}`,professionalRoomJsonOptions("PATCH",{status:housekeeping.dataset.housekeepingStatus}));await loadProfessionalRoomDaily("housekeeping");}
      if(maintenance){await staffFetchJson(`${STAFF_API_BASE}/room-management/maintenance/${maintenance.dataset.maintenanceComplete}`,professionalRoomJsonOptions("PATCH",{status:"completed"}));await loadProfessionalRoomDaily("maintenance");}
      if(toggle){const map={floor:"floors","room-type":"room-types",room:"rooms","rate-plan":"rate-plans",amenity:"amenities"};await staffFetchJson(`${STAFF_API_BASE}/room-management/${map[toggle.dataset.configToggle]}/${toggle.dataset.configId}`,professionalRoomJsonOptions("PATCH",{isActive:toggle.dataset.configActive!=="true"}));await loadProfessionalRoomConfiguration();}
      if (activateTax) {
        if (!window.confirm("Activate this effective-dated Room GST rule? Confirm the configured rates with the hotel accountant first.")) return;
        await staffFetchJson(`${STAFF_API_BASE}/room-management/tax/rules/${encodeURIComponent(activateTax.dataset.roomTaxActivate)}/activate`, professionalRoomJsonOptions("POST", { expectedVersion: Number(activateTax.dataset.roomTaxVersion) }));
        professionalRoomStatus("staffRoomConfigurationStatus", "Room GST rule activated.");
        await loadProfessionalRoomConfiguration();
      }
      if (retireTax) {
        if (!window.confirm("Retire this Room GST rule? Existing booking and bill snapshots will remain unchanged.")) return;
        await staffFetchJson(`${STAFF_API_BASE}/room-management/tax/rules/${encodeURIComponent(retireTax.dataset.roomTaxRetire)}/retire`, professionalRoomJsonOptions("POST", { expectedVersion: Number(retireTax.dataset.roomTaxVersion) }));
        professionalRoomStatus("staffRoomConfigurationStatus", "Room GST rule retired.");
        await loadProfessionalRoomConfiguration();
      }
      if (previewTax) {
        const amount = Number(window.prompt("Enter a taxable Room amount to preview:", "1000"));
        if (!Number.isFinite(amount) || amount < 0) return;
        const result = await staffFetchJson(`${STAFF_API_BASE}/room-management/tax/preview`, professionalRoomJsonOptions("POST", {
          amount,
          effectiveDate: new Date().toISOString().slice(0, 10),
          ruleId: Number(previewTax.dataset.roomTaxPreview),
          guestPlaceOfSupply: ""
        }));
        const preview = result.preview || {};
        const components = Object.entries(preview.components || {}).map(([key, value]) => `${key.toUpperCase()} ${value.rate}%: ${professionalRoomMoney(value.amount)}`).join(" · ");
        professionalRoomStatus("staffRoomConfigurationStatus", `Taxable ${professionalRoomMoney(preview.taxableValue)} · Tax ${professionalRoomMoney(preview.totalTax)} · Total ${professionalRoomMoney(preview.totalAmount)}${components ? ` · ${components}` : ""}`);
      }
    }catch(error){professionalRoomStatus(toggle||activateTax||retireTax||previewTax?"staffRoomConfigurationStatus":housekeeping?"staffRoomHousekeepingStatus":"staffRoomMaintenanceStatus",error.message||"Update failed.",true);}
  });
});


