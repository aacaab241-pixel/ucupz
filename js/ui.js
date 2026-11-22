// ============================================================
// js/ui.js — Navigasi, notifikasi, dan pengaturan global
// Depends: js/config.js
// ============================================================

/**
 * Render navigasi desktop dan mobile.
 * @param {string} activePage
 */
function renderSidebar(activePage) {
  const pages = [
    { id:"converter", href:"converter.html", label:"Convert", labelShort:"Convert" },
    { id:"scan",      href:"scan.html",      label:"Scan QR", labelShort:"Scan QR" },
    { id:"qrcode",    href:"qrcode.html",    label:"QR Code", labelShort:"QR Code" },
  ];

  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <a class="brand-lockup" href="converter.html" aria-label="Ucupz">
          <span class="brand-icon" aria-hidden="true"><img src="/favicon.png" alt="" /></span>
          <span class="brand-name">Ucupz <span>${activePage === "converter" ? "Convert" : activePage === "scan" ? "Scan QR" : "QR Code"}</span></span>
        </a>
        <span class="offline-status"><span aria-hidden="true"></span> Offline Ready</span>
        <div class="header-actions">
          <button class="header-icon-button" type="button" data-action="toggle-theme" aria-label="Ganti tema" title="Ganti tema">☼</button>
          <button class="header-icon-button install-app-button" type="button" data-action="install-app" aria-label="Instal aplikasi" title="Instal aplikasi" hidden>↓</button>
        </div>
      </div>
    `;
  }

  if (!document.getElementById("mobile-navbar")) {
    const mobileItems = pages.map(page => {
      const active = activePage === page.id;
      const center = page.id === "scan";
      const icons = {
        converter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7h-9m3 10H4m12-13 3 3-3 3M8 14l-3 3 3 3"/></svg>',
        scan: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3m8 0h3a1 1 0 0 1 1 1v3m0 8v3a1 1 0 0 1-1 1h-3m-8 0H5a1 1 0 0 1-1-1v-3M8 12h8"/></svg>',
        qrcode: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zm4 4h3v3h-3zm0-4h3m-7 7h3"/></svg>',
      };
      return `
        <a href="${page.href}" class="mobile-nav-item ${active ? "active" : ""} ${center ? "mobile-nav-center" : ""}"
           aria-current="${active ? "page" : "false"}" aria-label="${page.label}">
          <span class="mnav-icon">${icons[page.id]}</span>
          <span>${page.labelShort}</span>
        </a>`;
    }).join("");
    const nav = document.createElement("nav");
    nav.id = "mobile-navbar";
    nav.className = "mobile-navbar";
    nav.setAttribute("aria-label", "Navigasi utama");
    nav.innerHTML = mobileItems;
    document.body.appendChild(nav);
  }

  const themeButton = document.querySelector('[data-action="toggle-theme"]');
  if (themeButton) {
    themeButton.textContent = document.documentElement.getAttribute("data-theme") === "light" ? "☾" : "☼";
    themeButton.onclick = toggleTheme;
  }

  const installButton = document.querySelector('[data-action="install-app"]');
  if (installButton) installButton.onclick = installApp;
}

let installPromptEvent = null;
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPromptEvent = event;
  const button = document.querySelector(".install-app-button");
  if (button) button.hidden = false;
});

window.addEventListener("appinstalled", () => {
  installPromptEvent = null;
  const button = document.querySelector(".install-app-button");
  if (button) button.hidden = true;
});

async function installApp() {
  if (!installPromptEvent) return;
  await installPromptEvent.prompt();
  installPromptEvent = null;
  const button = document.querySelector(".install-app-button");
  if (button) button.hidden = true;
}

function toggleTheme() {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const mode = isLight ? "dark" : "light";
  if (mode === "light") document.documentElement.setAttribute("data-theme", "light");
  else document.documentElement.removeAttribute("data-theme");
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || "{}");
  } catch (error) {
    console.warn("[UI] Preferensi tema tidak dapat dibaca:", error);
  }
  settings.darkMode = mode;
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  const button = document.querySelector('[data-action="toggle-theme"]');
  if (button) button.textContent = mode === "light" ? "☾" : "☼";
}

/**
 * Tampilkan notifikasi sementara.
 * @param {string} msg
 * @param {'success'|'error'} [type='success']
 */
function showToast(msg, type = "success") {
  let toast = document.getElementById("toast-notification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-notification";
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "polite");
    toast.style.cssText = [
      "position:fixed","bottom:28px","right:28px","z-index:9999",
      "padding:12px 20px","border-radius:10px","font-size:13.5px",
      "font-weight:500","opacity:0","transition:opacity 0.25s",
      "max-width:300px","line-height:1.4","pointer-events:none",
      "font-family:var(--font-body,sans-serif)",
    ].join(";");
    document.body.appendChild(toast);
  }

  const isSuccess = type === "success";
  toast.textContent = msg;
  toast.style.background = isSuccess ? "rgba(0,212,168,0.15)" : "rgba(255,107,107,0.15)";
  toast.style.border = isSuccess ? "1px solid rgba(0,212,168,0.3)" : "1px solid rgba(255,107,107,0.3)";
  toast.style.color = isSuccess ? "#00d4a8" : "#ff6b6b";
  toast.style.opacity = "1";

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.opacity = "0"; }, 2800);
}

/**
 * Terapkan preferensi tampilan yang tersimpan di browser.
 */
function applyGlobalSettings() {
  let settings = {};
  try {
    settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || "{}");
  } catch (error) {
    console.warn("[UI] Preferensi aplikasi tidak dapat dibaca:", error);
  }

  if (settings.accent) {
    document.documentElement.style.setProperty("--accent", settings.accent);
    document.documentElement.style.setProperty("--accent-glow", hexToRgba(settings.accent, 0.28));
  }
  if (settings.fontSize) {
    document.documentElement.style.fontSize = settings.fontSize + "px";
  }
  document.documentElement.style.setProperty(
    "--transition",
    settings.anim === false ? "0s" : "0.18s cubic-bezier(0.4,0,0.2,1)"
  );
  if (settings.darkMode === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  const themeButton = document.querySelector('[data-action="toggle-theme"]');
  if (themeButton) themeButton.textContent = settings.darkMode === "light" ? "☾" : "☼";
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

(function initPageTransition() {
  document.addEventListener("DOMContentLoaded", () => {
    const main = document.querySelector(".main-content");
    if (main) main.classList.add("page-fade-in");
  });

  document.addEventListener("click", event => {
    const link = event.target.closest("a.mobile-nav-item");
    if (!link) return;

    const href = link.getAttribute("href");
    if (!href || href === "#" || href.startsWith("http")) return;
    if (window.location.pathname === new URL(href, window.location.href).pathname) return;

    event.preventDefault();
    const main = document.querySelector(".main-content");
    if (main) {
      main.style.transition = "opacity 0.18s ease, transform 0.18s ease";
      main.style.opacity = "0";
      main.style.transform = "translateY(8px)";
    }

    const sidebar = document.querySelector(".sidebar");
    if (sidebar) {
      sidebar.style.transition = "opacity 0.18s ease";
      sidebar.style.opacity = "0.6";
    }
    setTimeout(() => { window.location.href = href; }, 180);
  });
})();
