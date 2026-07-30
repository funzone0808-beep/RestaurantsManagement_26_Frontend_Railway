"use strict";

(function installFoodOrderBillSettings(global) {
  const API_ROOT = `${global.APP_RUNTIME_CONFIG?.API_BASE_URL || "/api"}/staff/food-order-bill`;
  let dialog = null;
  let activeFormat = null;
  let previewBill = null;

  function escape(value) {
    return global.FoodOrderReceipt?.escapeHTML(value) || String(value || "");
  }

  function field(name, label, value = "", type = "text", extra = "") {
    return `
      <label class="food-bill-format-field">
        <span>${escape(label)}</span>
        <input name="${escape(name)}" type="${escape(type)}" value="${escape(value)}" ${extra}>
      </label>
    `;
  }

  function checkbox(name, label, checked) {
    return `
      <label class="food-bill-format-check">
        <input name="${escape(name)}" type="checkbox" ${checked ? "checked" : ""}>
        <span>${escape(label)}</span>
      </label>
    `;
  }

  function section(title, subtitle, content, open = false) {
    return `
      <details class="food-bill-format-section" ${open ? "open" : ""}>
        <summary>
          <strong>${escape(title)}</strong>
          <span>${escape(subtitle)}</span>
        </summary>
        <div class="food-bill-format-section-body">${content}</div>
      </details>
    `;
  }

  function buildDialog(format = {}) {
    const privacy = format.privacy || {};
    const display = format.display || {};
    const qr = format.qr || {};
    const print = format.print || {};
    const messages = format.messages || {};
    return `
      <div class="food-bill-format-layout">
        <form class="food-bill-format-editor" id="foodBillFormatForm">
          <div class="food-bill-format-head">
            <div>
              <span>Billing and Printing</span>
              <h2>Food Order Bill Format</h2>
              <p>Hotel-owned branding, privacy, receipt sections, QR, and thermal calibration.</p>
            </div>
            <button class="staff-btn secondary" type="button" data-food-bill-format-close>Close</button>
          </div>

          <div class="food-bill-format-sections">
            ${section("Business Header", "Hotel, restaurant, contact, tax, licence, and logo", `
              <div class="food-bill-format-grid">
                ${field("companyName", "Hotel / company name", format.companyName)}
                ${field("restaurantName", "Restaurant / outlet name", format.restaurantName)}
                ${field("propertySubtitle", "Property subtitle", format.propertySubtitle)}
                ${field("addressLine1", "Address line 1", format.addressLine1)}
                ${field("addressLine2", "Address line 2", format.addressLine2)}
                ${field("city", "City", format.city)}
                ${field("state", "State", format.state)}
                ${field("postalCode", "Postal code", format.postalCode)}
                ${field("country", "Country", format.country)}
                ${field("phone", "Phone", format.phone)}
                ${field("alternatePhone", "Alternate phone", format.alternatePhone)}
                ${field("email", "Email", format.email, "email")}
                ${field("websiteUrl", "Website URL (https)", format.websiteUrl, "url")}
                ${field("taxId", "GST / tax ID", format.taxId)}
                ${field("fssaiNumber", "FSSAI licence", format.fssaiNumber)}
                ${field("licenceNumber", "Other licence number", format.licenceNumber)}
                ${field("registrationNumber", "Registration number", format.registrationNumber)}
                ${field("billTitle", "Final receipt heading", format.billTitle)}
                <label class="food-bill-format-field">
                  <span>Receipt logo</span>
                  <input id="foodBillLogoInput" type="file" accept="image/png,image/jpeg,image/webp">
                </label>
                <div class="food-bill-format-field">
                  <span>Logo actions</span>
                  <div class="food-bill-format-inline-actions">
                    <button class="staff-btn secondary" type="button" data-food-bill-logo-upload>Upload</button>
                    <button class="staff-btn secondary" type="button" data-food-bill-logo-remove>Remove</button>
                  </div>
                </div>
              </div>
            `, true)}

            ${section("Order and Customer Information", "Source, table, room, customer, address, and privacy", `
              <div class="food-bill-format-checks">
                ${checkbox("showHotelLogo", "Show hotel logo", display.showHotelLogo !== false)}
                ${checkbox("showRestaurantName", "Show restaurant / outlet name", display.showRestaurantName !== false)}
                ${checkbox("showOrderSource", "Show order source", display.showOrderSource !== false)}
                ${checkbox("showTableNumber", "Show table number", display.showTableNumber !== false)}
                ${checkbox("showRoomNumber", "Show room number", display.showRoomNumber !== false)}
                ${checkbox("showCustomerName", "Show customer name", display.showCustomerName !== false)}
                ${checkbox("maskCustomerPhone", "Mask customer phone", privacy.maskCustomerPhone !== false)}
                ${checkbox("showDeliveryAddress", "Show delivery address", privacy.showDeliveryAddress === true)}
                ${checkbox("showRoomGuestName", "Show room guest name", privacy.showRoomGuestName !== false)}
                ${checkbox("showCashier", "Show cashier", display.showCashier !== false)}
              </div>
            `)}

            ${section("Item Display", "Variants, add-ons, item notes, and item tax", `
              <div class="food-bill-format-checks">
                ${checkbox("showVariants", "Show variants when stored", display.showVariants !== false)}
                ${checkbox("showAddons", "Show item add-ons when stored", display.showAddons !== false)}
                ${checkbox("showItemNotes", "Show item and order notes", display.showItemNotes === true)}
                ${checkbox("showItemTax", "Show item-level tax when stored", display.showItemTax === true)}
              </div>
            `)}

            ${section("Charges and Payments", "Discounts, charges, rounding, and payment breakdown", `
              <div class="food-bill-format-checks">
                ${checkbox("showDiscount", "Show discounts", display.showDiscount !== false)}
                ${checkbox("showCoupon", "Show coupon discount", display.showCoupon !== false)}
                ${checkbox("showServiceCharge", "Show service charge", display.showServiceCharge !== false)}
                ${checkbox("showDeliveryCharge", "Show delivery charge", display.showDeliveryCharge !== false)}
                ${checkbox("showPackagingCharge", "Show packaging charge", display.showPackagingCharge !== false)}
                ${checkbox("showRounding", "Show round-off", display.showRounding !== false)}
                ${checkbox("showPaymentBreakdown", "Show payment breakdown", display.showPaymentBreakdown !== false)}
                ${checkbox("hideZeroTotals", "Hide zero-value total lines", display.hideZeroTotals !== false)}
              </div>
            `)}

            ${section("Footer and Messages", "Thank-you, feedback, support, legal, refund, and tax notes", `
              <div class="food-bill-format-grid">
                ${field("thankYou", "Thank-you message", messages.thankYou)}
                ${field("feedback", "Feedback message", messages.feedback)}
                ${field("support", "Support message", messages.support)}
                ${field("footer", "Footer text", messages.footer)}
                ${field("legalNote", "Legal note", messages.legalNote)}
                ${field("refundNote", "Refund note", messages.refundNote)}
                ${field("taxNote", "Tax note", messages.taxNote)}
              </div>
            `)}

            ${section("QR Code", "Safe public HTTPS destinations only", `
              <div class="food-bill-format-checks">
                ${checkbox("qrEnabled", "Enable QR code", qr.enabled === true)}
                ${checkbox("showQrCode", "Show QR on receipt", display.showQrCode !== false)}
              </div>
              <div class="food-bill-format-grid">
                <label class="food-bill-format-field">
                  <span>QR type</span>
                  <select name="qrType">
                    ${["website", "feedback", "review", "menu", "support"].map((value) => `<option value="${value}" ${qr.type === value ? "selected" : ""}>${escape(value)}</option>`).join("")}
                  </select>
                </label>
                ${field("qrValue", "QR destination (https)", qr.value, "url")}
                ${field("qrCaption", "QR caption", qr.caption)}
              </div>
            `)}

            ${section("Thermal Print Settings", "58mm, 80mm, density, margins, separators, and copies", `
              <div class="food-bill-format-grid">
                <label class="food-bill-format-field">
                  <span>Paper width</span>
                  <select name="paperWidth">
                    <option value="80" ${String(format.paperWidth) !== "58" ? "selected" : ""}>80mm</option>
                    <option value="58" ${String(format.paperWidth) === "58" ? "selected" : ""}>58mm</option>
                  </select>
                </label>
                ${field("fontScale", "Font scale", print.fontScale ?? 1, "number", 'min="0.8" max="1.3" step="0.05"')}
                ${field("logoWidthMm", "Logo width (mm)", print.logoWidthMm ?? 22, "number", 'min="8" max="50" step="1"')}
                ${field("marginMm", "Print margin (mm)", print.marginMm ?? 2, "number", 'min="0" max="8" step="0.5"')}
                ${field("lineSpacing", "Line spacing", print.lineSpacing ?? 1.15, "number", 'min="0.9" max="1.5" step="0.05"')}
                ${field("printCopies", "Print copies", print.printCopies ?? 1, "number", 'min="1" max="5" step="1"')}
                <label class="food-bill-format-field">
                  <span>Separator style</span>
                  <select name="separatorStyle">
                    ${["dashed", "dotted", "solid"].map((value) => `<option value="${value}" ${print.separatorStyle === value ? "selected" : ""}>${value}</option>`).join("")}
                  </select>
                </label>
                <div class="food-bill-format-checks is-single">
                  ${checkbox("autoPrintAfterPayment", "Auto-print after verified payment", print.autoPrintAfterPayment === true)}
                </div>
              </div>
            `)}
          </div>

          <p id="foodBillFormatStatus" class="staff-status" role="status" aria-live="polite"></p>
          <div class="food-bill-format-actions">
            <button class="staff-btn" type="submit">Save &amp; Set Active</button>
            <button class="staff-btn secondary" type="button" data-food-bill-format-preview>Preview</button>
            <button class="staff-btn secondary" type="button" data-food-bill-format-test-print>Print Test</button>
            <button class="staff-btn secondary" type="button" data-food-bill-format-reset>Reset to Default</button>
          </div>
        </form>
        <aside class="food-bill-format-preview" id="foodBillFormatPreview" aria-label="Live thermal food receipt preview"></aside>
      </div>
    `;
  }

  function formDataToFormat(form, base = {}) {
    const data = new FormData(form);
    const checked = (name) => data.get(name) === "on";
    const text = (name) => String(data.get(name) || "").trim();
    const numeric = (name, fallback) => {
      const value = Number(data.get(name));
      return Number.isFinite(value) ? value : fallback;
    };
    return {
      companyName: text("companyName"),
      restaurantName: text("restaurantName"),
      propertySubtitle: text("propertySubtitle"),
      addressLine1: text("addressLine1"),
      addressLine2: text("addressLine2"),
      city: text("city"),
      state: text("state"),
      postalCode: text("postalCode"),
      country: text("country"),
      phone: text("phone"),
      alternatePhone: text("alternatePhone"),
      email: text("email"),
      websiteUrl: text("websiteUrl"),
      taxId: text("taxId"),
      fssaiNumber: text("fssaiNumber"),
      licenceNumber: text("licenceNumber"),
      registrationNumber: text("registrationNumber"),
      billTitle: text("billTitle"),
      paperWidth: text("paperWidth") === "58" ? "58" : "80",
      privacy: {
        ...(base.privacy || {}),
        showCustomerName: checked("showCustomerName"),
        maskCustomerPhone: checked("maskCustomerPhone"),
        showDeliveryAddress: checked("showDeliveryAddress"),
        showRoomGuestName: checked("showRoomGuestName")
      },
      display: {
        ...(base.display || {}),
        showHotelLogo: checked("showHotelLogo"),
        showRestaurantName: checked("showRestaurantName"),
        showOrderSource: checked("showOrderSource"),
        showTableNumber: checked("showTableNumber"),
        showRoomNumber: checked("showRoomNumber"),
        showCustomerName: checked("showCustomerName"),
        showItemNotes: checked("showItemNotes"),
        showVariants: checked("showVariants"),
        showAddons: checked("showAddons"),
        showItemTax: checked("showItemTax"),
        showDiscount: checked("showDiscount"),
        showCoupon: checked("showCoupon"),
        showServiceCharge: checked("showServiceCharge"),
        showDeliveryCharge: checked("showDeliveryCharge"),
        showPackagingCharge: checked("showPackagingCharge"),
        showRounding: checked("showRounding"),
        showPaymentBreakdown: checked("showPaymentBreakdown"),
        showCashier: checked("showCashier"),
        showQrCode: checked("showQrCode"),
        hideZeroTotals: checked("hideZeroTotals")
      },
      qr: {
        ...(base.qr || {}),
        enabled: checked("qrEnabled"),
        type: text("qrType") || "website",
        value: text("qrValue"),
        caption: text("qrCaption")
      },
      print: {
        ...(base.print || {}),
        fontScale: numeric("fontScale", 1),
        logoWidthMm: numeric("logoWidthMm", 22),
        marginMm: numeric("marginMm", 2),
        lineSpacing: numeric("lineSpacing", 1.15),
        separatorStyle: text("separatorStyle") || "dashed",
        printCopies: Math.max(1, Math.round(numeric("printCopies", 1))),
        autoPrintAfterPayment: checked("autoPrintAfterPayment")
      },
      messages: {
        ...(base.messages || {}),
        thankYou: text("thankYou"),
        feedback: text("feedback"),
        support: text("support"),
        footer: text("footer"),
        legalNote: text("legalNote"),
        refundNote: text("refundNote"),
        taxNote: text("taxNote")
      }
    };
  }

  function applyFormatToPreviewBill(format) {
    if (!previewBill) return null;
    return {
      ...previewBill,
      hotel: {
        ...(previewBill.hotel || {}),
        name: format.companyName,
        restaurantName: format.restaurantName,
        propertySubtitle: format.propertySubtitle,
        addressLines: [
          format.addressLine1,
          format.addressLine2,
          [format.city, format.state, format.postalCode].filter(Boolean).join(", "),
          format.country
        ].filter(Boolean),
        phone: format.phone,
        alternatePhone: format.alternatePhone,
        email: format.email,
        websiteUrl: format.websiteUrl,
        taxId: format.taxId,
        fssaiNumber: format.fssaiNumber,
        licenceNumber: format.licenceNumber,
        registrationNumber: format.registrationNumber,
        logoUrl: activeFormat?.logoUrl || previewBill.hotel?.logoUrl || "",
        logoAltText: activeFormat?.logoAltText || previewBill.hotel?.logoAltText || ""
      },
      format: {
        ...(previewBill.format || {}),
        ...format,
        qrDataUrl: previewBill.format?.qrDataUrl || ""
      },
      title: previewBill.provisional
        ? previewBill.orderSource?.key === "room_service"
          ? "PROVISIONAL ROOM SERVICE BILL"
          : "PROVISIONAL FOOD BILL"
        : format.billTitle || previewBill.title
    };
  }

  function renderPreview() {
    const form = dialog?.querySelector("#foodBillFormatForm");
    const target = dialog?.querySelector("#foodBillFormatPreview");
    if (!form || !target) return;
    if (!previewBill) {
      target.innerHTML = `
        <div class="food-bill-format-preview-empty">
          <h3>Live Preview</h3>
          <p>No hotel-scoped food order is available yet. Save the format now; the first real bill will use these settings.</p>
        </div>
      `;
      return;
    }
    const format = formDataToFormat(form, activeFormat || {});
    const bill = applyFormatToPreviewBill(format);
    target.innerHTML = global.FoodOrderReceipt.buildReceiptMarkup(bill);
  }

  function setStatus(message, isError = false) {
    const status = dialog?.querySelector("#foodBillFormatStatus");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-error", isError);
  }

  async function openSettings() {
    if (typeof global.isStaffManagerSession === "function" && !global.isStaffManagerSession()) {
      global.alert("Owner access is required to configure the food order bill.");
      return;
    }
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "food-bill-format-dialog";
      document.body.appendChild(dialog);
    }
    dialog.innerHTML = '<div class="food-bill-format-loading">Loading hotel food bill format...</div>';
    dialog.showModal();
    try {
      const result = await global.staffFetchJson(`${API_ROOT}/format?preview=true`);
      activeFormat = result.format || {};
      previewBill = result.preview || null;
      dialog.innerHTML = buildDialog(activeFormat);
      renderPreview();
    } catch (error) {
      dialog.innerHTML = `
        <div class="food-bill-format-loading">
          <h2>Food Order Bill Format</h2>
          <p class="staff-status is-error">${escape(error.message || "Failed to load bill format.")}</p>
          <button class="staff-btn secondary" type="button" data-food-bill-format-close>Close</button>
        </div>
      `;
    }
  }

  async function refreshServerPreview(form) {
    const payload = formDataToFormat(form, activeFormat || {});
    setStatus("Loading preview from the latest hotel order...");
    try {
      const result = await global.staffFetchJson(`${API_ROOT}/format/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      previewBill = result.bill || previewBill;
      renderPreview();
      setStatus("Preview updated from verified stored order data.");
    } catch (error) {
      setStatus(error.message || "No recent order is available for preview.", true);
    }
  }

  async function saveSettings(form) {
    const payload = formDataToFormat(form, activeFormat || {});
    setStatus("Saving and activating hotel food bill format...");
    try {
      const result = await global.staffFetchJson(`${API_ROOT}/format`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      activeFormat = result.format || payload;
      setStatus("Saved and active for this hotel.");
      renderPreview();
    } catch (error) {
      setStatus(error.message || "Failed to save food bill format.", true);
    }
  }

  async function uploadLogo() {
    const input = dialog?.querySelector("#foodBillLogoInput");
    if (!input?.files?.[0]) {
      setStatus("Choose a PNG, JPG, or WebP logo first.", true);
      return;
    }
    const body = new FormData();
    body.append("file", input.files[0]);
    body.append("altText", `${activeFormat?.companyName || "Hotel"} logo`);
    setStatus("Uploading logo...");
    try {
      const result = await global.staffFetchJson(`${API_ROOT}/format/logo`, {
        method: "POST",
        body
      });
      activeFormat = result.format || activeFormat;
      dialog.innerHTML = buildDialog(activeFormat);
      renderPreview();
      setStatus("Logo uploaded and saved.");
    } catch (error) {
      setStatus(error.message || "Logo upload failed.", true);
    }
  }

  async function removeLogo() {
    if (!global.confirm("Remove the current food receipt logo for this hotel?")) return;
    setStatus("Removing logo...");
    try {
      const result = await global.staffFetchJson(`${API_ROOT}/format/logo`, {
        method: "DELETE"
      });
      activeFormat = result.format || activeFormat;
      dialog.innerHTML = buildDialog(activeFormat);
      renderPreview();
      setStatus("Logo removed.");
    } catch (error) {
      setStatus(error.message || "Logo could not be removed.", true);
    }
  }

  async function resetSettings() {
    if (!global.confirm("Reset this hotel's food order bill format to safe defaults?")) return;
    setStatus("Resetting food bill format...");
    try {
      const result = await global.staffFetchJson(`${API_ROOT}/format/reset`, { method: "POST" });
      activeFormat = result.format || {};
      dialog.innerHTML = buildDialog(activeFormat);
      renderPreview();
      setStatus("Reset to hotel defaults.");
    } catch (error) {
      setStatus(error.message || "Food bill format reset failed.", true);
    }
  }

  async function testPrint() {
    const form = dialog?.querySelector("#foodBillFormatForm");
    if (!form || !previewBill) {
      setStatus("A real hotel order is required for test print preview.", true);
      return;
    }
    const bill = applyFormatToPreviewBill(formDataToFormat(form, activeFormat || {}));
    try {
      await global.staffFetchJson(`${API_ROOT}/format/test-print`, { method: "POST" });
    } catch (error) {
      console.error("Food bill test print audit failed:", error);
    }
    if (!global.FoodOrderReceipt.openPrintWindow(bill)) {
      setStatus("Popup blocked. Allow popups and try Print Test again.", true);
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("#staffFoodBillFormatBtn")) {
      void openSettings();
      return;
    }
    if (target.closest("[data-food-bill-format-close]")) {
      dialog?.close();
      return;
    }
    if (target.closest("[data-food-bill-format-preview]")) {
      const form = dialog?.querySelector("#foodBillFormatForm");
      if (form) void refreshServerPreview(form);
      return;
    }
    if (target.closest("[data-food-bill-format-test-print]")) {
      void testPrint();
      return;
    }
    if (target.closest("[data-food-bill-format-reset]")) {
      void resetSettings();
      return;
    }
    if (target.closest("[data-food-bill-logo-upload]")) {
      void uploadLogo();
      return;
    }
    if (target.closest("[data-food-bill-logo-remove]")) {
      void removeLogo();
    }
  });

  document.addEventListener("submit", (event) => {
    if (event.target?.id !== "foodBillFormatForm") return;
    event.preventDefault();
    void saveSettings(event.target);
  });

  document.addEventListener("input", (event) => {
    if (event.target?.closest?.("#foodBillFormatForm")) renderPreview();
  });
})(window);
