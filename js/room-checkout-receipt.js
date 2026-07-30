"use strict";

(function installRoomCheckoutReceipt(global) {
  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizePaperWidth(value) {
    return String(value) === "58" ? "58" : "80";
  }

  function currencySymbol(code) {
    return String(code || "INR").toUpperCase() === "INR" ? "₹" : `${code || ""} `;
  }

  function formatMoney(value, currency = "INR") {
    const number = Number(value || 0);
    const safe = Number.isFinite(number) ? number : 0;
    return `${currencySymbol(currency)}${safe.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function formatDate(value, withTime = false, timeZone = "") {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const options = {
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {})
    };
    if (timeZone) options.timeZone = timeZone;
    try {
      return new Intl.DateTimeFormat("en-IN", options).format(date);
    } catch {
      delete options.timeZone;
      return new Intl.DateTimeFormat("en-IN", options).format(date);
    }
  }

  function hasRecordedTime(value = "") {
    return /[T\s]\d{2}:\d{2}/.test(String(value));
  }

  function labelStatus(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function lineDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short"
    }).format(date);
  }

  function totalRow(label, value, bill, className = "", negative = false) {
    const display = negative && Number(value) > 0
      ? `-${formatMoney(value, bill.currency)}`
      : formatMoney(value, bill.currency);
    return `
      <div class="room-receipt-total-row ${className}">
        <span>${escapeHTML(label)}</span>
        <strong>${escapeHTML(display)}</strong>
      </div>
    `;
  }

  function buildReceiptMarkup(bill = {}, options = {}) {
    const format = bill.format || {};
    const labels = format.labels || {};
    const privacy = format.privacy || {};
    const display = format.display || {};
    const messages = format.messages || {};
    const paperWidth = normalizePaperWidth(options.paperWidth || format.paperWidth);
    const print = format.print || {};
    const hotel = bill.hotel || {};
    const guest = bill.guest || {};
    const stay = bill.stay || {};
    const totals = bill.totals || {};
    const payments = Array.isArray(bill.payment?.methods) ? bill.payment.methods : [];
    const lines = Array.isArray(bill.lines) ? bill.lines : [];
    const taxes = Array.isArray(totals.taxes) ? totals.taxes : [];
    const address = Array.isArray(hotel.addressLines) ? hotel.addressLines.filter(Boolean) : [];
    const receiptClass = [
      "room-receipt-paper",
      `is-${paperWidth}mm`,
      bill.provisional ? "is-provisional" : "is-issued",
      Number(bill.reprintCount || 0) > 0 ? "is-reprint" : ""
    ].join(" ");
    const style = [
      `--receipt-font-scale:${Number(print.fontScale || 1)}`,
      `--receipt-line-height:${Number(print.lineSpacing || 1.15)}`,
      `--receipt-logo-width:${Number(print.logoWidthMm || 22)}mm`,
      `--receipt-separator-style:${escapeHTML(print.separatorStyle || "dashed")}`
    ].join(";");

    const logo = display.showHotelLogo !== false && hotel.logoUrl
      ? `<img class="room-receipt-logo" src="${escapeHTML(hotel.logoUrl)}" alt="${escapeHTML(hotel.logoAltText || `${hotel.name || "Hotel"} logo`)}" onerror="this.hidden=true">`
      : "";
    const legalIds = [
      hotel.gstin ? `GSTIN: ${hotel.gstin}` : hotel.taxId ? `Tax ID: ${hotel.taxId}` : "",
      hotel.stateCode ? `State: ${hotel.stateCode}` : "",
      hotel.accommodationSac ? `SAC: ${hotel.accommodationSac}` : "",
      hotel.licenceNumber ? `Licence: ${hotel.licenceNumber}` : "",
      hotel.registrationNumber ? `Reg: ${hotel.registrationNumber}` : ""
    ].filter(Boolean).join(" | ");

    const lineRows = lines.length
      ? lines.map((line) => `
          <tr>
            <td class="room-receipt-date">${escapeHTML(lineDate(line.date))}</td>
            <td class="room-receipt-description">${escapeHTML(line.description || "Charge")}</td>
            <td class="room-receipt-number">${escapeHTML(line.quantity ?? "")}</td>
            <td class="room-receipt-number">${escapeHTML(formatMoney(line.rate || 0, bill.currency).replace(currencySymbol(bill.currency), ""))}</td>
            <td class="room-receipt-number">${escapeHTML(formatMoney(line.amount || 0, bill.currency).replace(currencySymbol(bill.currency), ""))}</td>
          </tr>
        `).join("")
      : '<tr><td colspan="5" class="room-receipt-empty">No billable charges.</td></tr>';

    const totalsRows = [
      totalRow("Room Subtotal", totals.roomSubtotal, bill),
      Number(totals.foodSubtotal || 0) || display.hideZeroTotals === false
        ? totalRow("Food & Beverage", totals.foodSubtotal, bill)
        : "",
      Number(totals.additionalCharges || 0) || display.hideZeroTotals === false
        ? totalRow("Additional Charges", totals.additionalCharges, bill)
        : "",
      display.showDiscount !== false && (Number(totals.discount || 0) || display.hideZeroTotals === false)
        ? totalRow("Discount", totals.discount, bill, "", true)
        : "",
      Number(totals.serviceCharge || 0) || display.hideZeroTotals === false
        ? totalRow("Service Charge", totals.serviceCharge, bill)
        : "",
      ...taxes.map((tax) => totalRow(tax.label || "Tax", tax.amount, bill)),
      totalRow(labels.grandTotal || "GRAND TOTAL", totals.grandTotal, bill, "is-grand"),
      display.showAdvance !== false && (Number(totals.advancePaid || 0) || display.hideZeroTotals === false)
        ? totalRow("Advance Paid", totals.advancePaid, bill)
        : "",
      Number(totals.refund || 0) || display.hideZeroTotals === false
        ? totalRow("Refund", totals.refund, bill)
        : "",
      totalRow(labels.paid || "Paid", totals.paid, bill),
      display.showBalance !== false
        ? totalRow(labels.balance || "Balance", totals.balance, bill, Number(totals.balance || 0) > 0 ? "is-balance-due" : "")
        : ""
    ].join("");

    const paymentRows = display.showPaymentBreakdown !== false && payments.length
      ? payments.map((payment) => `
          <div class="room-receipt-payment-row">
            <span>${escapeHTML(labelStatus(payment.method || "Payment"))}${payment.maskedReference ? ` ${escapeHTML(payment.maskedReference)}` : ""}</span>
            <strong>${escapeHTML(formatMoney(payment.amount, bill.currency))}</strong>
          </div>
        `).join("")
      : "";

    const qr = display.showQrCode !== false && format.qr?.enabled && format.qrDataUrl
      ? `
        <figure class="room-receipt-qr is-${escapeHTML(format.qr.alignment || "center")}">
          <img src="${escapeHTML(format.qrDataUrl)}" alt="${escapeHTML(format.qr.caption || "Receipt QR code")}">
          ${format.qr.caption ? `<figcaption>${escapeHTML(format.qr.caption)}</figcaption>` : ""}
        </figure>
      `
      : "";

    return `
      <article class="${receiptClass}" data-room-receipt data-paper-width="${paperWidth}" style="${style}">
        ${bill.provisional ? '<div class="room-receipt-watermark">PROVISIONAL</div>' : ""}
        ${Number(bill.reprintCount || 0) > 0 ? `<div class="room-receipt-reprint">REPRINT · COPY ${escapeHTML(bill.reprintCount)}</div>` : ""}
        <header class="room-receipt-header">
          ${logo}
          <h1>${escapeHTML(hotel.name || "Hotel")}</h1>
          ${hotel.propertySubtitle ? `<p class="room-receipt-subtitle">${escapeHTML(hotel.propertySubtitle)}</p>` : ""}
          ${address.map((line) => `<p>${escapeHTML(line)}</p>`).join("")}
          ${hotel.phone ? `<p>Phone: ${escapeHTML(hotel.phone)}${hotel.alternatePhone ? ` | ${escapeHTML(hotel.alternatePhone)}` : ""}</p>` : ""}
          ${hotel.email ? `<p>Email: ${escapeHTML(hotel.email)}</p>` : ""}
          ${hotel.websiteUrl ? `<p class="room-receipt-break">${escapeHTML(hotel.websiteUrl)}</p>` : ""}
          ${legalIds ? `<p class="room-receipt-break">${escapeHTML(legalIds)}</p>` : ""}
        </header>

        <div class="room-receipt-separator"></div>
        <h2 class="room-receipt-title">${escapeHTML(format.billTitle || "HOTEL CHECKOUT BILL / GUEST FOLIO")}</h2>
        <div class="room-receipt-separator is-light"></div>

        <section class="room-receipt-meta room-receipt-meta-grid">
          <p><strong>${escapeHTML(labels.folio || "Folio No.")}</strong> ${escapeHTML(bill.folioNumber || "Pending")}</p>
          <p><strong>${escapeHTML(labels.invoice || "Receipt No.")}</strong> ${escapeHTML(bill.invoiceNumber || "Pending")}</p>
          <p><strong>Date</strong> ${escapeHTML(formatDate(bill.issuedAt, true))}</p>
          <p><strong>${escapeHTML(labels.bookingReference || "Booking Ref.")}</strong> ${escapeHTML(bill.bookingReference || "")}</p>
          <p><strong>${escapeHTML(labels.paymentStatus || "Payment")}</strong> ${escapeHTML(labelStatus(bill.paymentStatus || ""))}</p>
          <p><strong>${escapeHTML(labels.currency || "Currency")}</strong> ${escapeHTML(bill.currency || "INR")}</p>
        </section>

        <div class="room-receipt-separator is-light"></div>
        <section class="room-receipt-meta">
          ${guest.name ? `<p><strong>Name:</strong> ${escapeHTML(guest.name)}</p>` : ""}
          ${guest.companyName ? `<p><strong>Company:</strong> ${escapeHTML(guest.companyName)}</p>` : ""}
          ${guest.gstin ? `<p><strong>Guest GSTIN:</strong> ${escapeHTML(guest.gstin)}</p>` : ""}
          ${guest.placeOfSupply ? `<p><strong>Place of Supply:</strong> ${escapeHTML(guest.placeOfSupply)}</p>` : ""}
          ${guest.phone ? `<p><strong>Phone:</strong> ${escapeHTML(guest.phone)}</p>` : ""}
          ${guest.email ? `<p><strong>Email:</strong> ${escapeHTML(guest.email)}</p>` : ""}
          ${guest.maskedId ? `<p><strong>Guest ID:</strong> ${escapeHTML(guest.maskedId)}</p>` : ""}
          ${privacy.showGuestCount !== false ? `<p><strong>Guests:</strong> ${escapeHTML(`${guest.adults || 0} adults, ${guest.children || 0} children`)}</p>` : ""}
        </section>

        <div class="room-receipt-separator is-light"></div>
        <section class="room-receipt-meta room-receipt-stay">
          <p><strong>${escapeHTML(labels.room || "Room")}</strong> ${escapeHTML(stay.roomNumber || "")}</p>
          ${display.showRoomType !== false && stay.roomType ? `<p><strong>${escapeHTML(labels.roomType || "Type")}</strong> ${escapeHTML(stay.roomType)}</p>` : ""}
          <p><strong>${escapeHTML(labels.checkIn || "Check-in")}</strong> ${escapeHTML(formatDate(stay.checkIn, hasRecordedTime(stay.checkIn), stay.timeZone))}</p>
          <p><strong>${escapeHTML(labels.checkOut || "Check-out")}</strong> ${escapeHTML(formatDate(stay.checkOut, hasRecordedTime(stay.checkOut), stay.timeZone))}</p>
          <p><strong>Nights</strong> ${escapeHTML(stay.nights || 0)}</p>
        </section>

        <table class="room-receipt-lines">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>${lineRows}</tbody>
        </table>

        <section class="room-receipt-totals">${totalsRows}</section>
        ${display.showPaymentMethod !== false && paymentRows ? `<section class="room-receipt-payments">${paymentRows}</section>` : ""}

        ${display.showCashier !== false && bill.cashier ? `<p class="room-receipt-cashier">Cashier: ${escapeHTML(bill.cashier)}</p>` : ""}
        ${privacy.showSignatureLines !== false ? `
          <section class="room-receipt-signatures">
            <span>Guest Signature: ____________</span>
            <span>Cashier: ____________</span>
          </section>
        ` : ""}
        <p class="room-receipt-status"><strong>Checkout Status:</strong> ${escapeHTML(labelStatus(bill.checkoutStatus || ""))}</p>
        <div class="room-receipt-separator is-light"></div>
        <footer class="room-receipt-footer">
          ${messages.thankYou ? `<strong>${escapeHTML(messages.thankYou)}</strong>` : ""}
          ${messages.feedback ? `<p>${escapeHTML(messages.feedback)}</p>` : ""}
          ${messages.support ? `<p>${escapeHTML(messages.support)}</p>` : ""}
          ${qr}
          ${messages.footer ? `<p>${escapeHTML(messages.footer)}</p>` : ""}
          ${messages.legalNote ? `<p class="room-receipt-legal">${escapeHTML(messages.legalNote)}</p>` : ""}
        </footer>
      </article>
    `;
  }

  function buildCheckoutPanel({ bill = {}, finalizeButton = "", bookingId = "" } = {}) {
    return `
      <section class="room-receipt-preview-shell" aria-label="Checkout Summary">
        <div class="room-receipt-preview-head">
          <div>
            <span class="room-receipt-eyebrow">${bill.provisional ? "Bill preview" : "Issued guest folio"}</span>
            <h3>Checkout Summary</h3>
            <p>${bill.provisional ? "Totals come from the current backend checkout summary." : "This issued bill is an immutable historical snapshot."}</p>
          </div>
          <span class="room-receipt-state ${bill.provisional ? "is-pending" : "is-issued"}">
            ${bill.provisional ? "Provisional" : "Issued"}
          </span>
        </div>
        <div class="room-receipt-preview-layout">
          <div class="room-receipt-preview-canvas">
            ${buildReceiptMarkup(bill)}
          </div>
          <aside class="room-receipt-actions" aria-label="Receipt actions">
            <button type="button" class="staff-btn secondary status-btn" data-staff-room-checkout-print data-print-room-checkout-summary data-booking-id="${escapeHTML(bookingId)}" data-id="${escapeHTML(bookingId)}">Print / Download PDF</button>
            ${bill.provisional ? finalizeButton : `<button type="button" class="staff-btn secondary status-btn" data-room-checkout-reprint data-booking-id="${escapeHTML(bookingId)}" data-id="${escapeHTML(bookingId)}">Reprint Original</button>`}
            <p>${bill.provisional ? "The final snapshot is issued only after verified checkout." : `Original snapshot · Reprints: ${escapeHTML(bill.reprintCount || 0)}`}</p>
          </aside>
        </div>
      </section>
    `;
  }

  function printStyles(bill = {}) {
    const width = normalizePaperWidth(bill.format?.paperWidth);
    const margin = Math.max(0, Math.min(8, Number(bill.format?.print?.marginMm || 2)));
    return `
      @page { size: ${width}mm auto; margin: ${margin}mm; }
      * { box-sizing: border-box; }
      html, body { width: ${width}mm; margin: 0; padding: 0; background: #fff; }
      body { color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .room-receipt-print-actions { display: flex; gap: 8px; padding: 8px; justify-content: center; }
      .room-receipt-print-actions button { border: 1px solid #111; background: #111; color: #fff; padding: 8px 12px; }
      @media print { .room-receipt-print-actions { display: none !important; } }
    `;
  }

  function buildPrintDocument(bill = {}) {
    return `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>${escapeHTML(bill.folioNumber || "Room Checkout Bill")}</title>
          <link rel="stylesheet" href="css/room-checkout-receipt.css">
          <style>${printStyles(bill)}</style>
        </head>
        <body class="room-receipt-print-document">
          <div class="room-receipt-print-actions">
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

  global.RoomCheckoutReceipt = Object.freeze({
    buildCheckoutPanel,
    buildPrintDocument,
    buildReceiptMarkup,
    escapeHTML,
    formatMoney,
    openPrintWindow
  });
})(window);
