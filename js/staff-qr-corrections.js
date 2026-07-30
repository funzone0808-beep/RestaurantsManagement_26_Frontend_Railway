"use strict";

(function initStaffQrCorrections() {
  const EDITABLE_STATUSES = new Set(["pending", "received", "new"]);
  const MANAGER_CANCEL_STATUSES = new Set(["accepted", "preparing"]);
  let decorateQueued = false;

  function normalize(value = "") {
    return String(value || "").trim().toLowerCase();
  }

  function getQrSubmissionReference(items = []) {
    const item = (Array.isArray(items) ? items : []).find((entry) => entry?.qrSubmissionReference);
    return String(item?.qrSubmissionReference || "").trim();
  }

  function findSelectedOrder() {
    const selectedId = String(STAFF_STATE.selectedTableOrderId || "");
    return (STAFF_STATE.orders || []).find((order) => String(order.id || "") === selectedId) || null;
  }

  function getRoundContext(order, sequence) {
    if (sequence === 1) {
      const items = (Array.isArray(order.items) ? order.items : []).filter((item) => !Number(item?.orderRoundSequence || 0));
      return {
        items,
        reference: getQrSubmissionReference(items),
        status: normalize(order.kitchenStatus || order.effectiveKitchenStatus || order.status || "new")
      };
    }
    const round = (Array.isArray(order.rounds) ? order.rounds : []).find((entry) => Number(entry.sequence) === sequence);
    return {
      items: round?.items || [],
      reference: getQrSubmissionReference(round?.items || []),
      status: normalize(round?.status || "new")
    };
  }

  function buildActions(context) {
    if (!context.reference) return "";
    const buttons = [];
    if (EDITABLE_STATUSES.has(context.status)) {
      buttons.push(`<button class="staff-btn secondary" type="button" data-staff-qr-correction="edit" data-submission-reference="${escapeHTML(context.reference)}">Edit QR Items</button>`);
      buttons.push(`<button class="staff-btn danger" type="button" data-staff-qr-correction="reject" data-submission-reference="${escapeHTML(context.reference)}">Reject QR Round</button>`);
      if (context.status === "pending") {
        buttons.unshift(`<button class="staff-btn" type="button" data-staff-qr-correction="approve" data-submission-reference="${escapeHTML(context.reference)}">Approve &amp; Send</button>`);
      }
    } else if (MANAGER_CANCEL_STATUSES.has(context.status) && isStaffManagerSession()) {
      buttons.push(`<button class="staff-btn danger" type="button" data-staff-qr-correction="cancel" data-submission-reference="${escapeHTML(context.reference)}">Controlled Cancellation</button>`);
    }
    if (!buttons.length) return "";
    return `<div class="staff-qr-round-actions" aria-label="QR round correction actions">${buttons.join("")}</div>`;
  }

  function decorateRoundActions() {
    decorateQueued = false;
    const order = findSelectedOrder();
    if (!order) return;
    document.querySelectorAll(".staff-order-round[data-order-round]").forEach((article) => {
      if (article.querySelector(".staff-qr-round-actions")) return;
      const sequence = Number(article.dataset.orderRound || 0);
      const markup = buildActions(getRoundContext(order, sequence));
      if (markup) article.insertAdjacentHTML("beforeend", markup);
    });
  }

  function queueDecoration() {
    if (decorateQueued) return;
    decorateQueued = true;
    window.requestAnimationFrame(decorateRoundActions);
  }

  async function fetchSubmission(reference) {
    const result = await staffFetchJson(`${STAFF_API_BASE}/qr-orders?status=all`);
    const submission = (result.submissions || []).find((entry) => entry.publicReference === reference);
    if (!submission) throw new Error("The QR round changed or is no longer available.");
    return submission;
  }

  function getDialog() {
    let dialog = document.getElementById("staffQrCorrectionDialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "staffQrCorrectionDialog";
      dialog.className = "staff-qr-correction-dialog";
      document.body.appendChild(dialog);
    }
    return dialog;
  }

  function closeDialog() {
    const dialog = getDialog();
    if (dialog.open) dialog.close();
  }

  function openEditDialog(submission) {
    const dialog = getDialog();
    dialog.innerHTML = `
      <form class="staff-qr-correction-form" data-staff-qr-edit-form>
        <header><h3>Correct QR Round ${escapeHTML(submission.roundSequence)}</h3><p>Table ${escapeHTML(submission.tableNumber)} · Version ${escapeHTML(submission.version)} · New-state items only</p></header>
        <div class="staff-qr-correction-items">
          ${(submission.items || []).map((item, index) => `
            <div class="staff-qr-correction-item" data-qr-edit-item="${index}">
              <strong>${escapeHTML(item.name || item.id || "Item")}</strong>
              <label><span>Quantity</span><input type="number" min="1" max="25" value="${escapeHTML(item.qty || 1)}" data-qr-edit-quantity required /></label>
              <label><span>Remove</span><input type="checkbox" data-qr-edit-remove /></label>
            </div>`).join("")}
        </div>
        <label><span>Kitchen note</span><textarea maxlength="1000" rows="3" data-qr-edit-note>${escapeHTML(submission.note || "")}</textarea></label>
        <p class="staff-hint" data-qr-dialog-status aria-live="polite">Changes are re-priced and status-checked by the server.</p>
        <div class="staff-qr-correction-dialog-actions">
          <button class="staff-btn secondary" type="button" data-close-staff-qr-dialog>Cancel</button>
          <button class="staff-btn" type="submit">Save Correction</button>
        </div>
      </form>`;
    dialog.dataset.submissionReference = submission.publicReference;
    dialog.dataset.submissionVersion = String(submission.version || 1);
    dialog.dataset.dialogAction = "edit";
    dialog.showModal();
  }

  function openReasonDialog(submission, action) {
    const isCancel = action === "cancel";
    const dialog = getDialog();
    dialog.innerHTML = `
      <form class="staff-qr-correction-form" data-staff-qr-reason-form>
        <header><h3>${isCancel ? "Controlled QR Cancellation" : "Reject QR Round"}</h3><p>Table ${escapeHTML(submission.tableNumber)} · Round ${escapeHTML(submission.roundSequence)} · Version ${escapeHTML(submission.version)}</p></header>
        <label><span>Required reason</span><textarea maxlength="500" minlength="3" rows="4" data-qr-correction-reason required></textarea></label>
        <p class="staff-hint" data-qr-dialog-status aria-live="polite">The original history remains in audit records.</p>
        <div class="staff-qr-correction-dialog-actions">
          <button class="staff-btn secondary" type="button" data-close-staff-qr-dialog>Back</button>
          <button class="staff-btn danger" type="submit">${isCancel ? "Confirm Cancellation" : "Reject Round"}</button>
        </div>
      </form>`;
    dialog.dataset.submissionReference = submission.publicReference;
    dialog.dataset.submissionVersion = String(submission.version || 1);
    dialog.dataset.dialogAction = action;
    dialog.showModal();
    dialog.querySelector("[data-qr-correction-reason]")?.focus();
  }

  async function submitCorrection(payload) {
    const result = await staffFetchJson(`${STAFF_API_BASE}/qr-orders/${encodeURIComponent(payload.reference)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: payload.action,
        clientRequestId: crypto.randomUUID(),
        expectedVersion: payload.version,
        items: payload.items,
        note: payload.note,
        reason: payload.reason
      })
    });
    closeDialog();
    setStaffTableOrderDetailNotice(result.message || "QR correction completed.", "success");
    await Promise.all([
      loadStaffOrders({ silent: true }),
      STAFF_STATE.kdsOrdersLoaded ? loadStaffKdsOrders({ silent: true }) : Promise.resolve(),
      loadStaffTableActivity({ silent: true })
    ]);
    queueDecoration();
  }

  document.addEventListener("click", async (event) => {
    if (event.target.closest("[data-close-staff-qr-dialog]")) {
      closeDialog();
      return;
    }
    const button = event.target.closest("[data-staff-qr-correction]");
    if (!button) return;
    button.disabled = true;
    try {
      const action = button.dataset.staffQrCorrection;
      const submission = await fetchSubmission(button.dataset.submissionReference || "");
      if (action === "edit") openEditDialog(submission);
      else if (action === "approve") {
        await submitCorrection({ reference: submission.publicReference, version: submission.version, action });
      } else openReasonDialog(submission, action);
    } catch (error) {
      setStaffTableOrderDetailNotice(error.message || "QR correction could not be opened.", "warning");
    } finally {
      button.disabled = false;
    }
  });

  document.addEventListener("submit", async (event) => {
    const editForm = event.target.closest("[data-staff-qr-edit-form]");
    const reasonForm = event.target.closest("[data-staff-qr-reason-form]");
    if (!editForm && !reasonForm) return;
    event.preventDefault();
    const dialog = getDialog();
    const status = dialog.querySelector("[data-qr-dialog-status]");
    const submitButton = event.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    if (status) status.textContent = "Saving and reconciling Staff, View Tables, and KDS…";
    try {
      const action = dialog.dataset.dialogAction;
      const payload = {
        reference: dialog.dataset.submissionReference,
        version: Number(dialog.dataset.submissionVersion || 1),
        action,
        note: editForm?.querySelector("[data-qr-edit-note]")?.value || "",
        reason: reasonForm?.querySelector("[data-qr-correction-reason]")?.value || ""
      };
      if (editForm) {
        const submission = await fetchSubmission(payload.reference);
        payload.items = [...editForm.querySelectorAll("[data-qr-edit-item]")].flatMap((row, index) => {
          if (row.querySelector("[data-qr-edit-remove]")?.checked) return [];
          const item = submission.items[index];
          return [{
            publicItemReference: item.publicItemReference,
            menuItemId: String(item.id || item.menuItemId || ""),
            quantity: Number(row.querySelector("[data-qr-edit-quantity]")?.value || 1)
          }];
        });
        if (!payload.items.length) throw new Error("At least one item must remain. Reject the entire round instead.");
      }
      await submitCorrection(payload);
    } catch (error) {
      if (status) status.textContent = error.message || "The correction could not be saved.";
      submitButton.disabled = false;
    }
  });

  new MutationObserver(queueDecoration).observe(document.body, { childList: true, subtree: true });
  queueDecoration();
})();
