"use strict";

(function installRoomCheckoutBillSettings(global) {
  const API_ROOT = `${global.APP_RUNTIME_CONFIG?.API_BASE_URL || "/api"}/staff/room-checkout-bill`;
  let activeFormat = null;
  let dialog = null;

  function escape(value) {
    return global.RoomCheckoutReceipt?.escapeHTML(value) || String(value || "");
  }

  function field(name, label, value = "", type = "text", extra = "") {
    return `
      <label class="room-bill-format-field">
        <span>${escape(label)}</span>
        <input name="${escape(name)}" type="${escape(type)}" value="${escape(value)}" ${extra}>
      </label>
    `;
  }

  function checkbox(name, label, checked) {
    return `
      <label>
        <input name="${escape(name)}" type="checkbox" ${checked ? "checked" : ""}>
        <span>${escape(label)}</span>
      </label>
    `;
  }

  function buildDialog(format = {}) {
    const privacy = format.privacy || {};
    const display = format.display || {};
    const qr = format.qr || {};
    const print = format.print || {};
    const messages = format.messages || {};
    return `
      <div class="room-bill-format-layout">
        <form class="room-bill-format-editor" id="roomBillFormatForm">
          <div class="room-bill-format-head">
            <div>
              <h2>Room Checkout Bill Format</h2>
              <p>Hotel-owned branding, privacy, QR, and 58/80mm print settings.</p>
            </div>
            <button class="staff-btn secondary" type="button" data-room-bill-format-close>Close</button>
          </div>

          <div class="room-bill-format-grid">
            <div class="room-bill-format-group"><h3>Hotel header</h3></div>
            ${field("companyName", "Hotel / company name", format.companyName)}
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
            ${field("licenceNumber", "Licence number", format.licenceNumber)}
            ${field("registrationNumber", "Registration number", format.registrationNumber)}
            ${field("billTitle", "Receipt heading", format.billTitle)}
            <label class="room-bill-format-field">
              <span>Receipt logo</span>
              <input id="roomBillLogoInput" type="file" accept="image/png,image/jpeg,image/webp">
            </label>
            <div class="room-bill-format-field">
              <span>Logo actions</span>
              <div>
                <button class="staff-btn secondary" type="button" data-room-bill-logo-upload>Upload</button>
                <button class="staff-btn secondary" type="button" data-room-bill-logo-remove>Remove</button>
              </div>
            </div>

            <div class="room-bill-format-group"><h3>Privacy and display</h3></div>
            <div class="room-bill-format-checks">
              ${checkbox("showGuestName", "Show guest name", privacy.showGuestName !== false)}
              ${checkbox("maskGuestPhone", "Mask guest phone", privacy.maskGuestPhone !== false)}
              ${checkbox("maskGuestEmail", "Mask guest email", privacy.maskGuestEmail !== false)}
              ${checkbox("maskGuestId", "Mask guest ID", privacy.maskGuestId !== false)}
              ${checkbox("showGuestCount", "Show guest count", privacy.showGuestCount !== false)}
              ${checkbox("showSignatureLines", "Show signature lines", privacy.showSignatureLines !== false)}
              ${checkbox("showHotelLogo", "Show hotel logo", display.showHotelLogo !== false)}
              ${checkbox("showRoomType", "Show room type", display.showRoomType !== false)}
              ${checkbox("showPaymentMethod", "Show payment method", display.showPaymentMethod !== false)}
              ${checkbox("showCashier", "Show cashier", display.showCashier !== false)}
              ${checkbox("showDiscount", "Show discount", display.showDiscount !== false)}
              ${checkbox("showAdvance", "Show advance", display.showAdvance !== false)}
              ${checkbox("showBalance", "Show balance", display.showBalance !== false)}
              ${checkbox("showPaymentBreakdown", "Show payment breakdown", display.showPaymentBreakdown !== false)}
              ${checkbox("hideZeroTotals", "Hide zero-value totals", display.hideZeroTotals !== false)}
            </div>

            <div class="room-bill-format-group"><h3>QR code</h3></div>
            <div class="room-bill-format-checks">
              ${checkbox("qrEnabled", "Enable QR code", qr.enabled === true)}
              ${checkbox("showQrCode", "Show QR on receipt", display.showQrCode !== false)}
            </div>
            <label class="room-bill-format-field">
              <span>QR type</span>
              <select name="qrType">
                ${["website", "feedback", "support"].map((value) => `<option value="${value}" ${qr.type === value ? "selected" : ""}>${value}</option>`).join("")}
              </select>
            </label>
            ${field("qrValue", "QR destination (https)", qr.value, "url")}
            ${field("qrCaption", "QR caption", qr.caption)}

            <div class="room-bill-format-group"><h3>Messages</h3></div>
            ${field("thankYou", "Thank-you message", messages.thankYou)}
            ${field("feedback", "Feedback message", messages.feedback)}
            ${field("support", "Support message", messages.support)}
            ${field("footer", "Footer", messages.footer)}
            ${field("legalNote", "Legal note", messages.legalNote)}

            <div class="room-bill-format-group"><h3>Thermal print calibration</h3></div>
            <label class="room-bill-format-field">
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
            <label class="room-bill-format-field">
              <span>Separator style</span>
              <select name="separatorStyle">
                ${["dashed", "dotted", "solid"].map((value) => `<option value="${value}" ${print.separatorStyle === value ? "selected" : ""}>${value}</option>`).join("")}
              </select>
            </label>
          </div>

          <p id="roomBillFormatStatus" class="staff-status" role="status" aria-live="polite"></p>
          <div class="room-bill-format-actions">
            <button class="staff-btn" type="submit">Save and Activate</button>
            <button class="staff-btn secondary" type="button" data-room-bill-format-preview>Preview</button>
            <button class="staff-btn secondary" type="button" data-room-bill-format-test-print>Print Test</button>
            <button class="staff-btn secondary" type="button" data-room-bill-format-reset>Reset to Default</button>
          </div>
        </form>
        <aside class="room-bill-format-preview" id="roomBillFormatPreview" aria-label="Live thermal receipt preview"></aside>
      </div>
    `;
  }

  function formDataToFormat(form, base = {}) {
    const data = new FormData(form);
    const checked = (name) => data.get(name) === "on";
    const text = (name) => String(data.get(name) || "").trim();
    const number = (name, fallback) => {
      const value = Number(data.get(name));
      return Number.isFinite(value) ? value : fallback;
    };
    return {
      companyName: text("companyName"),
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
      licenceNumber: text("licenceNumber"),
      registrationNumber: text("registrationNumber"),
      billTitle: text("billTitle"),
      paperWidth: text("paperWidth") === "58" ? "58" : "80",
      privacy: {
        ...(base.privacy || {}),
        showGuestName: checked("showGuestName"),
        maskGuestPhone: checked("maskGuestPhone"),
        maskGuestEmail: checked("maskGuestEmail"),
        maskGuestId: checked("maskGuestId"),
        showGuestCount: checked("showGuestCount"),
        showSignatureLines: checked("showSignatureLines")
      },
      display: {
        ...(base.display || {}),
        showHotelLogo: checked("showHotelLogo"),
        showRoomType: checked("showRoomType"),
        showPaymentMethod: checked("showPaymentMethod"),
        showCashier: checked("showCashier"),
        showQrCode: checked("showQrCode"),
        showDiscount: checked("showDiscount"),
        showAdvance: checked("showAdvance"),
        showBalance: checked("showBalance"),
        showPaymentBreakdown: checked("showPaymentBreakdown"),
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
        fontScale: number("fontScale", 1),
        logoWidthMm: number("logoWidthMm", 22),
        marginMm: number("marginMm", 2),
        lineSpacing: number("lineSpacing", 1.15),
        separatorStyle: text("separatorStyle") || "dashed"
      },
      messages: {
        ...(base.messages || {}),
        thankYou: text("thankYou"),
        feedback: text("feedback"),
        support: text("support"),
        footer: text("footer"),
        legalNote: text("legalNote")
      }
    };
  }

  function previewBill(format) {
    return {
      provisional: false,
      folioNumber: "GF-PREVIEW",
      invoiceNumber: "RCPT-PREVIEW",
      bookingReference: "RB-PREVIEW",
      issuedAt: new Date().toISOString(),
      paymentStatus: "paid",
      checkoutStatus: "checked_out",
      currency: "INR",
      hotel: {
        name: format.companyName || "Your Hotel",
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
        licenceNumber: format.licenceNumber,
        registrationNumber: format.registrationNumber,
        logoUrl: format.logoUrl,
        logoAltText: format.logoAltText
      },
      guest: {
        name: "Guest name preview",
        phone: "+91 ******1234",
        email: "g***@example.com",
        maskedId: "****1234",
        adults: 2,
        children: 0
      },
      stay: {
        roomNumber: "Room",
        roomType: "Room type",
        checkIn: new Date().toISOString(),
        checkOut: new Date(Date.now() + 86400000).toISOString(),
        nights: 1
      },
      lines: [
        { date: new Date().toISOString(), description: "Room accommodation", quantity: 1, rate: 1000, amount: 1000, category: "room" },
        { date: new Date().toISOString(), description: "Room service", quantity: 1, rate: 250, amount: 250, category: "room_service" }
      ],
      totals: {
        roomSubtotal: 1000,
        foodSubtotal: 250,
        additionalCharges: 0,
        discount: 0,
        serviceCharge: 0,
        taxes: [{ label: "Tax", amount: 50 }],
        grandTotal: 1300,
        advancePaid: 300,
        refund: 0,
        paid: 1300,
        balance: 0
      },
      payment: {
        methods: [{ method: "card", maskedReference: "****1234", amount: 1300 }]
      },
      cashier: "Authorized staff",
      format: {
        ...format,
        qrDataUrl: ""
      },
      reprintCount: 0
    };
  }

  function renderPreview() {
    const form = dialog?.querySelector("#roomBillFormatForm");
    const target = dialog?.querySelector("#roomBillFormatPreview");
    if (!form || !target) return;
    const format = formDataToFormat(form, activeFormat || {});
    target.innerHTML = global.RoomCheckoutReceipt.buildReceiptMarkup(previewBill(format));
  }

  function setStatus(message, isError = false) {
    const status = dialog?.querySelector("#roomBillFormatStatus");
    if (!status) return;
    status.textContent = message || "";
    status.classList.toggle("is-error", isError);
  }

  async function openSettings() {
    if (typeof global.isStaffManagerSession === "function" && !global.isStaffManagerSession()) {
      global.alert("Owner access is required to configure the room checkout bill.");
      return;
    }

    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.className = "room-bill-format-dialog";
      document.body.appendChild(dialog);
    }
    dialog.innerHTML = '<div class="staff-status">Loading hotel bill format…</div>';
    dialog.showModal();

    try {
      const result = await global.staffFetchJson(`${API_ROOT}/format`);
      activeFormat = result.format || {};
      dialog.innerHTML = buildDialog(activeFormat);
      renderPreview();
    } catch (error) {
      dialog.innerHTML = `
        <div class="room-bill-format-editor">
          <h2>Room Checkout Bill Format</h2>
          <p class="staff-status is-error">${escape(error.message || "Failed to load bill format.")}</p>
          <button class="staff-btn secondary" type="button" data-room-bill-format-close>Close</button>
        </div>
      `;
    }
  }

  async function saveSettings(form) {
    const payload = formDataToFormat(form, activeFormat || {});
    setStatus("Saving hotel bill format…");
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
      setStatus(error.message || "Failed to save bill format.", true);
    }
  }

  async function uploadLogo() {
    const input = dialog?.querySelector("#roomBillLogoInput");
    if (!input?.files?.[0]) {
      setStatus("Choose a PNG, JPG, or WebP logo first.", true);
      return;
    }
    const body = new FormData();
    body.append("file", input.files[0]);
    body.append("altText", `${activeFormat?.companyName || "Hotel"} logo`);
    setStatus("Uploading logo…");
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
    if (!global.confirm("Remove the current receipt logo for this hotel?")) return;
    setStatus("Removing logo…");
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
    if (!global.confirm("Reset this hotel's room checkout bill format to safe defaults?")) return;
    setStatus("Resetting bill format…");
    try {
      const result = await global.staffFetchJson(`${API_ROOT}/format/reset`, {
        method: "POST"
      });
      activeFormat = result.format || {};
      dialog.innerHTML = buildDialog(activeFormat);
      renderPreview();
      setStatus("Reset to hotel defaults.");
    } catch (error) {
      setStatus(error.message || "Bill format reset failed.", true);
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest("#staffRoomBillFormatBtn")) {
      void openSettings();
      return;
    }
    if (target.closest("[data-room-bill-format-close]")) {
      dialog?.close();
      return;
    }
    if (target.closest("[data-room-bill-format-preview]")) {
      renderPreview();
      return;
    }
    if (target.closest("[data-room-bill-format-test-print]")) {
      const form = dialog?.querySelector("#roomBillFormatForm");
      if (form) global.RoomCheckoutReceipt.openPrintWindow(previewBill(formDataToFormat(form, activeFormat || {})));
      return;
    }
    if (target.closest("[data-room-bill-format-reset]")) {
      void resetSettings();
      return;
    }
    if (target.closest("[data-room-bill-logo-upload]")) {
      void uploadLogo();
      return;
    }
    if (target.closest("[data-room-bill-logo-remove]")) {
      void removeLogo();
      return;
    }

    const reprint = target.closest("[data-room-checkout-reprint]");
    if (reprint) {
      const bookingId = String(reprint.dataset.bookingId || reprint.dataset.id || "").trim();
      const reason = global.prompt("Reason for reprint (required):", "Guest copy requested");
      if (!bookingId || !reason?.trim()) return;
      void global.staffFetchJson(`${API_ROOT}/bookings/${encodeURIComponent(bookingId)}/reprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() })
      }).then((result) => {
        if (!global.RoomCheckoutReceipt.openPrintWindow(result.bill)) {
          global.alert("Popup blocked. Please allow popups to print the reissued copy.");
        }
      }).catch((error) => {
        global.alert(error.message || "Reprint failed.");
      });
    }
  });

  document.addEventListener("submit", (event) => {
    if (event.target?.id !== "roomBillFormatForm") return;
    event.preventDefault();
    void saveSettings(event.target);
  });

  document.addEventListener("input", (event) => {
    if (event.target?.closest?.("#roomBillFormatForm")) renderPreview();
  });
})(window);
