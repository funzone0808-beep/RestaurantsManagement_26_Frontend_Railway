"use strict";

const ROOM_INVENTORY_STATUS_LABELS = {
  available: "Available",
  booked: "Booked",
  occupied: "Occupied",
  cleaning: "Cleaning",
  maintenance: "Maintenance",
  inactive: "Inactive"
};

function roomInventoryTypeName(room = {}) {
  const types = PROFESSIONAL_ROOM_STATE.inventory?.filters?.roomTypes || [];
  return types.find((item) => String(item.id) === String(room.room_type_id))?.name || "Unassigned";
}

function roomInventoryStatusMarkup(status = "available", isActive = true) {
  const value = isActive === false ? "inactive" : String(status || "available").toLowerCase();
  return `<span class="professional-room-status is-${professionalRoomEscape(value)}">${professionalRoomEscape(ROOM_INVENTORY_STATUS_LABELS[value] || value)}</span>`;
}

function roomInventoryQueryFromControls() {
  return {
    ...PROFESSIONAL_ROOM_STATE.inventoryQuery,
    search: document.getElementById("staffManagerInventorySearch")?.value.trim() || "",
    floorId: document.getElementById("staffManagerInventoryFloor")?.value || "",
    roomTypeId: document.getElementById("staffManagerInventoryType")?.value || "",
    status: document.getElementById("staffManagerInventoryStatus")?.value || "",
    isActive: document.getElementById("staffManagerInventoryActive")?.value || ""
  };
}

function populateRoomInventoryFilters(data = {}) {
  const query = PROFESSIONAL_ROOM_STATE.inventoryQuery;
  const floor = document.getElementById("staffManagerInventoryFloor");
  const type = document.getElementById("staffManagerInventoryType");
  if (floor) {
    floor.innerHTML = '<option value="">All floors</option>' + (data.filters?.floors || [])
      .map((item) => `<option value="${professionalRoomEscape(item.id)}">${professionalRoomEscape(item.floor_name)}</option>`).join("");
    floor.value = String(query.floorId || "");
  }
  if (type) {
    type.innerHTML = '<option value="">All types</option>' + (data.filters?.roomTypes || [])
      .map((item) => `<option value="${professionalRoomEscape(item.id)}">${professionalRoomEscape(item.name)}</option>`).join("");
    type.value = String(query.roomTypeId || "");
  }
}

function renderProfessionalRoomInventory() {
  const data = PROFESSIONAL_ROOM_STATE.inventory || { rooms: [], pagination: { page: 1, pages: 1, total: 0 } };
  const rooms = data.rooms || [];
  const tableBody = document.getElementById("staffManagerInventoryTableBody");
  const cards = document.getElementById("staffManagerInventoryCards");
  const rowMarkup = (room) => `
    <tr>
      <th scope="row"><strong>${professionalRoomEscape(room.room_number || room.id)}</strong><small>${professionalRoomEscape(room.title || "No public title")}</small></th>
      <td>${professionalRoomEscape(room.floor || "—")}</td>
      <td>${professionalRoomEscape(roomInventoryTypeName(room))}</td>
      <td>${roomInventoryStatusMarkup(room.status, room.is_active)}</td>
      <td>${professionalRoomEscape(professionalRoomMoney(room.discount_price ?? room.base_price))}</td>
      <td>${professionalRoomEscape(room.capacity || room.max_adults || 0)}</td>
      <td><button class="staff-btn secondary" type="button" data-room-inventory-open="${professionalRoomEscape(room.id)}">Details</button></td>
    </tr>`;
  if (tableBody) tableBody.innerHTML = rooms.length
    ? rooms.map(rowMarkup).join("")
    : '<tr><td colspan="7" class="professional-room-empty">No rooms match these filters.</td></tr>';
  if (cards) cards.innerHTML = rooms.length ? rooms.map((room) => `
    <article class="professional-inventory-card">
      <div><span>Room</span><h5>${professionalRoomEscape(room.room_number || room.id)}</h5><p>${professionalRoomEscape(room.title || roomInventoryTypeName(room))}</p></div>
      ${roomInventoryStatusMarkup(room.status, room.is_active)}
      <dl><div><dt>Floor</dt><dd>${professionalRoomEscape(room.floor || "—")}</dd></div><div><dt>Rate</dt><dd>${professionalRoomEscape(professionalRoomMoney(room.discount_price ?? room.base_price))}</dd></div><div><dt>Capacity</dt><dd>${professionalRoomEscape(room.capacity || room.max_adults || 0)}</dd></div></dl>
      <button class="staff-btn secondary" type="button" data-room-inventory-open="${professionalRoomEscape(room.id)}">View details</button>
    </article>`).join("") : '<div class="professional-room-empty">No rooms match these filters.</div>';
  const page = data.pagination?.page || 1;
  const pages = data.pagination?.pages || 1;
  const total = data.pagination?.total || 0;
  const pageText = document.getElementById("staffManagerInventoryPage");
  if (pageText) pageText.textContent = `Page ${page} of ${pages} · ${total} room${total === 1 ? "" : "s"}`;
  const previous = document.getElementById("staffManagerInventoryPrev");
  const next = document.getElementById("staffManagerInventoryNext");
  if (previous) previous.disabled = page <= 1;
  if (next) next.disabled = page >= pages;
  setRoomInventoryLayout(PROFESSIONAL_ROOM_STATE.inventoryLayout);
}

function setRoomInventoryLayout(layout = "table") {
  const safeLayout = layout === "cards" ? "cards" : "table";
  PROFESSIONAL_ROOM_STATE.inventoryLayout = safeLayout;
  const table = document.getElementById("staffManagerInventoryTableWrap");
  const cards = document.getElementById("staffManagerInventoryCards");
  if (table) table.hidden = safeLayout !== "table";
  if (cards) cards.hidden = safeLayout !== "cards";
  document.querySelectorAll("[data-room-inventory-layout]").forEach((button) => {
    const active = button.dataset.roomInventoryLayout === safeLayout;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

async function loadProfessionalRoomInventory({ resetPage = false } = {}) {
  if (!isStaffManagerSession()) return;
  const query = roomInventoryQueryFromControls();
  if (resetPage) query.page = 1;
  PROFESSIONAL_ROOM_STATE.inventoryQuery = query;
  professionalRoomStatus("staffManagerInventoryStatusText", "Loading room inventory...");
  try {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) params.set(key, String(value));
    });
    const data = await staffFetchJson(`${STAFF_API_BASE}/room-management/inventory?${params}`);
    PROFESSIONAL_ROOM_STATE.inventory = data;
    PROFESSIONAL_ROOM_STATE.inventoryQuery.page = data.pagination?.page || 1;
    populateRoomInventoryFilters(data);
    renderProfessionalRoomInventory();
    professionalRoomStatus("staffManagerInventoryStatusText", `${data.pagination?.total || 0} hotel-scoped rooms found.`);
  } catch (error) {
    professionalRoomStatus("staffManagerInventoryStatusText", error.message || "Room inventory could not be loaded.", true);
  }
}

function renderProfessionalRoomDetail(data = {}) {
  const room = data.room || {};
  const title = document.getElementById("staffManagerRoomDetailTitle");
  if (title) title.textContent = `Room ${room.room_number || room.id}`;
  const content = document.getElementById("staffManagerRoomDetailContent");
  if (!content) return;
  const facts = [
    ["Status", ROOM_INVENTORY_STATUS_LABELS[room.status] || room.status],
    ["Active", room.is_active === false ? "No" : "Yes"],
    ["Floor", data.floor?.floor_name || room.floor || "Unassigned"],
    ["Room type", data.roomType?.name || "Unassigned"],
    ["Bed", room.bed_type || "Not set"],
    ["Capacity", room.capacity || room.max_adults || 0],
    ["Base rate", professionalRoomMoney(room.base_price)],
    ["Public images", data.imageSummary?.schemaReady === false ? "Migration required" : data.imageSummary?.active || 0]
  ];
  content.innerHTML = `
    <div class="professional-room-detail-facts">${facts.map(([label, value]) => `<div><dt>${professionalRoomEscape(label)}</dt><dd>${professionalRoomEscape(value)}</dd></div>`).join("")}</div>
    ${room.description ? `<p>${professionalRoomEscape(room.description)}</p>` : ""}
    <div class="staff-actions"><button class="staff-btn secondary" type="button" data-room-inventory-toggle-active="${professionalRoomEscape(room.id)}" data-room-active="${room.is_active !== false}">${room.is_active === false ? "Activate Room" : "Deactivate Room"}</button></div>`;
}

async function openProfessionalRoomDetail(roomId, trigger) {
  if (!isStaffManagerSession()) return;
  PROFESSIONAL_ROOM_STATE.selectedRoomId = Number(roomId);
  PROFESSIONAL_ROOM_STATE.selectedRoomTrigger = trigger || null;
  const dialog = document.getElementById("staffManagerRoomDetailDialog");
  const content = document.getElementById("staffManagerRoomDetailContent");
  if (content) content.innerHTML = '<div class="professional-room-empty">Loading room details...</div>';
  if (dialog && !dialog.open) dialog.showModal();
  try {
    const data = await staffFetchJson(`${STAFF_API_BASE}/room-management/inventory/${encodeURIComponent(roomId)}`);
    renderProfessionalRoomDetail(data);
    await loadProfessionalRoomImages();
    document.getElementById("staffManagerRoomDetailTitle")?.focus();
  } catch (error) {
    if (content) content.innerHTML = `<div class="staff-status is-error">${professionalRoomEscape(error.message || "Room details could not be loaded.")}</div>`;
  }
}

function closeProfessionalRoomDetail() {
  const dialog = document.getElementById("staffManagerRoomDetailDialog");
  if (dialog?.open) dialog.close();
  PROFESSIONAL_ROOM_STATE.selectedRoomTrigger?.focus?.();
  PROFESSIONAL_ROOM_STATE.selectedRoomTrigger = null;
}

function renderProfessionalRoomImages(images = []) {
  const list = document.getElementById("staffManagerRoomImageList");
  if (!list) return;
  list.innerHTML = images.length ? images.map((image, index) => `
    <article class="professional-room-image-row">
      <img src="${professionalRoomEscape(image.thumbnailUrl || image.cardUrl || image.originalUrl)}" data-manager-image-fallback="${professionalRoomEscape(image.originalUrl)}" alt="${professionalRoomEscape(image.altText)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
      <div><strong>${professionalRoomEscape(image.altText)}</strong><p>${professionalRoomEscape(image.caption || "No caption")}</p><span>${image.isPrimary ? "Primary · " : ""}${image.isActive ? "Public" : "Hidden"} · ${professionalRoomEscape(image.width)}×${professionalRoomEscape(image.height)}</span></div>
      <div class="professional-room-image-actions">
        ${image.isPrimary ? "" : `<button class="staff-btn secondary" type="button" data-room-image-primary="${image.id}">Make primary</button>`}
        <button class="staff-btn secondary" type="button" data-room-image-edit="${image.id}">Edit text</button>
        <button class="staff-btn secondary" type="button" data-room-image-active="${image.id}" data-image-active="${image.isActive}">${image.isActive ? "Hide" : "Publish"}</button>
        <button class="staff-btn secondary" type="button" data-room-image-move="${image.id}" data-direction="up" ${index === 0 ? "disabled" : ""}>Up</button>
        <button class="staff-btn secondary" type="button" data-room-image-move="${image.id}" data-direction="down" ${index === images.length - 1 ? "disabled" : ""}>Down</button>
        <button class="staff-btn danger" type="button" data-room-image-delete="${image.id}">Delete</button>
      </div>
    </article>`).join("") : '<div class="professional-room-empty">No managed images yet. Legacy room image URLs continue to work until images are uploaded here.</div>';
  list.querySelectorAll("[data-manager-image-fallback]").forEach((image) => image.addEventListener("error", () => {
    const fallback = image.dataset.managerImageFallback || "";
    image.dataset.managerImageFallback = "";
    if (fallback) image.src = fallback;
  }));
}

async function loadProfessionalRoomImages() {
  const roomId = PROFESSIONAL_ROOM_STATE.selectedRoomId;
  if (!roomId) return;
  professionalRoomStatus("staffManagerRoomImageStatus", "Loading room images...");
  try {
    const data = await staffFetchJson(`${STAFF_API_BASE}/room-management/media/room/${encodeURIComponent(roomId)}/images`);
    PROFESSIONAL_ROOM_STATE.inventoryImages = data.images || [];
    renderProfessionalRoomImages(PROFESSIONAL_ROOM_STATE.inventoryImages);
    professionalRoomStatus("staffManagerRoomImageStatus", `${PROFESSIONAL_ROOM_STATE.inventoryImages.length} of ${data.limit || 50} images configured.`);
  } catch (error) {
    PROFESSIONAL_ROOM_STATE.inventoryImages = [];
    renderProfessionalRoomImages([]);
    const message = error.code === "ROOM_GALLERY_UPGRADE_REQUIRED"
      ? "Apply upgrade-room-operations-ux-gallery.sql to enable secure image management. Existing public images are unchanged."
      : error.message || "Room images could not be loaded.";
    professionalRoomStatus("staffManagerRoomImageStatus", message, true);
  }
}

async function uploadProfessionalRoomImage(form) {
  const roomId = PROFESSIONAL_ROOM_STATE.selectedRoomId;
  const file = document.getElementById("staffManagerRoomImageFile")?.files?.[0];
  if (!roomId || !file) return;
  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  const body = new FormData();
  body.append("file", file);
  body.append("altText", document.getElementById("staffManagerRoomImageAlt")?.value.trim() || "");
  body.append("caption", document.getElementById("staffManagerRoomImageCaption")?.value.trim() || "");
  body.append("isPrimary", String(document.getElementById("staffManagerRoomImagePrimary")?.checked === true));
  body.append("isActive", "true");
  professionalRoomStatus("staffManagerRoomImageStatus", "Uploading and preparing image sizes...");
  try {
    await staffFetchJson(`${STAFF_API_BASE}/room-management/media/room/${encodeURIComponent(roomId)}/images`, { method: "POST", body });
    form.reset();
    await loadProfessionalRoomImages();
    professionalRoomStatus("staffManagerRoomImageStatus", "Room image uploaded and published.");
  } catch (error) {
    professionalRoomStatus("staffManagerRoomImageStatus", error.message || "Room image upload failed.", true);
  } finally {
    if (button) button.disabled = false;
  }
}

async function updateProfessionalRoomImage(imageId, body) {
  const roomId = PROFESSIONAL_ROOM_STATE.selectedRoomId;
  if (!roomId) return;
  await staffFetchJson(`${STAFF_API_BASE}/room-management/media/room/${encodeURIComponent(roomId)}/images/${encodeURIComponent(imageId)}`, professionalRoomJsonOptions("PATCH", body));
  await loadProfessionalRoomImages();
}

async function reorderProfessionalRoomImage(imageId, direction) {
  const images = [...PROFESSIONAL_ROOM_STATE.inventoryImages];
  const from = images.findIndex((image) => Number(image.id) === Number(imageId));
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= images.length) return;
  [images[from], images[to]] = [images[to], images[from]];
  await staffFetchJson(`${STAFF_API_BASE}/room-management/media/room/${encodeURIComponent(PROFESSIONAL_ROOM_STATE.selectedRoomId)}/images/reorder`, professionalRoomJsonOptions("POST", { imageIds: images.map((image) => Number(image.id)) }));
  await loadProfessionalRoomImages();
}

function renderProfessionalRoomConfigurationSection() {
  const data = PROFESSIONAL_ROOM_STATE.configuration;
  if (!data) return;
  const section = PROFESSIONAL_ROOM_STATE.configurationSection || "masters";
  document.querySelectorAll("[data-room-config-section]").forEach((form) => { form.hidden = form.dataset.roomConfigSection !== section; });
  document.querySelectorAll("[data-room-config-view]").forEach((button) => {
    const active = button.dataset.roomConfigView === section;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const row = (primary, secondary, kind, record) => `<div class="professional-room-list-row"><div><strong>${professionalRoomEscape(primary)}</strong><p>${professionalRoomEscape(secondary)}</p></div><button class="staff-btn secondary" type="button" data-config-toggle="${kind}" data-config-id="${record.id}" data-config-active="${record.is_active !== false}">${record.is_active === false ? "Activate" : "Deactivate"}</button></div>`;
  const target = document.getElementById("staffRoomConfigurationContent");
  if (!target) return;
  if (section === "masters") {
    target.innerHTML = [
      professionalConfigSection("Floors", (data.floors || []).map((item) => row(item.floor_name, item.floor_code, "floor", item))),
      professionalConfigSection("Room Types", (data.roomTypes || []).map((item) => row(item.name, professionalRoomMoney(item.base_price), "room-type", item))),
      professionalConfigSection("Amenities", (data.amenities || []).map((item) => row(item.amenity_name, item.description || item.amenity_code, "amenity", item)))
    ].join("");
  } else if (section === "pricing") {
    target.innerHTML = `${data.roomReferences?.truncated ? `<div class="staff-status">Specific-room rate selection shows the first ${data.roomReferences.returned} of ${data.roomReferences.total} rooms. Use room type scope or the paginated Inventory view for larger catalogues.</div>` : ""}${professionalConfigSection("Rate Plans", (data.ratePlans || []).map((item) => row(item.plan_name, `${item.plan_code} · ${professionalRoomMoney(item.nightly_price)}`, "rate-plan", item)))}`;
  } else {
    const tax = data.roomTax || {};
    const taxRows = (tax.rules || []).map((rule) => `<div class="professional-room-list-row"><div><strong>${professionalRoomEscape(rule.rule_name)}</strong><p>${professionalRoomEscape(`${rule.status} · ${rule.effective_from}${rule.effective_to ? ` to ${rule.effective_to}` : " onward"} · CGST ${rule.cgst_rate}% · SGST ${rule.sgst_rate}% · IGST ${rule.igst_rate}%`)}</p></div><div class="staff-actions"><button class="staff-btn secondary" type="button" data-room-tax-preview="${rule.id}">Preview</button>${rule.status === "draft" ? `<button class="staff-btn" type="button" data-room-tax-activate="${rule.id}" data-room-tax-version="${rule.version}">Activate</button>` : ""}${rule.status === "active" ? `<button class="staff-btn secondary" type="button" data-room-tax-retire="${rule.id}" data-room-tax-version="${rule.version}">Retire</button>` : ""}</div></div>`);
    target.innerHTML = `${tax.schemaReady === false ? '<div class="staff-status is-error">Production Room pricing/GST migration is not applied yet.</div>' : ""}${professionalConfigSection("Room GST Rules", taxRows)}`;
  }
}

const baseRenderProfessionalRoomConfiguration = renderProfessionalRoomConfiguration;
renderProfessionalRoomConfiguration = function renderProfessionalRoomConfigurationWithSections(data) {
  baseRenderProfessionalRoomConfiguration(data);
  renderProfessionalRoomConfigurationSection();
};

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("staffRoomAmenityForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitProfessionalForm(event.currentTarget, "/amenities", {
      amenityCode: document.getElementById("staffRoomAmenityCodeInput").value,
      amenityName: document.getElementById("staffRoomAmenityNameInput").value,
      description: document.getElementById("staffRoomAmenityDescriptionInput").value,
      isActive: true
    }, "staffRoomConfigurationStatus");
  });
  document.querySelectorAll("[data-room-shell-view]").forEach((button) => button.addEventListener("click", () => showProfessionalRoomView(button.dataset.roomShellView)));
  document.querySelectorAll("[data-room-config-view]").forEach((button) => button.addEventListener("click", () => {
    PROFESSIONAL_ROOM_STATE.configurationSection = button.dataset.roomConfigView || "masters";
    renderProfessionalRoomConfigurationSection();
  }));
  document.getElementById("staffManagerInventorySearch")?.addEventListener("input", () => {
    window.clearTimeout(PROFESSIONAL_ROOM_STATE.inventorySearchTimer);
    PROFESSIONAL_ROOM_STATE.inventorySearchTimer = window.setTimeout(() => void loadProfessionalRoomInventory({ resetPage: true }), 300);
  });
  ["staffManagerInventoryFloor", "staffManagerInventoryType", "staffManagerInventoryStatus", "staffManagerInventoryActive"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", () => void loadProfessionalRoomInventory({ resetPage: true }));
  });
  document.getElementById("staffManagerInventoryPrev")?.addEventListener("click", () => {
    PROFESSIONAL_ROOM_STATE.inventoryQuery.page = Math.max(1, (PROFESSIONAL_ROOM_STATE.inventory?.pagination?.page || 1) - 1);
    void loadProfessionalRoomInventory();
  });
  document.getElementById("staffManagerInventoryNext")?.addEventListener("click", () => {
    PROFESSIONAL_ROOM_STATE.inventoryQuery.page = Math.min(PROFESSIONAL_ROOM_STATE.inventory?.pagination?.pages || 1, (PROFESSIONAL_ROOM_STATE.inventory?.pagination?.page || 1) + 1);
    void loadProfessionalRoomInventory();
  });
  document.getElementById("staffManagerRoomImageUploadForm")?.addEventListener("submit", (event) => { event.preventDefault(); void uploadProfessionalRoomImage(event.currentTarget); });
  document.getElementById("staffManagerRoomDetailDialog")?.addEventListener("close", () => {
    PROFESSIONAL_ROOM_STATE.selectedRoomTrigger?.focus?.();
    PROFESSIONAL_ROOM_STATE.selectedRoomTrigger = null;
  });
  window.addEventListener("popstate", () => {
    if (STAFF_STATE.activeView === "rooms") {
      const view = new URL(window.location.href).searchParams.get("roomView") || "home";
      showProfessionalRoomView(view, { historyMode: "none", focus: false });
    }
  });

  document.addEventListener("click", async (event) => {
    const open = event.target.closest("[data-room-inventory-open]");
    if (open) return void openProfessionalRoomDetail(open.dataset.roomInventoryOpen, open);
    if (event.target.closest("[data-room-inventory-close]")) return closeProfessionalRoomDetail();
    const layout = event.target.closest("[data-room-inventory-layout]");
    if (layout) return setRoomInventoryLayout(layout.dataset.roomInventoryLayout);
    const sort = event.target.closest("[data-room-inventory-sort]");
    if (sort) {
      const field = sort.dataset.roomInventorySort;
      const current = PROFESSIONAL_ROOM_STATE.inventoryQuery;
      current.direction = current.sort === field && current.direction === "asc" ? "desc" : "asc";
      current.sort = field; current.page = 1;
      return void loadProfessionalRoomInventory();
    }
    const toggleRoom = event.target.closest("[data-room-inventory-toggle-active]");
    if (toggleRoom) {
      try {
        await staffFetchJson(`${STAFF_API_BASE}/room-management/rooms/${encodeURIComponent(toggleRoom.dataset.roomInventoryToggleActive)}`, professionalRoomJsonOptions("PATCH", { isActive: toggleRoom.dataset.roomActive !== "true" }));
        await loadProfessionalRoomInventory();
        return void openProfessionalRoomDetail(toggleRoom.dataset.roomInventoryToggleActive, PROFESSIONAL_ROOM_STATE.selectedRoomTrigger);
      } catch (error) { return professionalRoomStatus("staffManagerRoomImageStatus", error.message || "Room status update failed.", true); }
    }
    const primary = event.target.closest("[data-room-image-primary]");
    const active = event.target.closest("[data-room-image-active]");
    const edit = event.target.closest("[data-room-image-edit]");
    const move = event.target.closest("[data-room-image-move]");
    const remove = event.target.closest("[data-room-image-delete]");
    try {
      if (primary) return void await updateProfessionalRoomImage(primary.dataset.roomImagePrimary, { isPrimary: true, isActive: true });
      if (active) return void await updateProfessionalRoomImage(active.dataset.roomImageActive, { isActive: active.dataset.imageActive !== "true" });
      if (edit) {
        const image = PROFESSIONAL_ROOM_STATE.inventoryImages.find((item) => String(item.id) === edit.dataset.roomImageEdit);
        const altText = window.prompt("Accessible alt text", image?.altText || "");
        if (altText === null) return;
        const caption = window.prompt("Caption (optional)", image?.caption || "");
        if (caption === null) return;
        return void await updateProfessionalRoomImage(edit.dataset.roomImageEdit, { altText, caption });
      }
      if (move) return void await reorderProfessionalRoomImage(move.dataset.roomImageMove, move.dataset.direction);
      if (remove) {
        if (!window.confirm("Delete this room image? This cannot be undone.")) return;
        await staffFetchJson(`${STAFF_API_BASE}/room-management/media/room/${encodeURIComponent(PROFESSIONAL_ROOM_STATE.selectedRoomId)}/images/${encodeURIComponent(remove.dataset.roomImageDelete)}`, { method: "DELETE" });
        return void await loadProfessionalRoomImages();
      }
    } catch (error) {
      professionalRoomStatus("staffManagerRoomImageStatus", error.message || "Room image update failed.", true);
    }
  });
});