"use strict";

(function initSecureQrOrderStatus() {
  const REFRESH_MS = 5000;
  const CSRF_STORAGE_KEY = "secure_qr_csrf_v1";
  const params = new URLSearchParams(window.location.search);
  const publicReference = String(params.get("submission") || "").trim().slice(0, 80);
  const API_BASE = (window.APP_RUNTIME_CONFIG?.API_BASE_URL || `${window.location.origin}/api`).replace(/\/+$/, "");
  const state = { order: null, editing: false, draft: [], draftNote: "" };
  let loadInFlight = false;
  let refreshTimer = null;
  const $ = (selector) => document.querySelector(selector);

  function csrfToken() {
    try { return String(window.sessionStorage?.getItem(CSRF_STORAGE_KEY) || "").trim(); }
    catch { return ""; }
  }

  function getPublicMessage(value, fallback = "Request failed. Please try again.") {
    const message = String(value || "").trim().slice(0, 1000);
    if (!message) return fallback;
    const containsInternalDetail =
      /(?:\bat\s+(?:async\s+)?[\w$.<>]+\s*\(|[a-z]:\\|\/(?:home|var|usr)\/|postgres|supabase|sqlstate|stack\s*trace|jwt[_ -]?secret|service[_ -]?role|api[_ -]?key)/i.test(
        message
      );
    return containsInternalDetail ? fallback : message;
  }

  function setMessage(message, isError = false) {
    const element = $("#qrStatusMessage");
    if (!element) return;
    element.textContent = getPublicMessage(message);
    element.dataset.state = isError ? "error" : "info";
    element.setAttribute("role", isError ? "alert" : "status");
  }

  function itemId(item) { return String(item.id || item.menuItemId || ""); }
  function quantity(item) { return Math.max(1, Number(item.qty || item.quantity || 1)); }

  function render() {
    const order = state.order;
    if (!order) return;
    $("#qrStatusTitle").textContent = order.editable ? "Order received" : "Order in progress";
    $("#qrStatusBadge").textContent = String(order.status || "Received").replace(/_/g, " ");
    $("#qrVersionLabel").textContent = `Version ${Number(order.version || 1)}`;
    $("#qrOrderNote").value = state.editing ? state.draftNote : (order.note || "");
    $("#qrOrderNote").disabled = !state.editing;
    const sourceItems = state.editing ? state.draft : (order.items || []);
    $("#qrItemsList").innerHTML = sourceItems.map((item, index) => `
      <div class="qr-item-row" data-item-index="${index}">
        <span class="qr-item-name">${escapeHtml(item.name || "Menu item")}</span>
        ${state.editing ? `<span class="qr-item-controls">
          <button type="button" data-qty-change="-1" aria-label="Decrease ${escapeHtml(item.name || "item")}">−</button>
          <strong aria-live="polite">${quantity(item)}</strong>
          <button type="button" data-qty-change="1" aria-label="Increase ${escapeHtml(item.name || "item")}">+</button>
          <button type="button" class="qr-item-remove" data-remove-item aria-label="Remove ${escapeHtml(item.name || "item")}">Remove</button>
        </span>` : `<strong>${quantity(item)} ×</strong>`}
      </div>`).join("");
    $("#qrEditButton").hidden = state.editing || !order.editable;
    $("#qrCancelEditButton").hidden = !state.editing;
    $("#qrSaveButton").hidden = !state.editing;
    $("#qrEditPolicy").textContent = order.editable
      ? "You may correct only these items while this KOT remains new."
      : "This KOT is already accepted or preparing and can no longer be edited. Please contact restaurant staff.";
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  }

  async function request(url, options = {}) {
    const response = await fetch(`${API_BASE}${url}`, { credentials: "include", cache: "no-store", ...options });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.message || "Request failed");
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  async function load({ silent = false } = {}) {
    if (loadInFlight) return;
    loadInFlight = true;
    $("#qrStatusMain")?.setAttribute("aria-busy", "true");
    $("#qrItemsList")?.setAttribute("aria-busy", "true");

    try {
      if (!publicReference) throw new Error("This secure order link is incomplete.");
      const result = await request(`/public/qr/submissions/${encodeURIComponent(publicReference)}`);
      state.order = result.order;
      if (!state.editing) {
        state.draft = (result.order.items || []).map((item) => ({ ...item }));
        state.draftNote = result.order.note || "";
      }
      render();
      if (!silent) setMessage("Your order status is up to date.");
      $("#qrRetryButton").hidden = true;
    } catch (error) {
      setMessage(getPublicMessage(error.message), true);
      $("#qrRetryButton").hidden = false;
    } finally {
      loadInFlight = false;
      $("#qrStatusMain")?.setAttribute("aria-busy", "false");
      $("#qrItemsList")?.setAttribute("aria-busy", "false");
    }
  }
  async function save() {
    if (!state.order || !state.draft.length) {
      setMessage("At least one item must remain. Ask staff to reject the whole round.", true);
      return;
    }
    const button = $("#qrSaveButton");
    button.disabled = true;
    try {
      const clientRequestId = crypto.randomUUID();
      const result = await request(`/public/qr/submissions/${encodeURIComponent(publicReference)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-QR-CSRF-Token": csrfToken() },
        body: JSON.stringify({
          clientRequestId,
          expectedRoundVersion: Number(state.order.version || 1),
          note: state.draftNote,
          items: state.draft.map((item) => ({
            publicItemReference: item.publicItemReference,
            menuItemId: itemId(item),
            quantity: quantity(item)
          }))
        })
      });
      state.order = result.order;
      state.editing = false;
      state.draft = (result.order.items || []).map((item) => ({ ...item }));
      state.draftNote = result.order.note || "";
      render();
      setMessage(result.message || "Your correction was saved.");
    } catch (error) {
      setMessage(error.message, true);
      if (error.payload?.code === "QR_SUBMISSION_CHANGED") {
        state.editing = false;
        await load({ silent: true });
      }
    } finally {
      button.disabled = false;
    }
  }

  document.addEventListener("click", (event) => {
    const row = event.target.closest("[data-item-index]");
    const index = Number(row?.dataset.itemIndex);
    if (event.target.closest("#qrEditButton")) {
      state.editing = true;
      state.draft = (state.order.items || []).map((item) => ({ ...item }));
      state.draftNote = state.order.note || "";
      render();
      window.requestAnimationFrame(() => $("#qrOrderNote")?.focus({ preventScroll: true }));
    } else if (event.target.closest("#qrCancelEditButton")) {
      state.editing = false;
      state.draftNote = state.order?.note || "";
      render();
    } else if (event.target.closest("#qrSaveButton")) {
      void save();
    } else if (event.target.closest("#qrRetryButton")) {
      void load();
    } else if (row && event.target.closest("[data-qty-change]")) {
      const delta = Number(event.target.closest("[data-qty-change]").dataset.qtyChange || 0);
      state.draft[index].qty = Math.max(1, Math.min(25, quantity(state.draft[index]) + delta));
      render();
      window.requestAnimationFrame(() => {
        document.querySelector(`[data-item-index="${index}"] [data-qty-change="${delta}"]`)?.focus();
      });
    } else if (row && event.target.closest("[data-remove-item]")) {
      state.draft.splice(index, 1);
      const nextIndex = Math.max(0, Math.min(index, state.draft.length - 1));
      render();
      window.requestAnimationFrame(() => {
        if (state.draft.length) {
          document.querySelector(`[data-item-index="${nextIndex}"] [data-remove-item]`)?.focus();
        } else {
          $("#qrCancelEditButton")?.focus();
        }
      });
    }
  });

  $("#qrOrderNote")?.addEventListener("input", (event) => {
    if (state.editing) state.draftNote = event.target.value;
  });

  void load();
  refreshTimer = window.setInterval(() => {
    if (document.visibilityState === "visible" && !state.editing) {
      void load({ silent: true });
    }
  }, REFRESH_MS);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !state.editing) {
      void load({ silent: true });
    }
  });

  window.addEventListener("beforeunload", () => {
    if (refreshTimer) window.clearInterval(refreshTimer);
  });
})();
