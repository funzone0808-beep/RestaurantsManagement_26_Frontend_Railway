"use strict";

(() => {
  const FALLBACK = Object.freeze({
    companyName: "AtithiSarthi",
    shortCompanyName: "AtithiSarthi",
    shortProductLabel: "Hospitality Operating System",
    logoUrl: "",
    logoAlt: "AtithiSarthi logo",
    footerLogoUrl: "",
    footerLogoAlt: "AtithiSarthi",
    heroImageUrl: "",
    heroImageAlt: "",
    backgroundImageUrl: "",
    welcomeBadge: "Hotel • Restaurant • Local Travel",
    welcomeHeading: "Welcome",
    welcomeSubheading: "Your Restaurant Operating System",
    description: "Manage hospitality service through one secure, connected workspace.",
    tagline: "Serving Success Beyond the Kitchen.",
    loginBadgeText: "Secure Login",
    loginHeading: "Open your hotel billing view",
    loginDescription: "Use the hotel slug and staff PIN created for that hotel.",
    hotelSlugLabel: "Hotel Slug",
    hotelSlugPlaceholder: "Hotel Slug",
    staffPinLabel: "Staff PIN",
    staffPinPlaceholder: "Staff PIN",
    loginButtonText: "Login",
    serviceSectionHeading: "One connected guest journey",
    enableHotelService: true,
    hotelServiceLabel: "Hotel / Stay",
    enableRestaurantService: true,
    restaurantServiceLabel: "Restaurant / Dine",
    enableTransportService: true,
    transportServiceLabel: "Local Transport / Travel",
    footerCompanyName: "AtithiSarthi",
    copyrightText: "Copyright © 2026 AtithiSarthi. All Rights Reserved.",
    legalText: "",
    termsUrl: "",
    privacyUrl: "",
    primaryColor: "#b86647",
    secondaryColor: "#8c3f58",
    accentColor: "#c49b3c",
    backgroundColor: "#f7efe5",
    cardColor: "#fffaf4",
    textColor: "#281813"
  });

  const TEXT_KEYS = Object.freeze(
    Object.keys(FALLBACK).filter((key) => typeof FALLBACK[key] === "string")
  );
  const BOOLEAN_KEYS = Object.freeze(
    Object.keys(FALLBACK).filter((key) => typeof FALLBACK[key] === "boolean")
  );
  const COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
  const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,119}$/;
  const IMAGE_KEYS = new Set(["logoUrl", "footerLogoUrl", "heroImageUrl", "backgroundImageUrl"]);
  const LEGAL_KEYS = new Set(["termsUrl", "privacyUrl"]);

  function getApiBase() {
    const runtimeBase = String(window.APP_RUNTIME_CONFIG?.API_BASE_URL || "").trim();
    if (runtimeBase) return runtimeBase.replace(/\/+$/, "");
    const hostname = window.location.hostname;
    const isLocal = !hostname || hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".localhost");
    const origin = isLocal || !window.location.origin || window.location.origin === "null"
      ? "http://localhost:5000"
      : window.location.origin;
    return `${origin.replace(/\/+$/, "")}/api`;
  }

  function normalizeSlug(value = "") {
    const normalized = String(value || "").trim().toLowerCase();
    return SLUG_PATTERN.test(normalized) ? normalized : "";
  }

  function safeDisplayUrl(value = "") {
    const candidate = String(value || "").trim();
    if (!candidate || /[\u0000-\u001f\u007f]/.test(candidate)) return "";
    if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
    try {
      const parsed = new URL(candidate, window.location.href);
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
    } catch {
      return "";
    }
  }

  function safeLegalUrl(value = "") {
    const candidate = safeDisplayUrl(value);
    if (!candidate) return "";
    try {
      const parsed = new URL(candidate, window.location.href);
      return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
    } catch {
      return "";
    }
  }

  function normalizeBranding(source = {}) {
    const input = source && typeof source === "object" && !Array.isArray(source) ? source : {};
    const result = { ...FALLBACK };
    for (const key of TEXT_KEYS) {
      if (typeof input[key] !== "string") continue;
      const value = input[key].trim();
      if (IMAGE_KEYS.has(key)) {
        result[key] = safeDisplayUrl(value);
      } else if (LEGAL_KEYS.has(key)) {
        result[key] = safeLegalUrl(value);
      } else if (key.endsWith("Color")) {
        result[key] = COLOR_PATTERN.test(value) ? value : FALLBACK[key];
      } else {
        result[key] = value;
      }
    }
    for (const key of BOOLEAN_KEYS) {
      if (typeof input[key] === "boolean") result[key] = input[key];
    }
    return result;
  }

  function createBrandMark(className) {
    return `
      <svg class="${className}" viewBox="0 0 52 52" aria-hidden="true">
        <path d="M6 41 21.8 8.5 27 19.4 17.1 41M23.7 41l12.7-26.2L47 41M12.2 28.3h26.2M31.5 12.4l5.2 4.6 6.2-5.7M37.4 17l5.8.7-.3-6.4M19.7 33.2h18.5" />
      </svg>`;
  }

  function createServiceIcon(kind) {
    if (kind === "hotel") {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V5h11v16M15 10h5v11M2 21h20M8 9h2M8 13h2M8 17h2" /></svg>`;
    }
    if (kind === "restaurant") {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v8M4 3v5c0 2 1 3 3 3s3-1 3-3V3M7 11v10M16 3c3 2 4 6 2 10h-3V3h1ZM18 13v8" /></svg>`;
    }
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h14M7 16l1-5h8l2 5M8 11l2-3h4l2 3M4 16v3M20 16v3M7 19h2M15 19h2M3 13l3 1M21 13l-3 1" /></svg>`;
  }

  function mountLoginPresentation(root) {
    root.className = "staff-login-page";
    root.innerHTML = `
      <div class="staff-login-backdrop" aria-hidden="true"></div>
      <header class="staff-login-brandbar">
        <div class="staff-login-brand">
          <span class="staff-login-logo-frame" data-brand-logo-frame>
            <img data-brand-logo alt="" style="background: none;" hidden />
            ${createBrandMark("staff-login-fallback-mark")}
          </span>
          <span class="staff-login-brand-copy">
            <strong data-brand-company></strong>
            <small data-brand-product-label></small>
          </span>
        </div>
      </header>

      <div class="staff-login-main">
        <article class="staff-login-hero" aria-labelledby="staffLoginWelcome">
          <svg class="staff-login-tableware" viewBox="0 0 620 460" aria-hidden="true">
            <g>
              <circle cx="425" cy="12" r="98" /><circle cx="425" cy="12" r="71" /><circle cx="425" cy="12" r="43" />
              <circle cx="355" cy="252" r="142" /><circle cx="355" cy="252" r="108" /><circle cx="355" cy="252" r="72" />
              <circle cx="95" cy="464" r="103" /><circle cx="95" cy="464" r="73" />
              <path d="M149 3v72M160 3v72M171 3v72M182 3v72M165 75v69M129 11c0 25 17 33 36 33s36-8 36-33" />
              <path d="M16 201v143M28 201v143M40 201v143M52 201v143M34 344v99M11 201c5 25 40 25 46 0" />
              <path d="M549 254c-26 15-28 44-9 61l-1 126M550 254c27 16 28 44 8 61l1 126" />
              <path d="M209 372c34 4 63 18 87 43M196 391c30 7 53 21 74 43M183 411c22 7 42 18 59 35" />
              <circle cx="516" cy="381" r="18" /><circle cx="484" cy="435" r="23" />
            </g>
          </svg>
          <img class="staff-login-hero-image" data-brand-hero-image alt="" hidden />
          <div class="staff-login-hero-copy">
            <p class="staff-login-eyebrow" data-brand-welcome-badge></p>
            <h1 id="staffLoginWelcome" class="staff-login-welcome">
              <span data-brand-hero-company></span><br /><span data-brand-welcome-heading></span>
            </h1>
            <p class="staff-login-subheading" data-brand-welcome-subheading></p>
            <p class="staff-login-description" data-brand-description></p>
            <p class="staff-login-tagline" data-brand-tagline></p>
          </div>
          <div class="staff-login-services" data-brand-services>
            <p class="staff-login-service-heading" data-brand-service-heading></p>
            <div class="staff-login-visual">
              <div class="staff-login-service" data-brand-service="hotel">
                <span class="staff-login-service-icon">${createServiceIcon("hotel")}</span>
                <span data-brand-hotel-service-label></span>
              </div>
              <div class="staff-login-service" data-brand-service="restaurant">
                <span class="staff-login-service-icon">${createServiceIcon("restaurant")}</span>
                <span data-brand-restaurant-service-label></span>
              </div>
              <div class="staff-login-service" data-brand-service="transport">
                <span class="staff-login-service-icon">${createServiceIcon("transport")}</span>
                <span data-brand-transport-service-label></span>
              </div>
            </div>
          </div>
        </article>

        <div class="staff-login-card">
          <div class="staff-login-card-head">
            <p class="staff-login-card-badge" data-brand-login-badge></p>
            <h2 class="staff-panel-title" data-brand-login-heading></h2>
            <p class="staff-hint" data-brand-login-description></p>
          </div>
          <form id="staffLoginForm" class="staff-form">
            <div class="staff-field">
              <label id="staffHotelSlugLabel" class="staff-label" for="staffHotelSlugInput"></label>
              <div class="staff-login-input-shell">
                <span class="staff-login-input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M4 21V5.8c0-.5.3-.8.8-.8H15v16M15 10h4.2c.5 0 .8.3.8.8V21M2 21h20M8 9h2M8 13h2M8 17h2" /></svg>
                </span>
                <input id="staffHotelSlugInput" class="staff-input" name="hotelSlug" autocomplete="organization" required aria-describedby="staffLoginStatus" />
              </div>
            </div>
            <div class="staff-field">
              <label id="staffPinLabel" class="staff-label" for="staffPinInput"></label>
              <div class="staff-login-input-shell">
                <span class="staff-login-input-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>
                </span>
                <input id="staffPinInput" class="staff-input" name="pin" type="password" inputmode="numeric" autocomplete="current-password" required aria-describedby="staffLoginStatus" />
              </div>
            </div>
            <div class="staff-actions">
              <button id="staffLoginSubmitBtn" class="staff-btn" type="submit"></button>
            </div>
            <p id="staffLoginStatus" class="staff-status" role="status" aria-live="polite">Logged out.</p>
          </form>
        </div>
      </div>

      <footer class="staff-login-footer">
        <div class="staff-login-footer-brand">
          <span class="staff-login-footer-logo-frame">
            <img class="staff-login-footer-logo" data-brand-footer-logo alt="" hidden />
            ${createBrandMark("staff-login-footer-fallback-mark")}
          </span>
          <strong data-brand-footer-company></strong>
        </div>
        <p data-brand-copyright></p>
        <p data-brand-legal-text hidden></p>
        <nav class="staff-login-legal-links" aria-label="Legal links" hidden>
          <a data-brand-terms-link target="_blank" rel="noopener noreferrer">Terms</a>
          <a data-brand-privacy-link target="_blank" rel="noopener noreferrer">Privacy</a>
        </nav>
      </footer>`;
  }

  function setText(root, selector, value) {
    const element = root.querySelector(selector);
    if (element) element.textContent = value || "";
  }

  function setImage(root, imageSelector, fallbackSelector, url, alt) {
    const image = root.querySelector(imageSelector);
    const fallback = fallbackSelector ? root.querySelector(fallbackSelector) : null;
    if (!image) return;
    const safeUrl = safeDisplayUrl(url);
    const showFallback = () => {
      image.hidden = true;
      image.removeAttribute("src");
      if (fallback) fallback.hidden = false;
    };
    image.onerror = showFallback;
    if (!safeUrl) {
      showFallback();
      return;
    }
    image.alt = alt || "";
    image.src = safeUrl;
    image.hidden = false;
    if (fallback) fallback.hidden = true;
  }

  function setLegalLink(root, selector, value) {
    const link = root.querySelector(selector);
    if (!link) return false;
    const url = safeLegalUrl(value);
    link.hidden = !url;
    if (url) link.href = url;
    else link.removeAttribute("href");
    return !!url;
  }

  function applyBranding(root, source) {
    const branding = normalizeBranding(source);
    root.style.setProperty("--login-bg", branding.backgroundColor);
    root.style.setProperty("--login-card", branding.cardColor);
    root.style.setProperty("--login-text", branding.textColor);
    root.style.setProperty("--login-primary", branding.primaryColor);
    root.style.setProperty("--login-secondary", branding.secondaryColor);
    root.style.setProperty("--login-accent", branding.accentColor);

    const backgroundUrl = safeDisplayUrl(branding.backgroundImageUrl);
    const encodedBackground = backgroundUrl ? encodeURI(backgroundUrl).replace(/"/g, "%22") : "";
    root.style.setProperty("--login-background-image", encodedBackground ? `url("${encodedBackground}")` : "none");

    setText(root, "[data-brand-company]", branding.shortCompanyName || branding.companyName);
    setText(root, "[data-brand-product-label]", branding.shortProductLabel);
    setText(root, "[data-brand-hero-company]", branding.companyName);
    setText(root, "[data-brand-welcome-badge]", branding.welcomeBadge);
    setText(root, "[data-brand-welcome-heading]", branding.welcomeHeading);
    setText(root, "[data-brand-welcome-subheading]", branding.welcomeSubheading);
    setText(root, "[data-brand-description]", branding.description);
    setText(root, "[data-brand-tagline]", branding.tagline);
    setText(root, "[data-brand-login-badge]", branding.loginBadgeText);
    setText(root, "[data-brand-login-heading]", branding.loginHeading);
    setText(root, "[data-brand-login-description]", branding.loginDescription);
    setText(root, "#staffHotelSlugLabel", branding.hotelSlugLabel);
    setText(root, "#staffPinLabel", branding.staffPinLabel);
    setText(root, "[data-brand-service-heading]", branding.serviceSectionHeading);
    setText(root, "[data-brand-hotel-service-label]", branding.hotelServiceLabel);
    setText(root, "[data-brand-restaurant-service-label]", branding.restaurantServiceLabel);
    setText(root, "[data-brand-transport-service-label]", branding.transportServiceLabel);
    setText(root, "[data-brand-footer-company]", branding.footerCompanyName);
    setText(root, "[data-brand-copyright]", branding.copyrightText);
    setText(root, "[data-brand-legal-text]", branding.legalText);

    const hotelInput = root.querySelector("#staffHotelSlugInput");
    const pinInput = root.querySelector("#staffPinInput");
    const submitButton = root.querySelector("#staffLoginSubmitBtn");
    if (hotelInput) hotelInput.placeholder = branding.hotelSlugPlaceholder;
    if (pinInput) pinInput.placeholder = branding.staffPinPlaceholder;
    if (submitButton) {
      submitButton.dataset.loginButtonLabel = branding.loginButtonText;
      if (submitButton.getAttribute("aria-busy") !== "true") submitButton.textContent = branding.loginButtonText;
    }

    setImage(root, "[data-brand-logo]", ".staff-login-fallback-mark", branding.logoUrl, branding.logoAlt);
    setImage(root, "[data-brand-footer-logo]", ".staff-login-footer-fallback-mark", branding.footerLogoUrl, branding.footerLogoAlt);
    setImage(root, "[data-brand-hero-image]", null, branding.heroImageUrl, branding.heroImageAlt);

    const serviceMap = {
      hotel: branding.enableHotelService,
      restaurant: branding.enableRestaurantService,
      transport: branding.enableTransportService
    };
    let enabledServices = 0;
    for (const [service, enabled] of Object.entries(serviceMap)) {
      const element = root.querySelector(`[data-brand-service="${service}"]`);
      if (element) element.hidden = !enabled;
      if (enabled) enabledServices += 1;
    }
    const serviceWrap = root.querySelector("[data-brand-services]");
    if (serviceWrap) serviceWrap.hidden = enabledServices === 0;

    const legalText = root.querySelector("[data-brand-legal-text]");
    if (legalText) legalText.hidden = !branding.legalText;
    const hasTerms = setLegalLink(root, "[data-brand-terms-link]", branding.termsUrl);
    const hasPrivacy = setLegalLink(root, "[data-brand-privacy-link]", branding.privacyUrl);
    const legalNav = root.querySelector(".staff-login-legal-links");
    if (legalNav) legalNav.hidden = !hasTerms && !hasPrivacy;

    root.dispatchEvent(new CustomEvent("loginbrandingchange", { detail: { branding } }));
    return branding;
  }

  async function fetchPublishedBranding(hotelSlug = "", signal) {
    const url = new URL(`${getApiBase()}/public/login-branding`);
    if (hotelSlug) url.searchParams.set("hotelSlug", hotelSlug);
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal
    });
    if (!response.ok) throw new Error("Branding lookup failed");
    const payload = await response.json();
    if (!payload?.success || !payload.branding || typeof payload.branding !== "object") {
      throw new Error("Invalid branding response");
    }
    return normalizeBranding(payload.branding);
  }

  function initializeStaffBranding() {
    const root = document.getElementById("staffLoginWrap");
    if (!root) return;

    mountLoginPresentation(root);
    let activeBranding = applyBranding(root, FALLBACK);
    let requestSequence = 0;
    let activeController = null;
    let debounceTimer = null;

    const loadBranding = async (slug = "") => {
      const sequence = ++requestSequence;
      if (activeController) activeController.abort();
      activeController = new AbortController();
      try {
        const branding = await fetchPublishedBranding(slug, activeController.signal);
        if (sequence !== requestSequence) return;
        activeBranding = applyBranding(root, branding);
      } catch (error) {
        if (error?.name === "AbortError" || sequence !== requestSequence) return;
        if (!slug) activeBranding = applyBranding(root, FALLBACK);
      }
    };

    void loadBranding("");
    const slugInput = root.querySelector("#staffHotelSlugInput");
    if (slugInput) {
      slugInput.addEventListener("input", () => {
        window.clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => {
          const slug = normalizeSlug(slugInput.value);
          if (slug) void loadBranding(slug);
          else if (!slugInput.value.trim()) void loadBranding("");
        }, 450);
      });
      slugInput.addEventListener("blur", () => {
        const slug = normalizeSlug(slugInput.value);
        if (slug) void loadBranding(slug);
      });
      window.setTimeout(() => {
        const slug = normalizeSlug(slugInput.value);
        if (slug) void loadBranding(slug);
      }, 0);
    }

    window.LoginBranding = Object.freeze({
      fallback: FALLBACK,
      normalize: normalizeBranding,
      apply: (branding) => {
        activeBranding = applyBranding(root, branding);
        return activeBranding;
      },
      getCurrent: () => ({ ...activeBranding }),
      safeDisplayUrl,
      safeLegalUrl
    });
  }

  window.LoginBrandingCore = Object.freeze({
    fallback: FALLBACK,
    normalize: normalizeBranding,
    safeDisplayUrl,
    safeLegalUrl
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeStaffBranding, { once: true });
  } else {
    initializeStaffBranding();
  }
})();
