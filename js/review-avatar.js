(function reviewAvatarModule(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  if (root) {
    root.ReviewAvatar = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createReviewAvatarApi() {
  "use strict";

  const DEFAULT_REVIEW_AVATAR_SRC = "./img/default-review-avatar.v1.svg";
  const REVIEW_AVATAR_SELECTOR = "img[data-review-avatar]";

  function isSafeReviewAvatarUrl(value = "") {
    const candidate = String(value || "").trim();

    if (!candidate || candidate.startsWith("//")) {
      return false;
    }

    const protocolMatch = candidate.match(/^([a-z][a-z0-9+.-]*):/i);
    if (!protocolMatch) {
      return true;
    }

    const protocol = protocolMatch[1].toLowerCase();
    return protocol === "http" || protocol === "https";
  }

  function resolveReviewAvatar(value = "") {
    const candidate = String(value || "").trim();
    const useUploadedImage = isSafeReviewAvatarUrl(candidate);

    return {
      src: useUploadedImage ? candidate : DEFAULT_REVIEW_AVATAR_SRC,
      isDefault: !useUploadedImage
    };
  }

  function handleReviewAvatarError(event) {
    const image = event?.currentTarget || event?.target;
    if (!image || image.dataset.reviewAvatarFallbackApplied === "true") {
      return;
    }

    image.dataset.reviewAvatarFallbackApplied = "true";
    image.dataset.reviewAvatarDefault = "true";
    image.src = DEFAULT_REVIEW_AVATAR_SRC;
    image.alt = "";
  }

  function bindReviewAvatar(image, value) {
    if (!image || typeof image.addEventListener !== "function") {
      return null;
    }

    const resolved = resolveReviewAvatar(
      value === undefined ? image.getAttribute("src") || "" : value
    );

    image.src = resolved.src;
    image.alt = "";
    image.dataset.reviewAvatarDefault = String(resolved.isDefault);

    if (image.dataset.reviewAvatarBound !== "true") {
      image.addEventListener("error", handleReviewAvatarError);
      image.dataset.reviewAvatarBound = "true";
    }

    return resolved;
  }

  function bindReviewAvatars(container) {
    const scope = container && typeof container.querySelectorAll === "function"
      ? container
      : typeof document !== "undefined"
        ? document
        : null;

    if (!scope) {
      return 0;
    }

    const images = Array.from(scope.querySelectorAll(REVIEW_AVATAR_SELECTOR));
    images.forEach((image) => bindReviewAvatar(image));
    return images.length;
  }

  return Object.freeze({
    DEFAULT_REVIEW_AVATAR_SRC,
    REVIEW_AVATAR_SELECTOR,
    bindReviewAvatar,
    bindReviewAvatars,
    handleReviewAvatarError,
    isSafeReviewAvatarUrl,
    resolveReviewAvatar
  });
});
