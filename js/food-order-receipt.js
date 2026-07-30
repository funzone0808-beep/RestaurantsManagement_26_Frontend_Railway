"use strict";

(function installFoodOrderReceipt(global) {
  const API_ROOT = `${global.APP_RUNTIME_CONFIG?.API_BASE_URL || "/api"}/staff/food-order-bill`;
  let dialog = null;
  let activeBill = null;
  let activeOrderId = "";

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function formatMoney(value, currency = "INR") {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: currency || "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(number(value));
    } catch {
      return `Rs. ${number(value).toFixed(2)}`;
    }
  }

  function formatDate(value, includeTime = true) {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-IN", includeTime
      ? {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }
      : { day: "2-digit", month: "short", year: "numeric" });
  }

  function labelStatus(value = "") {
    return String(value || "")
      .trim()
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  function normalizePaperWidth(value) {
    return String(value) === "58" ? 58 : 80;
  }

  function shouldShowAmount(value, hideZero) {
    return value !== null && value !== undefined && (!hideZero || number(value) !== 0);
  }

  function buildItemMeta(item = {}, display = {}) {
    const lines = [];
    if (display.showVariants !== false && item.variant) {
      lines.push(`Variant: ${item.variant}`);
    }
    if (display.showAddons !== false && Array.isArray(item.addons) && item.addons.length) {
      lines.push(`Add-ons: ${item.addons.join(", ")}`);
    }
    if (item.itemType === "combo" && Array.isArray(item.comboItems) && item.comboItems.length) {
      lines.push(`Includes: ${item.comboItems.map((entry) => `${entry.quantity || 1}x ${entry.name}`).join(" + ")}`);
    }
    if (display.showItemNotes === true && item.notes) {
      lines.push(`Note: ${item.notes}`);
    }
    if (display.showItemTax === true && number(item.itemTax) !== 0) {
      lines.push(`Tax: ${formatMoney(item.itemTax)}`);
    }
    if (display.showDiscount !== false && number(item.itemDiscount) !== 0) {
      lines.push(`Discount: -${formatMoney(item.itemDiscount)}`);
    }
    return lines.map((line) => `<span>${escapeHTML(line)}</span>`).join("");
  }

  function buildItemsRows(bill = {}) {
    const items = Array.isArray(bill.items) ? bill.items : [];
    if (!items.length) {
      return '<tr><td colspan="4" class="food-receipt-empty">No payable items found.</td></tr>';
    }
    const display = bill.format?.display || {};
    return items.map((item) => `
      <tr>
        <td class="food-receipt-item">
          <strong>${escapeHTML(item.name || "Item")}</strong>
          <span class="food-receipt-mobile-rate">${escapeHTML(item.quantity)} x ${escapeHTML(formatMoney(item.unitRate, bill.currency))}</span>
          <span class="food-receipt-item-meta">${buildItemMeta(item, display)}</span>
        </td>
        <td class="food-receipt-number">${escapeHTML(item.quantity)}</td>
        <td class="food-receipt-number">${escapeHTML(formatMoney(item.unitRate, bill.currency))}</td>
        <td class="food-receipt-number">${escapeHTML(formatMoney(item.amount, bill.currency))}</td>
      </tr>
    `).join("");
  }

  function buildRelatedOrders(bill = {}) {
    const orders = Array.isArray(bill.relatedOrders) ? bill.relatedOrders : [];
    if (!orders.length) return "";
    return `
      <section class="food-receipt-related">
        <h3>Additional orders (billed separately)</h3>
        ${orders.map((order) => `
          <div class="food-receipt-related-order">
            <p><strong>${escapeHTML(order.label)}</strong><span>${escapeHTML(formatDate(order.createdAt))}</span></p>
            ${(order.items || []).map((item) => `
              <p><span>${escapeHTML(item.name)} x ${escapeHTML(item.quantity)}</span><strong>${escapeHTML(formatMoney(item.amount, bill.currency))}</strong></p>
            `).join("")}
            <p class="food-receipt-related-total"><span>Separate total</span><strong>${escapeHTML(formatMoney(order.grandTotal, bill.currency))}</strong></p>
          </div>
        `).join("")}
      </section>
    `;
  }

  function totalRow(label, value, bill, className = "") {
    return `
      <div class="food-receipt-total-row ${escapeHTML(className)}">
        <span>${escapeHTML(label)}</span>
        <strong>${escapeHTML(formatMoney(value, bill.currency))}</strong>
      </div>
    `;
  }

  function buildTotals(bill = {}) {
    const totals = bill.totals || {};
    const display = bill.format?.display || {};
    const hideZero = display.hideZeroTotals !== false;
    const rows = [];
    if (shouldShowAmount(totals.itemSubtotal, hideZero)) {
      rows.push(totalRow("Item Subtotal", totals.itemSubtotal, bill));
    }
    if (shouldShowAmount(totals.addonTotal, hideZero)) {
      rows.push(totalRow("Add-On Total", totals.addonTotal, bill));
    }
    if (shouldShowAmount(totals.variantAdjustment, hideZero)) {
      rows.push(totalRow("Variant Adjustment", totals.variantAdjustment, bill));
    }
    if (display.showDiscount !== false && shouldShowAmount(totals.discount, hideZero)) {
      rows.push(totalRow("Discount", -Math.abs(number(totals.discount)), bill));
    }
    if (display.showCoupon !== false && shouldShowAmount(totals.couponDiscount, hideZero)) {
      rows.push(totalRow("Coupon Discount", -Math.abs(number(totals.couponDiscount)), bill));
    }
    if (display.showPackagingCharge !== false && shouldShowAmount(totals.packagingCharge, hideZero)) {
      rows.push(totalRow("Packaging Charge", totals.packagingCharge, bill));
    }
    if (display.showDeliveryCharge !== false && shouldShowAmount(totals.deliveryCharge, hideZero)) {
      rows.push(totalRow("Delivery Charge", totals.deliveryCharge, bill));
    }
    if (display.showServiceCharge !== false && shouldShowAmount(totals.serviceCharge, hideZero)) {
      rows.push(totalRow("Service Charge", totals.serviceCharge, bill));
    }
    if (shouldShowAmount(totals.taxableAmount, hideZero)) {
      rows.push(totalRow("Taxable Amount", totals.taxableAmount, bill));
    }
    (Array.isArray(totals.taxes) ? totals.taxes : []).forEach((tax) => {
      if (shouldShowAmount(tax.amount, hideZero)) {
        rows.push(totalRow(tax.label || "Tax", tax.amount, bill));
      }
    });
    if (display.showDiscount !== false && shouldShowAmount(totals.upiDiscount, hideZero)) {
      const percent = totals.upiDiscountPercent === null || totals.upiDiscountPercent === undefined
        ? ""
        : ` (${totals.upiDiscountPercent}%)`;
      rows.push(totalRow(`UPI Discount${percent}`, -Math.abs(number(totals.upiDiscount)), bill));
    }
    if (display.showRounding !== false && shouldShowAmount(totals.roundOff, hideZero)) {
      rows.push(totalRow("Round-Off", totals.roundOff, bill));
    }
    rows.push(totalRow(
      bill.cancelled ? "STORED TOTAL (NON-PAYABLE)" : bill.format?.labels?.grandTotal || "GRAND TOTAL",
      totals.grandTotal,
      bill,
      "is-grand"
    ));
    if (shouldShowAmount(totals.paid, hideZero)) {
      rows.push(totalRow(bill.format?.labels?.paid || "Paid", totals.paid, bill));
    }
    if (shouldShowAmount(totals.refund, hideZero)) {
      rows.push(totalRow(bill.format?.labels?.refund || "Refund", totals.refund, bill));
    }
    if (!bill.cancelled && shouldShowAmount(totals.balance, false)) {
      rows.push(totalRow(
        bill.format?.labels?.balance || "Balance",
        totals.balance,
        bill,
        number(totals.balance) > 0 ? "is-balance-due" : ""
      ));
    }
    return rows.join("");
  }

  function buildPayments(bill = {}) {
    const payments = Array.isArray(bill.payments) ? bill.payments : [];
    if (bill.format?.display?.showPaymentBreakdown === false || !payments.length) return "";
    return `
      <section class="food-receipt-payments">
        <h3>Payment Breakdown</h3>
        ${payments.map((payment) => `
          <div class="food-receipt-payment-row">
            <span>
              ${escapeHTML(labelStatus(payment.method))}
              ${payment.maskedReference ? `<small>${escapeHTML(payment.maskedReference)}</small>` : ""}
            </span>
            <strong>${escapeHTML(formatMoney(payment.amount, bill.currency))}</strong>
          </div>
        `).join("")}
      </section>
    `;
  }

  function buildRoomServiceState(bill = {}) {
    const room = bill.roomService || {};
    if (!room.linked) return "";
    const state = room.transferState === "not_billable"
      ? "Cancelled - excluded from Room Folio"
      : room.transferState === "transferred"
      ? `Transferred to Room Folio${room.folioReference ? ` - ${room.folioReference}` : ""}`
      : room.transferState === "settled"
        ? "Room charge settled"
        : room.billingMode === "add_to_room_bill"
          ? `Pending Room Charge${bill.orderContext?.roomNumber ? ` - Room ${bill.orderContext.roomNumber}` : ""}`
          : "Separate Food Bill";
    return `<p class="food-receipt-room-state"><strong>Room Service:</strong> ${escapeHTML(state)}</p>`;
  }

  function buildReceiptMarkup(bill = {}) {
    const format = bill.format || {};
    const display = format.display || {};
    const privacy = format.privacy || {};
    const messages = format.messages || {};
    const hotel = bill.hotel || {};
    const context = bill.orderContext || {};
    const width = normalizePaperWidth(format.paperWidth);
    const address = Array.isArray(hotel.addressLines) ? hotel.addressLines : [];
    const legalIds = [
      hotel.taxId ? `GSTIN: ${hotel.taxId}` : "",
      hotel.fssaiNumber ? `FSSAI: ${hotel.fssaiNumber}` : "",
      hotel.licenceNumber ? `Licence: ${hotel.licenceNumber}` : "",
      hotel.registrationNumber ? `Reg: ${hotel.registrationNumber}` : ""
    ].filter(Boolean).join(" | ");
    const logo = display.showHotelLogo !== false && hotel.logoUrl
      ? `<img class="food-receipt-logo" src="${escapeHTML(hotel.logoUrl)}" alt="${escapeHTML(hotel.logoAltText || `${hotel.name || "Hotel"} logo`)}">`
      : "";
    const qr = format.qrDataUrl && display.showQrCode !== false
      ? `
        <figure class="food-receipt-qr is-${escapeHTML(format.qr?.alignment || "center")}">
          <img src="${escapeHTML(format.qrDataUrl)}" alt="Configured hotel QR code">
          ${format.qr?.caption ? `<figcaption>${escapeHTML(format.qr.caption)}</figcaption>` : ""}
        </figure>
      `
      : "";
    const showCustomer = display.showCustomerName !== false && privacy.showCustomerName !== false;
    const cancelledLabel = bill.cancelled
      ? '<div class="food-receipt-watermark">CANCELLED ORDER COPY</div>'
      : bill.provisional
        ? '<div class="food-receipt-watermark">PROVISIONAL - NOT A FINAL TAX INVOICE</div>'
        : "";

    return `
      <article
        class="food-receipt-paper is-${width}mm"
        data-food-receipt
        style="--receipt-paper-width:${width}mm;--receipt-font-scale:${number(format.print?.fontScale) || 1};--receipt-line-height:${number(format.print?.lineSpacing) || 1.15};--receipt-logo-width:${number(format.print?.logoWidthMm) || 22}mm;--receipt-separator-style:${escapeHTML(format.print?.separatorStyle || "dashed")}"
      >
        ${cancelledLabel}
        ${bill.reprintCount ? `<div class="food-receipt-reprint">REPRINT - COPY ${escapeHTML(bill.reprintCount)}</div>` : ""}
        <header class="food-receipt-header">
          ${logo}
          <h1>${escapeHTML(hotel.name || "Hotel")}</h1>
          ${display.showRestaurantName !== false && hotel.restaurantName ? `<h2>${escapeHTML(hotel.restaurantName)}</h2>` : ""}
          ${hotel.propertySubtitle ? `<p>${escapeHTML(hotel.propertySubtitle)}</p>` : ""}
          ${address.map((line) => `<p>${escapeHTML(line)}</p>`).join("")}
          ${hotel.phone ? `<p>Phone: ${escapeHTML(hotel.phone)}${hotel.alternatePhone ? ` | ${escapeHTML(hotel.alternatePhone)}` : ""}</p>` : ""}
          ${hotel.email ? `<p>Email: ${escapeHTML(hotel.email)}</p>` : ""}
          ${hotel.websiteUrl ? `<p class="food-receipt-break">${escapeHTML(hotel.websiteUrl)}</p>` : ""}
          ${legalIds ? `<p class="food-receipt-break">${escapeHTML(legalIds)}</p>` : ""}
        </header>

        <div class="food-receipt-separator"></div>
        <h2 class="food-receipt-title">${escapeHTML(bill.title || format.billTitle || "FOOD ORDER BILL")}</h2>
        <div class="food-receipt-separator is-light"></div>

        <section class="food-receipt-meta food-receipt-meta-grid">
          <p><strong>${escapeHTML(format.labels?.invoice || "Invoice")}</strong> ${escapeHTML(bill.invoiceNumber || "Pending")}</p>
          <p><strong>${escapeHTML(format.labels?.order || "Order")}</strong> ${escapeHTML(bill.orderReference || "")}</p>
          <p><strong>Date</strong> ${escapeHTML(formatDate(bill.issuedAt))}</p>
          <p><strong>${escapeHTML(format.labels?.paymentStatus || "Payment")}</strong> ${escapeHTML(labelStatus(bill.paymentStatus))}</p>
          ${display.showOrderSource !== false ? `<p><strong>${escapeHTML(format.labels?.source || "Source")}</strong> ${escapeHTML(bill.orderSource?.label || "")}</p>` : ""}
          <p><strong>Bill Status</strong> ${escapeHTML(labelStatus(bill.orderStatus))}</p>
        </section>

        <div class="food-receipt-separator is-light"></div>
        <section class="food-receipt-meta">
          ${showCustomer && context.customerName ? `<p><strong>Customer:</strong> ${escapeHTML(context.customerName)}</p>` : ""}
          ${context.customerPhone ? `<p><strong>Phone:</strong> ${escapeHTML(context.customerPhone)}</p>` : ""}
          ${context.customerAddress ? `<p><strong>Delivery:</strong> ${escapeHTML(context.customerAddress)}</p>` : ""}
          ${display.showTableNumber !== false && context.tableNumber ? `<p><strong>Table:</strong> ${escapeHTML(context.tableNumber)}</p>` : ""}
          ${display.showRoomNumber !== false && context.roomNumber ? `<p><strong>Room:</strong> ${escapeHTML(context.roomNumber)}</p>` : ""}
          ${context.roomGuestName ? `<p><strong>Room Guest:</strong> ${escapeHTML(context.roomGuestName)}</p>` : ""}
          ${context.roomBookingReference ? `<p><strong>Booking Ref:</strong> ${escapeHTML(context.roomBookingReference)}</p>` : ""}
        </section>

        <table class="food-receipt-lines">
          <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
          <tbody>${buildItemsRows(bill)}</tbody>
        </table>
        <section class="food-receipt-totals">${buildTotals(bill)}</section>
        ${bill.cancelled ? '<p class="food-receipt-nonpayable">Cancelled orders are excluded from payable totals and Room Folio settlement.</p>' : ""}
        ${buildPayments(bill)}
        ${buildRoomServiceState(bill)}
        ${display.showCashier !== false && context.cashier ? `<p class="food-receipt-cashier">Cashier: ${escapeHTML(context.cashier)}</p>` : ""}
        ${bill.orderNote && display.showItemNotes === true ? `<p class="food-receipt-order-note"><strong>Order note:</strong> ${escapeHTML(bill.orderNote)}</p>` : ""}
        ${buildRelatedOrders(bill)}
        <div class="food-receipt-separator is-light"></div>
        <footer class="food-receipt-footer">
          ${messages.thankYou ? `<strong>${escapeHTML(messages.thankYou)}</strong>` : ""}
          ${messages.feedback ? `<p>${escapeHTML(messages.feedback)}</p>` : ""}
          ${messages.support ? `<p>${escapeHTML(messages.support)}</p>` : ""}
          ${qr}
          ${messages.refundNote && bill.paymentStatus === "refunded" ? `<p>${escapeHTML(messages.refundNote)}</p>` : ""}
          ${messages.taxNote ? `<p>${escapeHTML(messages.taxNote)}</p>` : ""}
          ${messages.footer ? `<p>${escapeHTML(messages.footer)}</p>` : ""}
          ${messages.legalNote ? `<p class="food-receipt-legal">${escapeHTML(messages.legalNote)}</p>` : ""}
        </footer>
      </article>
    `;
  }

  function buildDialogMarkup(bill = {}, orderId = "") {
    return `
      <div class="food-receipt-dialog-shell">
        <header class="food-receipt-dialog-head">
          <div>
            <span>${bill.provisional ? "Bill preview" : "Issued food bill"}</span>
            <h2>Food Order Bill</h2>
            <p>${bill.immutable ? "Immutable historical snapshot." : "Verified stored backend totals."}</p>
          </div>
          <button class="staff-btn secondary" type="button" data-food-bill-close>Close</button>
        </header>
        <div class="food-receipt-dialog-layout">
          <div class="food-receipt-preview-canvas">${buildReceiptMarkup(bill)}</div>
          <aside class="food-receipt-actions" aria-label="Food bill actions">
            <button class="staff-btn" type="button" data-food-bill-print data-order-id="${escapeHTML(orderId)}">Print</button>
            <button class="staff-btn secondary" type="button" data-food-bill-download data-order-id="${escapeHTML(orderId)}">Download PDF</button>
            ${bill.immutable ? `<button class="staff-btn secondary" type="button" data-food-bill-reprint data-order-id="${escapeHTML(orderId)}">Reprint Original</button>` : ""}
            <button class="staff-btn secondary" type="button" data-food-bill-close>Back to Order</button>
            <p>${bill.provisional ? "This is not a final tax invoice." : `Original invoice ${escapeHTML(bill.invoiceNumber || "")} - Reprints: ${escapeHTML(bill.reprintCount || 0)}`}</p>
          </aside>
        </div>
      </div>
    `;
  }

  function ensureDialog() {
    if (dialog) return dialog;
    dialog = document.createElement("dialog");
    dialog.className = "food-receipt-dialog";
    document.body.appendChild(dialog);
    return dialog;
  }

  function openLoading(orderId = "") {
    activeOrderId = String(orderId || "");
    activeBill = null;
    const target = ensureDialog();
    target.innerHTML = `
      <div class="food-receipt-loading" role="status" aria-live="polite">
        <div class="food-receipt-skeleton is-title"></div>
        <div class="food-receipt-skeleton"></div>
        <div class="food-receipt-skeleton"></div>
        <div class="food-receipt-skeleton is-lines"></div>
        <p>Loading hotel-scoped food bill...</p>
      </div>
    `;
    if (!target.open) target.showModal();
  }

  function showBill(bill = {}, orderId = "") {
    activeBill = bill;
    activeOrderId = String(orderId || bill.orderReference || "");
    const target = ensureDialog();
    target.innerHTML = buildDialogMarkup(bill, activeOrderId);
    if (!target.open) target.showModal();
  }

  function showError(message = "", orderId = "") {
    activeBill = null;
    activeOrderId = String(orderId || activeOrderId || "");
    const target = ensureDialog();
    target.innerHTML = `
      <div class="food-receipt-error" role="alert">
        <h2>Food bill could not be loaded</h2>
        <p>${escapeHTML(message || "Please try again.")}</p>
        <div>
          <button class="staff-btn" type="button" data-food-bill-retry data-order-id="${escapeHTML(activeOrderId)}">Retry</button>
          <button class="staff-btn secondary" type="button" data-food-bill-close>Back to Order</button>
        </div>
      </div>
    `;
    if (!target.open) target.showModal();
  }

  function printStyles(bill = {}) {
    const width = normalizePaperWidth(bill.format?.paperWidth);
    const margin = Math.max(0, Math.min(8, number(bill.format?.print?.marginMm) || 2));
    return `
      @page { size: ${width}mm auto; margin: ${margin}mm; }
      * { box-sizing: border-box; }
      html, body { width: ${width}mm; margin: 0; padding: 0; background: #fff; }
      body { color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .food-receipt-print-actions { display:flex; gap:8px; justify-content:center; padding:8px; }
      .food-receipt-print-actions button { border:1px solid #111; background:#111; color:#fff; padding:8px 12px; }
      @media print { .food-receipt-print-actions { display:none !important; } }
    `;
  }

  function buildPrintDocument(bill = {}) {
    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>${escapeHTML(bill.invoiceNumber || `Food Bill ${bill.orderReference || ""}`)}</title>
          <link rel="stylesheet" href="css/food-order-receipt.css">
          <style>${printStyles(bill)}</style>
        </head>
        <body class="food-receipt-print-document">
          <div class="food-receipt-print-actions">
            <button type="button" onclick="window.print()">Print / Save PDF</button>
          </div>
          ${buildReceiptMarkup(bill)}
        </body>
      </html>`;
  }

  function openPrintWindow(bill = {}) {
    const printWindow = global.open("", "_blank", "width=520,height=920");
    if (!printWindow) return false;
    printWindow.document.open();
    printWindow.document.write(buildPrintDocument(bill));
    printWindow.document.close();
    printWindow.focus();
    return true;
  }

  async function audit(orderId, action) {
    try {
      await global.staffFetchJson(`${API_ROOT}/orders/${encodeURIComponent(orderId)}/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
    } catch (error) {
      console.error("Food bill audit failed:", error);
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-food-bill-close]")) {
      dialog?.close();
      return;
    }
    const retry = target.closest("[data-food-bill-retry]");
    if (retry) {
      const orderId = String(retry.dataset.orderId || activeOrderId || "");
      if (orderId && typeof global.loadStaffFoodOrderBill === "function") {
        void global.loadStaffFoodOrderBill(orderId);
      }
      return;
    }
    const print = target.closest("[data-food-bill-print]");
    if (print && activeBill) {
      const orderId = String(print.dataset.orderId || activeOrderId || "");
      void audit(orderId, "bill_printed");
      if (!openPrintWindow(activeBill)) {
        global.alert("Popup blocked. Please allow popups to print this bill.");
      }
      return;
    }
    const download = target.closest("[data-food-bill-download]");
    if (download && activeBill) {
      const orderId = String(download.dataset.orderId || activeOrderId || "");
      void audit(orderId, "bill_downloaded");
      if (!openPrintWindow(activeBill)) {
        global.alert("Popup blocked. Please allow popups, then choose Save as PDF in the print dialog.");
      }
      return;
    }
    const reprint = target.closest("[data-food-bill-reprint]");
    if (reprint) {
      const orderId = String(reprint.dataset.orderId || activeOrderId || "");
      const reason = global.prompt("Reason for reprint (required):", "Customer copy requested");
      if (!orderId || !reason?.trim()) return;
      void global.staffFetchJson(`${API_ROOT}/orders/${encodeURIComponent(orderId)}/reprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() })
      }).then((result) => {
        showBill(result.bill, orderId);
        if (!openPrintWindow(result.bill)) {
          global.alert("Popup blocked. Please allow popups to print the reprint copy.");
        }
      }).catch((error) => showError(error.message || "Reprint failed.", orderId));
    }
  });

  global.FoodOrderReceipt = Object.freeze({
    buildPrintDocument,
    buildReceiptMarkup,
    escapeHTML,
    formatMoney,
    openLoading,
    openPrintWindow,
    showBill,
    showError
  });
})(window);
