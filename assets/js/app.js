/*!
 * Al-Marsad-Al-Istitani — main.js
 * Notes:
 * - Safe storage helpers included (prevents crashes in private mode / blocked storage).
 * - Theme boot runs even if header is missing (no early returns).
 * - Guards added for Bootstrap Offcanvas availability.
 * - Smooth scrolling is centralized (single click listener).
 */

(() => {
  "use strict";

  /* ============================================================
   * 0) Project constants
   * ============================================================ */
  const SITE_NAME = "Al-Marsad-Al-Istitani";
  const THEME_STORAGE_KEY = `${SITE_NAME}:themePreference`; // "dark" | "light" | "system"
  const SCROLL_ACTIVE_DEFAULT_ID = "top";

  /* ============================================================
   * 1) Safe Storage Helpers
   * ============================================================ */

  /**
   * Safely read from localStorage.
   * @param {string} key
   * @returns {string|null}
   */
  function safeStorageGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Safely write to localStorage.
   * @param {string} key
   * @param {string} value
   */
  function safeStorageSet(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }

  /* ============================================================
   * 2) Theme Toggle (Fixed behavior + robust boot)
   * ============================================================ */

  const themePrefersDark = window.matchMedia?.("(prefers-color-scheme: dark)") || null;

  /**
   * Update toggle visuals (icon + aria)
   * @param {boolean} isDark
   */
  function updateThemeToggleVisual(isDark) {
    const toggle = document.querySelector("[data-theme-toggle]");
    if (!toggle) return;

    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("title", isDark ? "Switch to light mode" : "Switch to dark mode");

    const icon = toggle.querySelector("[data-theme-icon]");
    if (!icon) return;

    icon.classList.toggle("fa-sun", isDark);
    icon.classList.toggle("fa-moon", !isDark);
  }

  /**
   * Apply theme:
   * - "dark"   => html[data-theme="dark"]
   * - "light"  => html[data-theme="light"]  (explicit)
   * - "system" => remove attribute (follow OS) + compute effective for UI
   *
   * @param {"dark"|"light"|"system"} variant
   * @param {{persist?: boolean}} options
   */
  function applyColorTheme(variant, { persist = false } = {}) {
    const root = document.documentElement;
    const body = document.body;
    if (!root || !body) return;

    let effective = variant;

    if (variant === "system") {
      const systemIsDark = !!themePrefersDark?.matches;
      effective = systemIsDark ? "dark" : "light";
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", variant);
    }

    const isDark = effective === "dark";
    body.classList.toggle("is-dark", isDark);

    updateThemeToggleVisual(isDark);

    if (persist) safeStorageSet(THEME_STORAGE_KEY, variant);
  }

  /**
   * OS theme changes should only affect UI when:
   * - user did not set a manual theme, OR
   * - user explicitly set "system"
   */
  function handleSystemThemeChange() {
    const stored = safeStorageGet(THEME_STORAGE_KEY);
    if (stored && stored !== "system") return;
    applyColorTheme("system");
  }

  function initThemeToggle() {
    const toggle = document.querySelector("[data-theme-toggle]");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
      const root = document.documentElement;

      const isCurrentlyDark =
        root.getAttribute("data-theme") === "dark" ||
        (!root.hasAttribute("data-theme") && !!themePrefersDark?.matches);

      const next = isCurrentlyDark ? "light" : "dark";
      applyColorTheme(next, { persist: true });
    });
  }

  function bootTheme() {
    const stored = safeStorageGet(THEME_STORAGE_KEY); // "dark" | "light" | "system" | null
    const initial = stored || "system";
    applyColorTheme(initial);

    if (themePrefersDark?.addEventListener) {
      themePrefersDark.addEventListener("change", handleSystemThemeChange);
    } else if (themePrefersDark?.addListener) {
      // Safari fallback
      themePrefersDark.addListener(handleSystemThemeChange);
    }
  }

  /* ============================================================
   * 3) Header scroll state (lightweight)
   * ============================================================ */

  function initHeaderScrollState() {
    const header = document.querySelector(".c-header");
    if (!header) return;

    const setScrolled = () => {
      const scrolled = window.scrollY > 12;
      document.body.classList.toggle("is-scrolled", scrolled);
    };

    let raf = null;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        setScrolled();
        raf = null;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    setScrolled();
  }

  /* ============================================================
   * 4) Active nav sync (desktop + offcanvas)
   * ============================================================ */

  function initActiveNavSync() {
    const navGroups = Array.from(document.querySelectorAll("[data-nav]"));
    if (!navGroups.length) return;

    const allLinks = navGroups
      .flatMap((ul) => Array.from(ul.querySelectorAll('a[href^="#"]')))
      .filter(Boolean);

    if (!allLinks.length) return;

    const sections = Array.from(new Set(allLinks.map((a) => a.getAttribute("href"))))
      .map((hash) => (hash ? document.querySelector(hash) : null))
      .filter(Boolean);

    const setActive = (id) => {
      allLinks.forEach((a) => {
        a.classList.toggle("is-active", a.getAttribute("href") === `#${id}`);
      });
    };

    setActive(SCROLL_ACTIVE_DEFAULT_ID);

    if (!("IntersectionObserver" in window) || !sections.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target?.id) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -55% 0px", threshold: [0.25, 0.5, 0.75] }
    );

    sections.forEach((s) => io.observe(s));
  }

  /* ============================================================
   * 5) Close offcanvas on link click (Bootstrap-safe)
   * ============================================================ */

  function initOffcanvasCloseOnLinkClick() {
    const offcanvasEl = document.getElementById("siteNav");
    if (!offcanvasEl) return;

    offcanvasEl.addEventListener("click", (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      // Guard: bootstrap might be absent in some builds
      const bs = window.bootstrap;
      if (!bs?.Offcanvas) return;

      const instance = bs.Offcanvas.getInstance(offcanvasEl);
      if (instance) instance.hide();
    });
  }

  /* ============================================================
   * 6) Smooth anchor scrolling (single listener)
   * - Centers the target section in viewport
   * - Works with any anchor that starts with "#"
   * ============================================================ */

  function initSmoothAnchors() {
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;

      const id = a.getAttribute("href");
      if (!id || id === "#") return;

      const el = document.querySelector(id);
      if (!el) return;

      e.preventDefault();

      const rect = el.getBoundingClientRect();
      const halfViewport = window.innerHeight / 2;

      const targetTop = window.scrollY + rect.top - halfViewport + rect.height / 2;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const finalScroll = Math.min(Math.max(targetTop, 0), Math.max(maxScroll, 0));

      window.scrollTo({ top: finalScroll, behavior: "smooth" });
    });
  }

  /* ============================================================
   * 7) Boot
   * ============================================================ */

  document.addEventListener("DOMContentLoaded", () => {
    // Theme should boot before anything else so UI colors don't flash.
    bootTheme();
    initThemeToggle();

    initHeaderScrollState();
    initActiveNavSync();
    initOffcanvasCloseOnLinkClick();
    initSmoothAnchors();
  });
})();
