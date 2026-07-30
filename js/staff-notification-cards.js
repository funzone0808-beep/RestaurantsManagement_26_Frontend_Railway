(function staffNotificationCardsModule(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.StaffNotificationCards = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createStaffNotificationCardsApi() {
  "use strict";

  const CARD_DEFINITIONS = Object.freeze({
    "qr-orders": Object.freeze({
      view: "orders",
      label: "QR Orders",
      sourceCard: "qr",
      managerOnly: false,
      feature: "food"
    }),
    "staff-orders": Object.freeze({
      view: "orders",
      label: "Staff Orders",
      sourceCard: "staff",
      managerOnly: false,
      feature: "food"
    }),
    "website-orders": Object.freeze({
      view: "orders",
      label: "Website Orders",
      sourceCard: "website",
      managerOnly: false,
      feature: "food"
    }),
    "website-room-bookings": Object.freeze({
      view: "rooms",
      label: "Website Room Bookings",
      sourceCard: "website",
      managerOnly: false,
      feature: "rooms"
    }),
    support: Object.freeze({
      view: "support",
      label: "Support",
      managerOnly: false,
      feature: "food"
    }),
    reservations: Object.freeze({
      view: "reservations",
      label: "Reservations",
      managerOnly: true,
      feature: "food"
    }),
    inquiries: Object.freeze({
      view: "inquiries",
      label: "Inquiries",
      managerOnly: true,
      feature: ""
    }),
    contacts: Object.freeze({
      view: "contacts",
      label: "Contacts",
      managerOnly: true,
      feature: ""
    }),
    testimonials: Object.freeze({
      view: "testimonials",
      label: "Reviews",
      managerOnly: true,
      feature: ""
    })
  });

  function normalizeCardKey(value = "") {
    return String(value || "").trim().toLowerCase().replace(/[\s_]+/g, "-");
  }

  function getCardDefinition(cardKey = "") {
    return CARD_DEFINITIONS[normalizeCardKey(cardKey)] || null;
  }

  function getCardKeysForView(view = "") {
    const normalizedView = String(view || "").trim().toLowerCase();
    return Object.entries(CARD_DEFINITIONS)
      .filter(([, definition]) => definition.view === normalizedView)
      .map(([cardKey]) => cardKey);
  }

  function buildNotificationEventKey(event = {}, hotelSlug = "") {
    const id = Math.max(0, Number(event.id || 0) || 0);
    const cardKey = normalizeCardKey(event.cardKey || "");
    const eventType = String(event.eventType || "").trim().toLowerCase();
    return `${String(hotelSlug || "").trim().toLowerCase()}::${id}::${cardKey}::${eventType}`;
  }

  return Object.freeze({
    CARD_DEFINITIONS,
    buildNotificationEventKey,
    getCardDefinition,
    getCardKeysForView,
    normalizeCardKey
  });
});

