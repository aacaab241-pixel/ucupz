
// ===== Konfigurasi =====

/**
 * Key localStorage yang digunakan aplikasi.
 */
const STORAGE_KEYS = {
  SETTINGS: "settings",
  QR_HIST:  "qr_history",
  ACTIVITY: "activity_log",
  PROCESSED: "total_processed",
  CONVERTER_HISTORY: "converter_history",
};

// ===== Utilitas =====

/**
 * Bersihkan string sebelum ditampilkan atau disimpan dari input pengguna.
 *
 * @param {string} str
 * @param {number} [maxLen=200]
 * @returns {string}
 */
function sanitizeString(str, maxLen = 200) {
  if (typeof str !== "string") return "";
  return str.trim().slice(0, maxLen).replace(/[<>"'`]/g, "");
}

/**
 * Membersihkan key localStorage yang tidak digunakan aplikasi.
 *
 * @returns {void}
 */
function initLocalApp() {
  cleanUnknownStorageKeys();
}

/**
 * Hapus key localStorage yang tidak digunakan aplikasi.
 */
function cleanUnknownStorageKeys() {
  const allowed = new Set(Object.values(STORAGE_KEYS));
  Object.keys(localStorage).forEach(key => {
    if (!allowed.has(key)) localStorage.removeItem(key);
  });
}

// ===== UI bersama =====

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
          <span class="brand-icon" aria-hidden="true"><img src="../favicon-512.png" alt="" /></span>
          <span class="brand-name">Ucupz <span>${activePage === "converter" ? "Convert" : activePage === "scan" ? "Scan QR" : "QR Code"}</span></span>
        </a>
        <span class="offline-status"><span aria-hidden="true"></span> Offline Ready</span>
        <div class="header-actions">
          <button class="header-icon-button install-app-button" type="button" data-action="install-app" aria-label="Instal aplikasi" title="Instal aplikasi">Instal</button>
          <button class="header-icon-button" type="button" data-action="toggle-theme" aria-label="Ganti tema" title="Ganti tema">☼</button>
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
  if (installButton) {
    installButton.onclick = installApp;
    updateInstallButton();
  }
}

let installPromptEvent = null;
function isAppInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function updateInstallButton() {
  const button = document.querySelector(".install-app-button");
  if (button) button.hidden = isAppInstalled();
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPromptEvent = event;
  updateInstallButton();
});

window.addEventListener("appinstalled", () => {
  installPromptEvent = null;
  updateInstallButton();
});

async function installApp() {
  if (isAppInstalled()) {
    updateInstallButton();
    return;
  }
  if (!installPromptEvent) {
    showToast("Buka menu browser, lalu pilih “Tambahkan ke layar utama”.", "info");
    return;
  }

  try {
    await installPromptEvent.prompt();
  } catch (error) {
    console.warn("[UI] Instalasi aplikasi gagal:", error);
    showToast("Instalasi gagal. Coba lagi melalui menu browser.", "error");
  }
  installPromptEvent = null;
  updateInstallButton();
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
 * @param {'success'|'error'|'info'} [type='success']
 */
function showToast(msg, type = "success") {
  let toast = document.getElementById("toast-notification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-notification";
    toast.className = "toast-notification";
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }

  const status = type === "error" || type === "info" ? type : "success";
  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = status === "success" ? "✓" : status === "error" ? "!" : "i";
  const message = document.createElement("span");
  message.textContent = msg;
  toast.replaceChildren(icon, message);
  toast.classList.toggle("success", status === "success");
  toast.classList.toggle("error", status === "error");
  toast.classList.toggle("info", status === "info");
  toast.classList.add("is-visible");

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.classList.remove("is-visible"); }, 3200);
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

// ===== Batch processor =====

(function () {

  // ── State ───────────────────────────────────────────────
  let batchFiles   = [];
  let batchMode    = "compress"; // compress | resize | convert
  let batchRunning = false;

  // ── Style ───────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById("batch-style")) return;
    const s = document.createElement("style");
    s.id = "batch-style";
    s.textContent = `
      #batch-modal-overlay {
        position: fixed; inset: 0; z-index: 99996;
        background: rgba(8,8,15,0.80);
        backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        padding: 24px; opacity: 0; visibility: hidden;
        transition: opacity 0.25s ease, visibility 0.25s ease;
      }
      #batch-modal-overlay.show { opacity: 1; visibility: visible; }

      #batch-modal-card {
        background: #13132a;
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 20px;
        padding: 28px 28px 24px;
        width: 100%; max-width: 560px;
        max-height: 90vh; overflow-y: auto;
        box-shadow: 0 32px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(124,106,255,0.12);
        transform: scale(0.92) translateY(16px);
        transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
        position: relative;
      }
      #batch-modal-overlay.show #batch-modal-card {
        transform: scale(1) translateY(0);
      }
      #batch-modal-card::before {
        content: '';
        position: absolute; top: -1px; left: 20%; right: 20%;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(124,106,255,0.6), transparent);
      }

      .batch-header {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 20px;
      }
      .batch-title {
        font-family: var(--font-head, 'Syne', sans-serif);
        font-size: 18px; font-weight: 700; color: var(--text, #eeedf8);
        letter-spacing: -0.02em;
      }
      .batch-close {
        background: none; border: none; color: var(--text3, #4a4962);
        font-size: 18px; cursor: pointer; padding: 4px 8px;
        border-radius: 6px; transition: all 0.18s ease;
      }
      .batch-close:hover { color: var(--text, #eeedf8); background: rgba(255,255,255,0.06); }

      /* Mode tabs */
      .batch-mode-tabs {
        display: flex; gap: 6px; margin-bottom: 20px;
        background: var(--bg3, #16162a);
        border: 1px solid var(--border, rgba(255,255,255,0.07));
        border-radius: 10px; padding: 4px;
      }
      .batch-mode-tab {
        flex: 1; padding: 8px 0; border: none; border-radius: 7px;
        background: transparent; color: var(--text2, #8887a4);
        font-family: var(--font-body, sans-serif); font-size: 13px; font-weight: 500;
        cursor: pointer; transition: all 0.18s ease; text-align: center;
      }
      .batch-mode-tab.active {
        background: var(--surface, #1c1c30); color: var(--text, #eeedf8);
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      }

      /* Upload zone batch */
      .batch-upload-zone {
        border: 2px dashed var(--border2, rgba(255,255,255,0.13));
        border-radius: 12px; padding: 28px 20px; text-align: center;
        cursor: pointer; transition: all 0.18s ease; margin-bottom: 16px;
      }
      .batch-upload-zone:hover, .batch-upload-zone.drag-over {
        border-color: var(--accent, #7c6aff);
        background: rgba(124,106,255,0.05);
      }
      .batch-upload-zone p { font-size: 13px; color: var(--text2, #8887a4); margin-top: 6px; }
      .batch-upload-zone strong { color: var(--text, #eeedf8); font-size: 14px; }

      /* Options */
      .batch-option-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 0; border-bottom: 1px solid var(--border, rgba(255,255,255,0.07));
        gap: 12px; flex-wrap: wrap;
      }
      .batch-option-row:last-of-type { border: none; }
      .batch-opt-label { font-size: 13px; font-weight: 500; color: var(--text, #eeedf8); }
      .batch-opt-desc  { font-size: 11px; color: var(--text2, #8887a4); margin-top: 2px; }

      /* File queue list */
      .batch-file-queue {
        display: flex; flex-direction: column; gap: 6px;
        max-height: 200px; overflow-y: auto;
        margin-bottom: 16px; padding-right: 2px;
      }
      .batch-file-item {
        display: flex; align-items: center; gap: 10px;
        background: var(--bg3, #16162a);
        border: 1px solid var(--border, rgba(255,255,255,0.07));
        border-radius: 8px; padding: 8px 12px;
        transition: border-color 0.18s ease;
      }
      .batch-file-item.done    { border-color: rgba(0,212,168,0.3); }
      .batch-file-item.failed  { border-color: rgba(255,107,107,0.3); }
      .batch-file-item.running { border-color: rgba(124,106,255,0.3); }
      .bfi-icon { font-size: 16px; flex-shrink: 0; }
      .bfi-name { flex: 1; font-size: 12px; font-weight: 500; color: var(--text, #eeedf8);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .bfi-size { font-size: 11px; color: var(--text3, #4a4962); flex-shrink: 0; }
      .bfi-status { font-size: 11px; flex-shrink: 0; min-width: 56px; text-align: right; }
      .bfi-del {
        background: none; border: none; color: var(--text3, #4a4962);
        cursor: pointer; font-size: 13px; padding: 2px 4px; flex-shrink: 0;
      }
      .bfi-del:hover { color: var(--danger, #ff6b6b); }

      /* Progress overall */
      .batch-overall-progress {
        margin-bottom: 16px; display: none;
      }
      .batch-overall-bar {
        height: 6px; background: var(--surface2, #22223a);
        border-radius: 6px; overflow: hidden; margin-bottom: 6px;
      }
      .batch-overall-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--accent, #7c6aff), var(--teal, #00d4a8));
        border-radius: 6px;
        transition: width 0.3s ease;
        width: 0%;
      }
      .batch-overall-text {
        font-size: 12px; color: var(--text2, #8887a4); text-align: center;
      }

      /* Actions */
      .batch-actions { display: flex; gap: 10px; margin-top: 4px; }
      .batch-btn-cancel {
        padding: 10px 18px; border-radius: 9px;
        border: 1px solid rgba(255,255,255,0.10);
        background: transparent; color: var(--text2, #8887a4);
        font-family: var(--font-body, sans-serif); font-size: 13.5px; font-weight: 500;
        cursor: pointer; transition: all 0.18s ease;
      }
      .batch-btn-cancel:hover { background: rgba(255,255,255,0.06); color: var(--text, #eeedf8); }
      .batch-btn-run {
        flex: 1; padding: 10px 18px; border-radius: 9px; border: none;
        background: var(--accent, #7c6aff); color: #fff;
        font-family: var(--font-body, sans-serif); font-size: 13.5px; font-weight: 600;
        cursor: pointer; transition: all 0.2s ease;
        box-shadow: 0 4px 16px rgba(124,106,255,0.3);
      }
      .batch-btn-run:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
      .batch-btn-run:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

      /* Download all button */
      .batch-btn-dl-all {
        width: 100%; padding: 10px; border-radius: 9px; border: none;
        background: rgba(0,212,168,0.12);
        border: 1px solid rgba(0,212,168,0.25);
        color: var(--teal, #00d4a8);
        font-family: var(--font-body, sans-serif); font-size: 13.5px; font-weight: 600;
        cursor: pointer; margin-top: 10px; transition: all 0.18s ease; display: none;
      }
      .batch-btn-dl-all:hover { background: rgba(0,212,168,0.2); }
      .batch-btn-dl-all.show { display: block; }

      /* Trigger button di halaman converter */
      .batch-trigger-btn {
        display: inline-flex; align-items: center; gap: 7px;
        padding: 9px 16px; border-radius: 9px;
        border: 1px solid var(--border2, rgba(255,255,255,0.13));
        background: var(--surface, #1c1c30); color: var(--text2, #8887a4);
        font-family: var(--font-body, sans-serif); font-size: 13px; font-weight: 500;
        cursor: pointer; transition: all 0.18s ease; white-space: nowrap;
      }
      .batch-trigger-btn:hover {
        border-color: var(--accent, #7c6aff); color: var(--accent2, #b8abff);
        background: rgba(124,106,255,0.07);
      }

      @media (max-width: 600px) {
        #batch-modal-card { padding: 20px 16px 18px; border-radius: 16px; }
        .batch-title { font-size: 16px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── HTML modal ───────────────────────────────────────────
  function injectModal() {
    if (document.getElementById("batch-modal-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "batch-modal-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div id="batch-modal-card">
        <div class="batch-header">
          <h2 class="batch-title">⚡ Batch Processing</h2>
          <button class="batch-close" onclick="window.batchClose()" aria-label="Tutup">✕</button>
        </div>

        <!-- Mode tabs -->
        <div class="batch-mode-tabs">
          <button class="batch-mode-tab active" data-mode="compress" onclick="window.batchSetMode('compress',this)">🗜 Kompres</button>
          <button class="batch-mode-tab" data-mode="resize" onclick="window.batchSetMode('resize',this)">📐 Resize</button>
          <button class="batch-mode-tab" data-mode="convert" onclick="window.batchSetMode('convert',this)">🔁 Konversi</button>
          <button class="batch-mode-tab" data-mode="grayscale" onclick="window.batchSetMode('grayscale',this)">🎨 Abu-abu</button>
        </div>

        <!-- Upload zone -->
        <div class="batch-upload-zone" id="batch-upload-zone"
          onclick="document.getElementById('batch-file-input').click()">
          <div style="font-size:28px;margin-bottom:6px">🖼</div>
          <strong>Klik atau seret gambar ke sini</strong>
          <p>JPG, PNG, WEBP — bisa banyak sekaligus</p>
          <input type="file" id="batch-file-input" accept="image/*" multiple style="display:none"
            onchange="window.batchAddFiles(this.files)" />
        </div>

        <!-- Options per mode -->
        <div id="batch-options"></div>

        <!-- File queue -->
        <div class="batch-file-queue" id="batch-file-queue" style="display:none"></div>

        <!-- Overall progress -->
        <div class="batch-overall-progress" id="batch-overall-progress">
          <div class="batch-overall-bar">
            <div class="batch-overall-fill" id="batch-overall-fill"></div>
          </div>
          <p class="batch-overall-text" id="batch-overall-text">0 / 0 file selesai</p>
        </div>

        <!-- Actions -->
        <div class="batch-actions">
          <button class="batch-btn-cancel" onclick="window.batchClose()">Batal</button>
          <button class="batch-btn-run" id="batch-btn-run" disabled onclick="window.batchRun()">
            ⚡ Proses Semua
          </button>
        </div>

        <button class="batch-btn-dl-all" id="batch-btn-dl-all" onclick="window.batchDownloadAll()">
          ⬇ Unduh Semua File (ZIP)
        </button>
      </div>
    `;

    overlay.addEventListener("click", (e) => { if (e.target === overlay) window.batchClose(); });
    document.body.appendChild(overlay);

    // Init drag drop untuk batch upload zone
    const bz = document.getElementById("batch-upload-zone");
    bz.addEventListener("dragover",  e => { e.preventDefault(); bz.classList.add("drag-over"); });
    bz.addEventListener("dragleave", () => bz.classList.remove("drag-over"));
    bz.addEventListener("drop", e => {
      e.preventDefault(); bz.classList.remove("drag-over");
      window.batchAddFiles(e.dataTransfer.files);
    });

    renderBatchOptions();
  }

  // ── Options HTML per mode ────────────────────────────────
  const BATCH_OPTIONS_HTML = {
    compress: `
      <div class="batch-option-row">
        <div><p class="batch-opt-label">Kualitas: <span id="b-quality-val">75</span>%</p>
        <p class="batch-opt-desc">Berlaku untuk semua file</p></div>
        <input type="range" id="b-quality" min="10" max="95" value="75" class="slider" style="width:120px"
          oninput="document.getElementById('b-quality-val').textContent=this.value" />
      </div>
      <div class="batch-option-row">
        <div><p class="batch-opt-label">Format output</p></div>
        <div class="format-pills">
          <label class="format-pill"><input type="radio" name="b-fmt" value="same" checked /> Sama</label>
          <label class="format-pill"><input type="radio" name="b-fmt" value="image/jpeg" /> JPG</label>
          <label class="format-pill"><input type="radio" name="b-fmt" value="image/webp" /> WEBP</label>
        </div>
      </div>`,

    resize: `
      <div class="batch-option-row">
        <div><p class="batch-opt-label">Lebar maksimum (px)</p>
        <p class="batch-opt-desc">Tinggi menyesuaikan rasio otomatis</p></div>
        <input type="number" id="b-max-w" class="form-input" value="1280"
          min="100" max="9999" style="max-width:90px" />
      </div>
      <div class="batch-option-row">
        <div><p class="batch-opt-label">Hanya perkecil</p>
        <p class="batch-opt-desc">Gambar yang sudah lebih kecil tidak diubah</p></div>
        <label class="toggle"><input type="checkbox" id="b-only-shrink" checked /><span class="toggle-track"></span></label>
      </div>`,

    convert: `
      <div class="batch-option-row">
        <div><p class="batch-opt-label">Konversi ke format</p></div>
        <div class="format-pills">
          <label class="format-pill"><input type="radio" name="b-conv-fmt" value="image/png" checked /> PNG</label>
          <label class="format-pill"><input type="radio" name="b-conv-fmt" value="image/jpeg" /> JPG</label>
          <label class="format-pill"><input type="radio" name="b-conv-fmt" value="image/webp" /> WEBP</label>
        </div>
      </div>`,

    grayscale: `
      <div class="batch-option-row" style="border:none">
        <div><p class="batch-opt-label">Semua gambar diubah ke hitam putih</p>
        <p class="batch-opt-desc">Format output sama dengan file asli</p></div>
        <span style="font-size:20px">🎨</span>
      </div>`,
  };

  function renderBatchOptions() {
    const el = document.getElementById("batch-options");
    if (el) el.innerHTML = BATCH_OPTIONS_HTML[batchMode] || "";
  }

  // ── Tambah file ke antrian ───────────────────────────────
  window.batchAddFiles = function(fileList) {
    const existing = new Set(batchFiles.map(f => f.name + f.size));
    for (const f of fileList) {
      if (!f.type.startsWith("image/")) continue;
      if (existing.has(f.name + f.size)) continue;
      batchFiles.push(f);
    }
    renderBatchQueue();
  };

  function renderBatchQueue() {
    const el = document.getElementById("batch-file-queue");
    const btn = document.getElementById("batch-btn-run");
    if (!el) return;

    if (!batchFiles.length) {
      el.style.display = "none";
      if (btn) btn.disabled = true;
      return;
    }

    el.style.display = "flex";
    el.innerHTML = batchFiles.map((f, i) => `
      <div class="batch-file-item" id="bfi-${i}">
        <span class="bfi-icon">🖼</span>
        <span class="bfi-name">${escHtml(f.name)}</span>
        <span class="bfi-size">${fmtSizeB(f.size)}</span>
        <span class="bfi-status" id="bfi-status-${i}" style="color:var(--text3)">Menunggu</span>
        <button class="bfi-del" onclick="window.batchRemoveFile(${i})" ${batchRunning ? "disabled" : ""}>✕</button>
      </div>`).join("");

    if (btn) btn.disabled = batchRunning || batchFiles.length === 0;
  }

  window.batchRemoveFile = function(i) {
    batchFiles.splice(i, 1);
    renderBatchQueue();
  };

  // ── Set mode ─────────────────────────────────────────────
  window.batchSetMode = function(mode, btn) {
    batchMode = mode;
    document.querySelectorAll(".batch-mode-tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderBatchOptions();
  };

  // ── Jalankan batch ───────────────────────────────────────
  window.batchRun = async function() {
    if (!batchFiles.length || batchRunning) return;
    batchRunning = true;

    const runBtn = document.getElementById("batch-btn-run");
    if (runBtn) { runBtn.disabled = true; runBtn.textContent = "⏳ Memproses..."; }

    const progressWrap = document.getElementById("batch-overall-progress");
    const progressFill = document.getElementById("batch-overall-fill");
    const progressText = document.getElementById("batch-overall-text");
    if (progressWrap) progressWrap.style.display = "block";

    window._batchResults = [];
    let done = 0;

    for (let i = 0; i < batchFiles.length; i++) {
      const f    = batchFiles[i];
      const item = document.getElementById(`bfi-${i}`);
      const stat = document.getElementById(`bfi-status-${i}`);

      if (item) item.classList.add("running");
      if (stat) { stat.textContent = "Memproses..."; stat.style.color = "var(--accent2)"; }

      try {
        const result = await processBatchFile(f);
        window._batchResults.push({ blob: result.blob, filename: result.filename });

        if (item) item.classList.replace("running", "done");
        if (stat) {
          const saved = f.size > result.blob.size
            ? ` (-${Math.round((1 - result.blob.size/f.size)*100)}%)`
            : "";
          stat.textContent = "✓" + saved;
          stat.style.color = "var(--success)";
        }
      } catch(e) {
        if (item) item.classList.replace("running", "failed");
        if (stat) { stat.textContent = "✗ Gagal"; stat.style.color = "var(--danger)"; }
      }

      done++;
      const pct = Math.round((done / batchFiles.length) * 100);
      if (progressFill) progressFill.style.width = pct + "%";
      if (progressText) progressText.textContent  = `${done} / ${batchFiles.length} file selesai`;
    }

    batchRunning = false;
    if (runBtn) { runBtn.textContent = "✓ Selesai"; }

    const dlAllBtn = document.getElementById("batch-btn-dl-all");
    if (dlAllBtn && window._batchResults.length > 0) dlAllBtn.classList.add("show");

    if (typeof showToast === "function") {
      showToast(`${window._batchResults.length} file berhasil diproses ✓`);
    }
  };

  // ── Proses 1 file sesuai mode aktif ─────────────────────
  async function processBatchFile(file) {
    const canvas = document.createElement("canvas");
    const bm     = await createImageBitmap(file);
    let w = bm.width, h = bm.height;
    let mime = file.type;
    let ext  = file.name.split(".").pop().toLowerCase();
    let suffix = "";

    if (batchMode === "compress") {
      const quality  = parseInt(document.getElementById("b-quality")?.value || 75) / 100;
      const fmtRadio = document.querySelector('input[name="b-fmt"]:checked');
      const fmt      = fmtRadio?.value || "same";
      if (fmt !== "same") { mime = fmt; ext = fmt === "image/jpeg" ? "jpg" : "webp"; }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(bm, 0, 0);
      suffix = "_kompres";
      const blob = await new Promise(res => canvas.toBlob(res, mime === file.type ? "image/jpeg" : mime, quality));
      return { blob, filename: file.name.replace(/\.[^.]+$/, "") + suffix + "." + ext };
    }

    if (batchMode === "resize") {
      const maxW      = parseInt(document.getElementById("b-max-w")?.value || 1280);
      const onlyShrink = document.getElementById("b-only-shrink")?.checked ?? true;
      if (!onlyShrink || w > maxW) {
        h = Math.round(h * (maxW / w));
        w = maxW;
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(bm, 0, 0, w, h);
      suffix = `_${w}x${h}`;
      const blob = await new Promise(res => canvas.toBlob(res, mime, 0.92));
      return { blob, filename: file.name.replace(/\.[^.]+$/, "") + suffix + "." + ext };
    }

    if (batchMode === "convert") {
      const fmtRadio = document.querySelector('input[name="b-conv-fmt"]:checked');
      mime = fmtRadio?.value || "image/png";
      ext  = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(bm, 0, 0);
      const blob = await new Promise(res => canvas.toBlob(res, mime, 0.93));
      return { blob, filename: file.name.replace(/\.[^.]+$/, "") + "." + ext };
    }

    if (batchMode === "grayscale") {
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.filter = "grayscale(1)";
      ctx.drawImage(bm, 0, 0);
      const blob = await new Promise(res => canvas.toBlob(res, mime, 0.93));
      return { blob, filename: file.name.replace(/\.[^.]+$/, "") + "_abuabu." + ext };
    }

    throw new Error("Mode tidak dikenal");
  }

  // ── Download semua sebagai ZIP ───────────────────────────
  window.batchDownloadAll = async function() {
    const results = window._batchResults || [];
    if (!results.length) return;

    // Kalau hanya 1 file, langsung download tanpa ZIP
    if (results.length === 1) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(results[0].blob);
      a.download = results[0].filename;
      a.click();
      return;
    }

    // Buat ZIP sederhana manual (tanpa library eksternal)
    // Gunakan JSZip kalau tersedia, fallback ke download satu per satu
    if (window.JSZip) {
      const zip = new JSZip();
      results.forEach(r => zip.file(r.filename, r.blob));
      const content = await zip.generateAsync({ type:"blob", compression:"DEFLATE", compressionOptions:{ level:6 } });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `batch_${Date.now()}.zip`;
      a.click();
      if (typeof showToast === "function") showToast("ZIP berhasil diunduh ✓");
    } else {
      // Fallback: download satu per satu dengan delay
      if (typeof showToast === "function") showToast("Mengunduh " + results.length + " file...");
      for (let i = 0; i < results.length; i++) {
        await new Promise(res => setTimeout(res, i * 300));
        const a = document.createElement("a");
        a.href = URL.createObjectURL(results[i].blob);
        a.download = results[i].filename;
        a.click();
      }
    }
  };

  // ── Open / close ─────────────────────────────────────────
  window.batchOpen = function() {
    batchFiles   = [];
    batchRunning = false;
    window._batchResults = [];

    injectStyles();
    injectModal();

    const overlay = document.getElementById("batch-modal-overlay");
    if (!overlay) return;

    // Reset state UI
    renderBatchQueue();
    renderBatchOptions();
    const progressWrap = document.getElementById("batch-overall-progress");
    if (progressWrap) progressWrap.style.display = "none";
    const dlAllBtn = document.getElementById("batch-btn-dl-all");
    if (dlAllBtn) dlAllBtn.classList.remove("show");
    const runBtn = document.getElementById("batch-btn-run");
    if (runBtn) { runBtn.disabled = true; runBtn.textContent = "⚡ Proses Semua"; }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add("show");
        document.body.style.overflow = "hidden";
      });
    });
  };

  window.batchClose = function() {
    const overlay = document.getElementById("batch-modal-overlay");
    if (!overlay) return;
    overlay.classList.remove("show");
    document.body.style.overflow = "";
  };

  // ── Keyboard ─────────────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const overlay = document.getElementById("batch-modal-overlay");
      if (overlay?.classList.contains("show")) window.batchClose();
    }
  });

  // ── Utilitas lokal ───────────────────────────────────────
  function fmtSizeB(b) {
    if (b < 1024)    return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(2) + " MB";
  }
  function escHtml(str) {
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

})();

// ===== Riwayat converter =====

(function () {

  const HISTORY_KEY = STORAGE_KEYS.CONVERTER_HISTORY;
  const MAX_HISTORY = 20;

  // ── Style ───────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById("conv-history-style")) return;
    const s = document.createElement("style");
    s.id = "conv-history-style";
    s.textContent = `
      /* Panel riwayat — muncul di bawah tool grid */
      #conv-history-panel {
        margin-top: 32px;
        display: none;
      }
      #conv-history-panel.show { display: block; }

      .conv-history-header {
        display: flex; align-items: center;
        justify-content: space-between; margin-bottom: 12px;
      }
      .conv-history-title {
        font-family: var(--font-head, 'Syne', sans-serif);
        font-size: 15px; font-weight: 700; color: var(--text, #eeedf8);
      }

      .conv-history-list {
        display: flex; flex-direction: column; gap: 8px;
      }

      .conv-history-item {
        display: flex; align-items: center; gap: 12px;
        background: var(--surface, #1c1c30);
        border: 1px solid var(--border, rgba(255,255,255,0.07));
        border-radius: var(--radius-sm, 9px); padding: 12px 14px;
        transition: border-color 0.18s ease, background 0.18s ease;
        animation: fileItemIn 0.22s ease both;
      }
      .conv-history-item:hover {
        border-color: var(--border2, rgba(255,255,255,0.13));
        background: var(--surface2, #22223a);
      }

      .chi-icon {
        font-size: 20px; flex-shrink: 0;
        width: 38px; height: 38px;
        display: flex; align-items: center; justify-content: center;
        background: var(--bg3, #16162a);
        border: 1px solid var(--border2, rgba(255,255,255,0.13));
        border-radius: 8px;
      }
      .chi-body { flex: 1; min-width: 0; }
      .chi-tool {
        font-size: 13px; font-weight: 600; color: var(--text, #eeedf8);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .chi-meta {
        font-size: 11px; color: var(--text3, #4a4962); margin-top: 2px;
        display: flex; gap: 8px; flex-wrap: wrap;
      }
      .chi-meta span { display: flex; align-items: center; gap: 3px; }
      .chi-badge {
        font-size: 10px; font-weight: 600; flex-shrink: 0;
        padding: 2px 8px; border-radius: 20px;
      }
      .chi-badge-pdf    { background: rgba(255,107,107,0.12); color: #ff8e8e; }
      .chi-badge-image  { background: rgba(124,106,255,0.12); color: var(--accent2, #b8abff); }
      .chi-badge-doc    { background: rgba(0,212,168,0.10);   color: var(--teal, #00d4a8); }
      .chi-open {
        background: none; border: 1px solid var(--border2, rgba(255,255,255,0.13));
        border-radius: 7px; color: var(--text2, #8887a4);
        font-family: var(--font-body, sans-serif); font-size: 11.5px; font-weight: 500;
        padding: 5px 10px; cursor: pointer; flex-shrink: 0;
        transition: all 0.18s ease; white-space: nowrap;
      }
      .chi-open:hover {
        border-color: var(--accent, #7c6aff); color: var(--accent2, #b8abff);
        background: rgba(124,106,255,0.07);
      }
      .chi-del {
        background: none; border: none; color: var(--text3, #4a4962);
        font-size: 13px; cursor: pointer; padding: 4px 6px; flex-shrink: 0;
      }
      .chi-del:hover { color: var(--danger, #ff6b6b); }

      /* Toggle tombol riwayat */
      .conv-history-toggle {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 12.5px; color: var(--text2, #8887a4);
        background: none; border: none; cursor: pointer;
        padding: 0; font-family: var(--font-body, sans-serif);
        transition: color 0.18s ease;
      }
      .conv-history-toggle:hover { color: var(--accent2, #b8abff); }

      .conv-history-empty {
        text-align: center; padding: 32px 0;
        color: var(--text3, #4a4962); font-size: 13px;
      }
      .conv-history-empty-icon {
        font-size: 32px; margin-bottom: 8px; opacity: 0.5;
      }
    `;
    document.head.appendChild(s);
  }

  // ── Load & save history ──────────────────────────────────
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
    catch(_) { return []; }
  }

  function saveHistory(history) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch(_) {}
  }

  // ── Tambah entri ─────────────────────────────────────────
  window.convHistoryAdd = function(toolId, toolTitle, toolIcon, inputFiles, outputDesc) {
    const history = loadHistory();
    const pdfTools   = ["merge","split","rotate","deletepages","compresspdf","passwordpdf","pdf2txt","img2pdf","pdf2img"];
    const imageTools = ["imgconvert","compress","resize","crop","rotate_img","adjust","grayscale","exif","base64img","ascii"];
    let cat = "doc";
    if (pdfTools.includes(toolId))   cat = "pdf";
    if (imageTools.includes(toolId)) cat = "image";

    const entry = {
      id:       Date.now(),
      toolId,
      tool:     toolTitle,
      icon:     toolIcon,
      cat,
      files:    inputFiles.map(f => ({ name: f.name, size: f.size })),
      output:   outputDesc,
      time:     Date.now(),
    };

    history.unshift(entry);
    if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY);
    saveHistory(history);
    renderHistoryPanel();
  };

  // ── Render panel ─────────────────────────────────────────
  function renderHistoryPanel() {
    const panel = document.getElementById("conv-history-panel");
    if (!panel) return;

    const history = loadHistory();

    if (!history.length) {
      panel.classList.remove("show");
      return;
    }

    panel.classList.add("show");

    const badgeClass = { pdf:"chi-badge-pdf", image:"chi-badge-image", doc:"chi-badge-doc" };
    const badgeLabel = { pdf:"PDF", image:"Gambar", doc:"Dokumen" };

    const list = history.map(item => `
      <div class="conv-history-item" id="chi-${item.id}">
        <div class="chi-icon">${item.icon}</div>
        <div class="chi-body">
          <p class="chi-tool">${escHtml(item.tool)}</p>
          <div class="chi-meta">
            <span>🕐 ${timeAgo(item.time)}</span>
            <span>📁 ${item.files.length} file</span>
            ${item.output ? `<span>→ ${escHtml(item.output)}</span>` : ""}
          </div>
        </div>
        <span class="chi-badge ${badgeClass[item.cat] || "chi-badge-doc"}">${badgeLabel[item.cat] || "Tool"}</span>
        <button class="chi-open" onclick="window.convHistoryReopen('${item.toolId}')">Buka Tool →</button>
        <button class="chi-del" onclick="window.convHistoryDelete(${item.id})" aria-label="Hapus">✕</button>
      </div>`).join("");

    const listEl = document.getElementById("conv-history-list");
    if (listEl) listEl.innerHTML = list;
  }

  // ── Reopen tool dari history ─────────────────────────────
  window.convHistoryReopen = function(toolId) {
    if (typeof openTool === "function") {
      openTool(toolId);
      if (typeof showToast === "function") showToast("Tool dibuka — unggah file baru untuk memproses");
    }
  };

  // ── Hapus entri ──────────────────────────────────────────
  window.convHistoryDelete = function(id) {
    let history = loadHistory();
    history = history.filter(h => h.id !== id);
    saveHistory(history);
    const el = document.getElementById("chi-" + id);
    if (el) {
      el.style.transition = "opacity 0.2s ease, transform 0.2s ease";
      el.style.opacity = "0";
      el.style.transform = "translateX(12px)";
      setTimeout(() => renderHistoryPanel(), 220);
    }
  };

  // ── Hapus semua ──────────────────────────────────────────
  window.convHistoryClear = function() {
    if (!confirm("Hapus semua riwayat konversi?")) return;
    localStorage.removeItem(HISTORY_KEY);
    renderHistoryPanel();
    if (typeof showToast === "function") showToast("Riwayat dihapus ✓");
  };

  // ── Inject panel ke halaman converter ───────────────────
  function injectPanel() {
    // Cari elemen tool-grid-section untuk append panel di bawahnya
    const gridSection = document.getElementById("tool-grid-section");
    if (!gridSection || document.getElementById("conv-history-panel")) return;

    const panel = document.createElement("div");
    panel.id = "conv-history-panel";
    panel.innerHTML = `
      <div class="conv-history-header">
        <h3 class="conv-history-title">🕐 Riwayat Konversi</h3>
        <button class="btn btn-secondary" onclick="window.convHistoryClear()"
          style="font-size:11px;padding:4px 10px">Hapus Semua</button>
      </div>
      <div class="conv-history-list" id="conv-history-list"></div>
    `;
    gridSection.appendChild(panel);
    renderHistoryPanel();
  }

  // ── Utilitas ─────────────────────────────────────────────
  function timeAgo(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1)  return "Baru saja";
    if (m < 60) return m + " menit lalu";
    if (h < 24) return h + " jam lalu";
    if (d < 7)  return d + " hari lalu";
    return new Date(ts).toLocaleDateString("id-ID", { day:"numeric", month:"short" });
  }
  function escHtml(str) {
    return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  // ── Init ─────────────────────────────────────────────────
  function init() {
    injectStyles();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", injectPanel);
    } else {
      setTimeout(injectPanel, 100);
    }
  }

  init();

})();

// ===== SVG optimizer =====
// Tool SVG Optimizer and its dynamically added card.

(function () {

  // ── Style ───────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById("svg-opt-style")) return;
    const s = document.createElement("style");
    s.id = "svg-opt-style";
    s.textContent = `
      #svg-opt-overlay {
        position: fixed; inset: 0; z-index: 99995;
        background: rgba(8,8,15,0.80);
        backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        padding: 24px; opacity: 0; visibility: hidden;
        transition: opacity 0.25s ease, visibility 0.25s ease;
      }
      #svg-opt-overlay.show { opacity: 1; visibility: visible; }

      #svg-opt-card {
        background: #13132a;
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 20px; padding: 28px;
        width: 100%; max-width: 620px;
        max-height: 90vh; overflow-y: auto;
        box-shadow: 0 32px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(124,106,255,0.12);
        transform: scale(0.92) translateY(16px);
        transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
        position: relative;
      }
      #svg-opt-overlay.show #svg-opt-card { transform: scale(1) translateY(0); }

      #svg-opt-card::before {
        content: '';
        position: absolute; top: -1px; left: 20%; right: 20%; height: 1px;
        background: linear-gradient(90deg, transparent, rgba(124,106,255,0.6), transparent);
      }

      .svg-opt-header {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 20px;
      }
      .svg-opt-title {
        font-family: var(--font-head, 'Syne', sans-serif);
        font-size: 18px; font-weight: 700; color: var(--text, #eeedf8);
        letter-spacing: -0.02em; display: flex; align-items: center; gap: 10px;
      }
      .svg-opt-close {
        background: none; border: none; color: var(--text3, #4a4962);
        font-size: 18px; cursor: pointer; padding: 4px 8px;
        border-radius: 6px; transition: all 0.18s ease;
      }
      .svg-opt-close:hover { color: var(--text, #eeedf8); background: rgba(255,255,255,0.06); }

      /* Upload */
      .svg-upload-zone {
        border: 2px dashed var(--border2, rgba(255,255,255,0.13));
        border-radius: 12px; padding: 32px 20px; text-align: center;
        cursor: pointer; transition: all 0.18s ease; margin-bottom: 20px;
      }
      .svg-upload-zone:hover, .svg-upload-zone.drag-over {
        border-color: var(--accent, #7c6aff);
        background: rgba(124,106,255,0.05);
      }
      .svg-upload-zone .uz-icon { font-size: 32px; margin-bottom: 8px; }
      .svg-upload-zone strong { font-size: 14px; color: var(--text, #eeedf8); display: block; margin-bottom: 4px; }
      .svg-upload-zone p { font-size: 12px; color: var(--text2, #8887a4); }

      /* Options */
      .svg-opt-options {
        background: var(--bg3, #16162a);
        border: 1px solid var(--border, rgba(255,255,255,0.07));
        border-radius: 10px; padding: 4px 16px; margin-bottom: 16px;
      }
      .svg-opt-row {
        display: flex; align-items: center; justify-content: space-between;
        padding: 11px 0; border-bottom: 1px solid var(--border, rgba(255,255,255,0.07));
        gap: 12px;
      }
      .svg-opt-row:last-child { border: none; }
      .svg-opt-row-label { font-size: 13px; font-weight: 500; color: var(--text, #eeedf8); }
      .svg-opt-row-desc  { font-size: 11px; color: var(--text2, #8887a4); margin-top: 2px; }

      /* Stats setelah optimize */
      .svg-stats {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
        margin-bottom: 16px; display: none;
      }
      .svg-stats.show { display: grid; }
      .svg-stat-card {
        background: var(--surface, #1c1c30);
        border: 1px solid var(--border, rgba(255,255,255,0.07));
        border-radius: 10px; padding: 14px 12px; text-align: center;
      }
      .svg-stat-val {
        font-family: var(--font-head, 'Syne', sans-serif);
        font-size: 20px; font-weight: 700; color: var(--text, #eeedf8);
        margin-bottom: 3px;
      }
      .svg-stat-val.green { color: var(--teal, #00d4a8); }
      .svg-stat-val.accent { color: var(--accent2, #b8abff); }
      .svg-stat-lbl { font-size: 11px; color: var(--text3, #4a4962); }

      /* Preview split */
      .svg-preview-wrap {
        display: none; gap: 12px; margin-bottom: 16px;
      }
      .svg-preview-wrap.show { display: grid; grid-template-columns: 1fr 1fr; }
      .svg-preview-box {
        background: #fff;
        border-radius: 10px; padding: 12px;
        display: flex; align-items: center; justify-content: center;
        min-height: 140px; border: 1px solid var(--border2, rgba(255,255,255,0.13));
        position: relative;
      }
      .svg-preview-box svg { max-width: 100%; max-height: 140px; }
      .svg-preview-label {
        position: absolute; top: 8px; left: 8px;
        font-size: 10px; font-weight: 600;
        background: rgba(0,0,0,0.6); color: #fff;
        padding: 2px 7px; border-radius: 4px;
      }
      .svg-preview-box.error-preview {
        background: rgba(255,107,107,0.06);
        border-color: rgba(255,107,107,0.25);
        color: var(--danger, #ff6b6b); font-size: 12px; text-align: center;
      }

      /* Code diff */
      .svg-code-preview {
        background: var(--bg, #08080f);
        border: 1px solid var(--border2, rgba(255,255,255,0.13));
        border-radius: 8px; padding: 12px;
        font-family: var(--font-mono, monospace); font-size: 10.5px;
        color: var(--text2, #8887a4); line-height: 1.6;
        max-height: 140px; overflow-y: auto;
        margin-bottom: 16px; display: none; white-space: pre-wrap; word-break: break-all;
      }
      .svg-code-preview.show { display: block; }

      /* Actions */
      .svg-opt-actions { display: flex; gap: 10px; }
      .svg-btn-cancel {
        padding: 10px 18px; border-radius: 9px;
        border: 1px solid rgba(255,255,255,0.10);
        background: transparent; color: var(--text2, #8887a4);
        font-family: var(--font-body, sans-serif); font-size: 13.5px; font-weight: 500;
        cursor: pointer; transition: all 0.18s ease;
      }
      .svg-btn-cancel:hover { background: rgba(255,255,255,0.06); color: var(--text, #eeedf8); }
      .svg-btn-optimize {
        flex: 1; padding: 10px 18px; border-radius: 9px; border: none;
        background: var(--accent, #7c6aff); color: #fff;
        font-family: var(--font-body, sans-serif); font-size: 13.5px; font-weight: 600;
        cursor: pointer; transition: all 0.2s ease;
        box-shadow: 0 4px 16px rgba(124,106,255,0.3);
      }
      .svg-btn-optimize:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
      .svg-btn-optimize:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
      .svg-btn-dl {
        padding: 10px 18px; border-radius: 9px; border: none;
        background: rgba(0,212,168,0.12);
        border: 1px solid rgba(0,212,168,0.25);
        color: var(--teal, #00d4a8);
        font-family: var(--font-body, sans-serif); font-size: 13.5px; font-weight: 600;
        cursor: pointer; transition: all 0.18s ease; display: none;
      }
      .svg-btn-dl:hover { background: rgba(0,212,168,0.2); }
      .svg-btn-dl.show { display: block; }

      @media (max-width: 600px) {
        #svg-opt-card { padding: 20px 16px; border-radius: 16px; }
        .svg-preview-wrap.show { grid-template-columns: 1fr; }
        .svg-stats.show { grid-template-columns: repeat(3,1fr); gap: 6px; }
        .svg-stat-val { font-size: 16px; }
      }
    `;
    document.head.appendChild(s);
  }

  // ── State ───────────────────────────────────────────────
  let svgOriginal   = "";
  let svgOptimized  = "";
  let svgFilename   = "optimized.svg";

  // ── Inject modal ─────────────────────────────────────────
  function injectModal() {
    if (document.getElementById("svg-opt-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "svg-opt-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.innerHTML = `
      <div id="svg-opt-card">
        <div class="svg-opt-header">
          <h2 class="svg-opt-title">
            <span style="font-size:22px">🎯</span> SVG Optimizer
          </h2>
          <button class="svg-opt-close" onclick="window.svgOptClose()">✕</button>
        </div>

        <!-- Upload zone -->
        <div class="svg-upload-zone" id="svg-upload-zone"
          onclick="document.getElementById('svg-file-input').click()">
          <div class="uz-icon">📄</div>
          <strong>Klik atau seret file SVG ke sini</strong>
          <p>Hanya file .svg yang didukung</p>
          <input type="file" id="svg-file-input" accept=".svg,image/svg+xml" style="display:none"
            onchange="window.svgOptLoad(this.files[0])" />
        </div>

        <!-- Info file -->
        <div id="svg-file-info" style="display:none;margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg3);border:1px solid var(--border);border-radius:9px">
            <span style="font-size:20px">📄</span>
            <div style="flex:1;min-width:0">
              <p id="svg-fname" style="font-size:13px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></p>
              <p id="svg-fsize" style="font-size:11px;color:var(--text3);margin-top:1px"></p>
            </div>
            <button onclick="window.svgOptReset()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:4px 6px">✕</button>
          </div>
        </div>

        <!-- Options -->
        <div class="svg-opt-options" id="svg-opt-options">
          <div class="svg-opt-row">
            <div>
              <p class="svg-opt-row-label">Hapus komentar</p>
              <p class="svg-opt-row-desc"><!-- komentar --> dihapus dari SVG</p>
            </div>
            <label class="toggle"><input type="checkbox" id="opt-comments" checked /><span class="toggle-track"></span></label>
          </div>
          <div class="svg-opt-row">
            <div>
              <p class="svg-opt-row-label">Hapus metadata</p>
              <p class="svg-opt-row-desc">Tag &lt;metadata&gt;, &lt;title&gt;, &lt;desc&gt; dihapus</p>
            </div>
            <label class="toggle"><input type="checkbox" id="opt-metadata" checked /><span class="toggle-track"></span></label>
          </div>
          <div class="svg-opt-row">
            <div>
              <p class="svg-opt-row-label">Hapus atribut editor</p>
              <p class="svg-opt-row-desc">Atribut Inkscape, Illustrator, Sketch dihapus</p>
            </div>
            <label class="toggle"><input type="checkbox" id="opt-editor-attrs" checked /><span class="toggle-track"></span></label>
          </div>
          <div class="svg-opt-row">
            <div>
              <p class="svg-opt-row-label">Hapus group kosong</p>
              <p class="svg-opt-row-desc">Tag &lt;g&gt; tanpa konten atau transformasi dihapus</p>
            </div>
            <label class="toggle"><input type="checkbox" id="opt-empty-groups" checked /><span class="toggle-track"></span></label>
          </div>
          <div class="svg-opt-row">
            <div>
              <p class="svg-opt-row-label">Minifikasi angka</p>
              <p class="svg-opt-row-desc">0.50000 → .5 — persingkat angka desimal</p>
            </div>
            <label class="toggle"><input type="checkbox" id="opt-numbers" checked /><span class="toggle-track"></span></label>
          </div>
          <div class="svg-opt-row">
            <div>
              <p class="svg-opt-row-label">Hapus whitespace berlebih</p>
              <p class="svg-opt-row-desc">Spasi & newline tidak perlu dihapus</p>
            </div>
            <label class="toggle"><input type="checkbox" id="opt-whitespace" checked /><span class="toggle-track"></span></label>
          </div>
          <div class="svg-opt-row">
            <div>
              <p class="svg-opt-row-label">Persingkat warna hex</p>
              <p class="svg-opt-row-desc">#ffffff → #fff, #000000 → #000</p>
            </div>
            <label class="toggle"><input type="checkbox" id="opt-colors" checked /><span class="toggle-track"></span></label>
          </div>
          <div class="svg-opt-row">
            <div>
              <p class="svg-opt-row-label">Hapus style default</p>
              <p class="svg-opt-row-desc">Atribut yang sama dengan nilai default SVG dihapus</p>
            </div>
            <label class="toggle"><input type="checkbox" id="opt-defaults" checked /><span class="toggle-track"></span></label>
          </div>
        </div>

        <!-- Stats -->
        <div class="svg-stats" id="svg-stats">
          <div class="svg-stat-card">
            <div class="svg-stat-val" id="stat-original-size">—</div>
            <div class="svg-stat-lbl">Ukuran asli</div>
          </div>
          <div class="svg-stat-card">
            <div class="svg-stat-val green" id="stat-optimized-size">—</div>
            <div class="svg-stat-lbl">Setelah optimasi</div>
          </div>
          <div class="svg-stat-card">
            <div class="svg-stat-val accent" id="stat-saved">—</div>
            <div class="svg-stat-lbl">Ukuran berkurang</div>
          </div>
        </div>

        <!-- Preview -->
        <div class="svg-preview-wrap" id="svg-preview-wrap">
          <div class="svg-preview-box" id="svg-preview-before">
            <span class="svg-preview-label">Sebelum</span>
          </div>
          <div class="svg-preview-box" id="svg-preview-after">
            <span class="svg-preview-label">Sesudah</span>
          </div>
        </div>

        <!-- Code preview -->
        <div class="svg-code-preview" id="svg-code-preview"></div>

        <!-- Actions -->
        <div class="svg-opt-actions">
          <button class="svg-btn-cancel" onclick="window.svgOptClose()">Batal</button>
          <button class="svg-btn-optimize" id="svg-btn-optimize" onclick="window.svgOptRun()" disabled>
            🎯 Optimasi SVG
          </button>
          <button class="svg-btn-dl" id="svg-btn-dl" onclick="window.svgOptDownload()">
            ⬇ Unduh SVG
          </button>
        </div>
      </div>
    `;

    overlay.addEventListener("click", (e) => { if (e.target === overlay) window.svgOptClose(); });
    document.body.appendChild(overlay);

    // Drag drop
    const uz = document.getElementById("svg-upload-zone");
    uz.addEventListener("dragover",  e => { e.preventDefault(); uz.classList.add("drag-over"); });
    uz.addEventListener("dragleave", () => uz.classList.remove("drag-over"));
    uz.addEventListener("drop", e => {
      e.preventDefault(); uz.classList.remove("drag-over");
      const f = e.dataTransfer?.files?.[0];
      if (f) window.svgOptLoad(f);
    });
  }

  // ── Load file ────────────────────────────────────────────
  window.svgOptLoad = function(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".svg") && file.type !== "image/svg+xml") {
      if (typeof showToast === "function") showToast("Hanya file .svg yang didukung", "error");
      return;
    }

    svgFilename = file.name.replace(/\.svg$/i, "") + "_optimized.svg";
    const reader = new FileReader();
    reader.onload = (e) => {
      svgOriginal  = e.target.result;
      svgOptimized = "";

      document.getElementById("svg-upload-zone").style.display = "none";
      document.getElementById("svg-file-info").style.display   = "block";
      document.getElementById("svg-fname").textContent = file.name;
      document.getElementById("svg-fsize").textContent = fmtSize(file.size) + " · " + svgOriginal.length + " karakter";

      document.getElementById("svg-stats").classList.remove("show");
      document.getElementById("svg-preview-wrap").classList.remove("show");
      document.getElementById("svg-code-preview").classList.remove("show");
      document.getElementById("svg-btn-dl").classList.remove("show");
      document.getElementById("svg-btn-optimize").disabled = false;
      document.getElementById("svg-btn-optimize").textContent = "🎯 Optimasi SVG";
    };
    reader.readAsText(file, "utf-8");
  };

  // ── Reset ────────────────────────────────────────────────
  window.svgOptReset = function() {
    svgOriginal = svgOptimized = "";
    document.getElementById("svg-upload-zone").style.display = "block";
    document.getElementById("svg-file-info").style.display   = "none";
    document.getElementById("svg-stats").classList.remove("show");
    document.getElementById("svg-preview-wrap").classList.remove("show");
    document.getElementById("svg-code-preview").classList.remove("show");
    document.getElementById("svg-btn-dl").classList.remove("show");
    document.getElementById("svg-btn-optimize").disabled = true;
    document.getElementById("svg-file-input").value = "";
  };

  // ── Run optimizer ────────────────────────────────────────
  window.svgOptRun = function() {
    if (!svgOriginal) return;

    const opts = {
      removeComments:   document.getElementById("opt-comments")?.checked    ?? true,
      removeMetadata:   document.getElementById("opt-metadata")?.checked    ?? true,
      removeEditorAttrs:document.getElementById("opt-editor-attrs")?.checked ?? true,
      removeEmptyGroups:document.getElementById("opt-empty-groups")?.checked ?? true,
      minifyNumbers:    document.getElementById("opt-numbers")?.checked      ?? true,
      removeWhitespace: document.getElementById("opt-whitespace")?.checked   ?? true,
      shortenColors:    document.getElementById("opt-colors")?.checked       ?? true,
      removeDefaults:   document.getElementById("opt-defaults")?.checked     ?? true,
    };

    const btn = document.getElementById("svg-btn-optimize");
    btn.disabled = true;
    btn.textContent = "⏳ Mengoptimasi...";

    setTimeout(() => {
      try {
        svgOptimized = optimizeSVG(svgOriginal, opts);
        showSVGResults();
        btn.textContent = "✓ Dioptimasi — Jalankan Ulang";
        btn.disabled = false;
      } catch(e) {
        if (typeof showToast === "function") showToast("Gagal: " + e.message, "error");
        btn.disabled = false;
        btn.textContent = "🎯 Optimasi SVG";
      }
    }, 50);
  };

  // ── Core optimizer — pure JS, tanpa library ──────────────
  function optimizeSVG(svg, opts) {
    let out = svg;

    // 1. Hapus komentar
    if (opts.removeComments) {
      out = out.replace(/<!--[\s\S]*?-->/g, "");
    }

    // 2. Hapus metadata, title, desc
    if (opts.removeMetadata) {
      out = out.replace(/<metadata[\s\S]*?<\/metadata>/gi, "");
      out = out.replace(/<title[\s\S]*?<\/title>/gi, "");
      out = out.replace(/<desc[\s\S]*?<\/desc>/gi, "");
    }

    // 3. Hapus atribut editor (Inkscape, Illustrator, Sketch, Adobe)
    if (opts.removeEditorAttrs) {
      // Namespace declarations
      out = out.replace(/\s+xmlns:(inkscape|sodipodi|dc|cc|rdf|xlink|sketch|i)="[^"]*"/gi, "");
      // Atribut dengan prefix
      out = out.replace(/\s+(inkscape|sodipodi|dc|cc|rdf|sketch|i):[a-z-]+=["'][^"']*["']/gi, "");
      // Elemen Inkscape/Sodipodi
      out = out.replace(/<(sodipodi|inkscape):[^>]*\/>/gi, "");
      out = out.replace(/<(sodipodi|inkscape):[\s\S]*?<\/(sodipodi|inkscape):[^>]*>/gi, "");
      // XML processing instructions
      out = out.replace(/<\?[^>]*\?>/g, "");
      // Generator comment (Adobe, Sketch)
      out = out.replace(/generator="[^"]*"/gi, "");
      out = out.replace(/version="[^"]*"/gi, (m) => m); // keep SVG version
    }

    // 4. Hapus group kosong <g></g> atau <g/>
    if (opts.removeEmptyGroups) {
      // Beberapa iterasi untuk nested empty groups
      for (let i = 0; i < 5; i++) {
        const before = out;
        out = out.replace(/<g(\s[^>]*)?\s*>\s*<\/g>/gi, "");
        out = out.replace(/<g(\s[^>]*)?\s*\/>/gi, "");
        if (out === before) break;
      }
    }

    // 5. Minifikasi angka desimal
    if (opts.minifyNumbers) {
      // 0.5 → .5, -0.5 → -.5
      out = out.replace(/(-?)0\.(\d)/g, "$1.$2");
      // Hapus trailing zeros: 1.500 → 1.5, 1.50000 → 1.5
      out = out.replace(/(\d+\.\d*?)0+(?=\D|$)/g, "$1");
      // 1. → 1
      out = out.replace(/(\d+)\.(?=\D|$)/g, "$1");
      // Batasi presisi ke 3 desimal untuk path data
      out = out.replace(/(\d+\.\d{4,})/g, (m) => parseFloat(parseFloat(m).toFixed(3)).toString());
    }

    // 6. Hapus whitespace berlebih
    if (opts.removeWhitespace) {
      // Newline + tabs antara tag
      out = out.replace(/>\s+</g, "><");
      // Spasi berlebih dalam atribut
      out = out.replace(/\s{2,}/g, " ");
      // Spasi di awal/akhir
      out = out.trim();
      // Spasi sebelum />
      out = out.replace(/\s+\/>/g, "/>");
      // Spasi sebelum >
      out = out.replace(/\s+>/g, ">");
    }

    // 7. Persingkat warna hex
    if (opts.shortenColors) {
      // #aabbcc → #abc kalau bisa
      out = out.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3/g, "#$1$2$3");
      // Named colors ke hex pendek yang lebih ringkas
      const colorMap = {
        "black":"#000","white":"#fff","red":"red","green":"green","blue":"blue",
        "#ffffff":"#fff","#000000":"#000","#ff0000":"red","#00ff00":"#0f0","#0000ff":"#00f",
        "#ffff00":"#ff0","#ff00ff":"#f0f","#00ffff":"#0ff",
      };
      Object.entries(colorMap).forEach(([k, v]) => {
        if (k.startsWith("#")) {
          out = out.replace(new RegExp(k.replace("#","\\#"), "gi"), v);
        }
      });
    }

    // 8. Hapus atribut default SVG
    if (opts.removeDefaults) {
      // fill="black" adalah default
      out = out.replace(/\s+fill="black"/gi, "");
      // stroke="none" adalah default
      out = out.replace(/\s+stroke="none"/gi, "");
      // fill-opacity="1" adalah default
      out = out.replace(/\s+fill-opacity="1"/gi, "");
      // opacity="1" adalah default
      out = out.replace(/\s+opacity="1"/gi, "");
      // visibility="visible" adalah default
      out = out.replace(/\s+visibility="visible"/gi, "");
      // display="inline" adalah default
      out = out.replace(/\s+display="inline"/gi, "");
      // overflow="visible" adalah default pada SVG root
      out = out.replace(/\s+overflow="visible"/gi, "");
      // xml:space="preserve" sering tidak diperlukan
      out = out.replace(/\s+xml:space="preserve"/gi, "");
    }

    return out;
  }

  // ── Tampilkan hasil ──────────────────────────────────────
  function showSVGResults() {
    const origSize = new Blob([svgOriginal]).size;
    const optSize  = new Blob([svgOptimized]).size;
    const saved    = Math.round((1 - optSize / origSize) * 100);

    // Stats
    document.getElementById("stat-original-size").textContent  = fmtSize(origSize);
    document.getElementById("stat-optimized-size").textContent = fmtSize(optSize);
    document.getElementById("stat-saved").textContent          = saved + "%";
    document.getElementById("svg-stats").classList.add("show");

    // Preview
    const beforeBox = document.getElementById("svg-preview-before");
    const afterBox  = document.getElementById("svg-preview-after");

    try {
      // Render SVG asli
      const beforeWrap = document.createElement("div");
      beforeWrap.innerHTML = svgOriginal;
      const beforeSvg = beforeWrap.querySelector("svg");
      if (beforeSvg) {
        beforeSvg.style.maxWidth = "100%";
        beforeSvg.style.maxHeight = "130px";
        // Hapus label lama
        while (beforeBox.children.length > 1) beforeBox.removeChild(beforeBox.lastChild);
        beforeBox.appendChild(beforeSvg);
        beforeBox.classList.remove("error-preview");
      }
    } catch(_) {
      beforeBox.classList.add("error-preview");
      beforeBox.innerHTML = "<span class='svg-preview-label'>Sebelum</span>Tidak bisa dirender";
    }

    try {
      // Render SVG optimized
      const afterWrap = document.createElement("div");
      afterWrap.innerHTML = svgOptimized;
      const afterSvg = afterWrap.querySelector("svg");
      if (afterSvg) {
        afterSvg.style.maxWidth = "100%";
        afterSvg.style.maxHeight = "130px";
        while (afterBox.children.length > 1) afterBox.removeChild(afterBox.lastChild);
        afterBox.appendChild(afterSvg);
        afterBox.classList.remove("error-preview");
      }
    } catch(_) {
      afterBox.classList.add("error-preview");
      afterBox.innerHTML = "<span class='svg-preview-label'>Sesudah</span>Tidak bisa dirender";
    }

    document.getElementById("svg-preview-wrap").classList.add("show");

    // Code preview (50 char pertama & terakhir untuk perbandingan)
    const codeEl = document.getElementById("svg-code-preview");
    const preview = svgOptimized.length > 500
      ? svgOptimized.slice(0, 400) + "\n\n... (" + (svgOptimized.length - 400) + " karakter lagi) ...\n\n" + svgOptimized.slice(-100)
      : svgOptimized;
    codeEl.textContent = preview;
    codeEl.classList.add("show");

    // Download button
    document.getElementById("svg-btn-dl").classList.add("show");

    if (typeof showToast === "function") {
      showToast(`SVG dioptimasi! Hemat ${saved}% (${fmtSize(origSize)} → ${fmtSize(optSize)})`);
    }

    // Catat ke riwayat konversi kalau tersedia
    if (typeof window.convHistoryAdd === "function") {
      window.convHistoryAdd(
        "svg_optimizer", "SVG Optimizer", "🎯",
        [{ name: svgFilename, size: origSize }],
        `${fmtSize(origSize)} → ${fmtSize(optSize)} (hemat ${saved}%)`
      );
    }
  }

  // ── Download ─────────────────────────────────────────────
  window.svgOptDownload = function() {
    if (!svgOptimized) return;
    const blob = new Blob([svgOptimized], { type:"image/svg+xml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = svgFilename;
    a.click();
    if (typeof showToast === "function") showToast("SVG diunduh ✓");
  };

  // ── Open / close ─────────────────────────────────────────
  window.svgOptOpen = function() {
    injectStyles();
    injectModal();
    window.svgOptReset();

    const overlay = document.getElementById("svg-opt-overlay");
    if (!overlay) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add("show");
        document.body.style.overflow = "hidden";
      });
    });
  };

  window.svgOptClose = function() {
    const overlay = document.getElementById("svg-opt-overlay");
    if (!overlay) return;
    overlay.classList.remove("show");
    document.body.style.overflow = "";
  };

  // ── Keyboard ─────────────────────────────────────────────
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const overlay = document.getElementById("svg-opt-overlay");
      if (overlay?.classList.contains("show")) window.svgOptClose();
    }
  });

  // ── Inject tool card ke grid converter ──────────────────
  function injectToolCard() {
    // Cari grid dokumen untuk append tool card SVG di sana
    const docGrid = document.getElementById("document-tools-grid");
    if (!docGrid || docGrid.querySelector("[data-toolid='svg_optimizer']")) return;

    const card = document.createElement("div");
    card.className = "tool-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("data-tool", "svg_optimizer");
    card.setAttribute("data-title", "SVG Optimizer");
    card.setAttribute("data-desc", "Perkecil file SVG hapus metadata atribut editor");
    card.setAttribute("data-tags", "svg optimizer optimalkan kecil vektor gambar dokumen");
    card.setAttribute("data-toolid", "svg_optimizer");
    card.innerHTML = `
      <div class="tc-icon">🎯</div>
      <div class="tc-title">SVG Optimizer</div>
      <div class="tc-desc">Perkecil file SVG</div>
    `;
    docGrid.appendChild(card);
  }

  // ── Utilitas ─────────────────────────────────────────────
  function fmtSize(b) {
    if (b < 1024)    return b + " B";
    if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
    return (b / 1048576).toFixed(2) + " MB";
  }

  // ── Init ─────────────────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectToolCard);
  } else {
    setTimeout(injectToolCard, 150);
  }

})();

// ===== Halaman converter =====

// ── Inisialisasi halaman ───────────────────────────────────
initLocalApp();
renderSidebar("converter");
applyGlobalSettings();

document.getElementById("skeleton-screen").hidden = true;
document.getElementById("main-content").hidden = false;

const converterMain = document.getElementById("main-content");
converterMain.addEventListener("change", event => {
  if (event.target.id === "panel-input") handlePanelFiles(event.target.files);
});
converterMain.addEventListener("click", event => {
  const action = event.target.closest("[data-action]");
  if (action) {
    switch (action.dataset.action) {
      case "batch-open": window.batchOpen(); break;
      case "close-tool": closeTool(); break;
      case "process-file": processFile(); break;
      case "clear-files": clearFiles(); break;
    }
    return;
  }

  const tool = event.target.closest(".tool-card[data-tool]");
  if (tool) {
    if (tool.dataset.tool === "svg_optimizer") window.svgOptOpen();
    else openTool(tool.dataset.tool);
  }
});
converterMain.addEventListener("keydown", event => {
  const tool = event.target.closest(".tool-card[data-tool]");
  if (tool && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    if (tool.dataset.tool === "svg_optimizer") window.svgOptOpen();
    else openTool(tool.dataset.tool);
  }
});

// ── State ─────────────────────────────────────────────────
let currentTool   = null;
let uploadedFiles = [];

// ── Definisi semua tool ───────────────────────────────────
/**
 * @typedef {{ title:string, desc:string, icon:string, accept:string, multiple:boolean, hint:string }} ToolDef
 * @type {Record<string, ToolDef>}
 */
const TOOLS = {
  // PDF
  merge:        { title:"Gabung PDF",           desc:"Gabungkan beberapa file PDF menjadi satu",                              icon:"🔗", accept:".pdf",        multiple:true,  hint:"Unggah 2 atau lebih file PDF" },
  split:        { title:"Pisah PDF",             desc:"Pisahkan halaman PDF menjadi file-file terpisah",                       icon:"✂️", accept:".pdf",        multiple:false, hint:"Unggah 1 file PDF" },
  rotate:       { title:"Putar PDF",             desc:"Putar semua halaman PDF",                                               icon:"🔄", accept:".pdf",        multiple:false, hint:"Unggah 1 file PDF" },
  deletepages:  { title:"Hapus Halaman PDF",     desc:"Hapus halaman tertentu dari PDF",                                       icon:"🗑",  accept:".pdf",        multiple:false, hint:"Unggah 1 file PDF" },
  compresspdf:  { title:"Kompres PDF",           desc:"Perkecil ukuran file PDF dengan mengurangi kualitas gambar di dalamnya",icon:"🗜",  accept:".pdf",        multiple:false, hint:"Unggah 1 file PDF" },
  passwordpdf:  { title:"Sandi PDF",             desc:"Lindungi PDF dengan kata sandi enkripsi",                               icon:"🔐", accept:".pdf",        multiple:false, hint:"Unggah 1 file PDF" },
  pdf2txt:      { title:"PDF ke Teks",           desc:"Ekstrak semua teks dari file PDF",                                      icon:"📑", accept:".pdf",        multiple:false, hint:"Unggah 1 file PDF (teks harus bisa disorot)" },
  img2pdf:      { title:"Gambar ke PDF",         desc:"Susun beberapa gambar menjadi dokumen PDF",                             icon:"🖼",  accept:"image/*",     multiple:true,  hint:"Unggah satu atau beberapa gambar (JPG, PNG, WEBP)" },
  pdf2img:      { title:"PDF ke JPG",            desc:"Setiap halaman PDF dikonversi menjadi gambar JPG",                      icon:"📄", accept:".pdf",        multiple:false, hint:"Unggah 1 file PDF" },
  // Gambar
  imgconvert:   { title:"Konversi Format",       desc:"Ubah format gambar JPG ↔ PNG ↔ WEBP",                                  icon:"🔁", accept:"image/*",     multiple:false, hint:"Unggah 1 file gambar" },
  compress:     { title:"Kompres Gambar",        desc:"Perkecil ukuran file tanpa banyak kehilangan kualitas",                 icon:"🗜",  accept:"image/*",     multiple:false, hint:"Unggah 1 file gambar" },
  resize:       { title:"Ubah Ukuran Gambar",    desc:"Ubah dimensi (lebar × tinggi) gambar",                                  icon:"📐", accept:"image/*",     multiple:false, hint:"Unggah 1 file gambar" },
  crop:         { title:"Potong Gambar",         desc:"Potong area gambar secara visual",                                      icon:"✂️", accept:"image/*",     multiple:false, hint:"Unggah 1 file gambar" },
  rotate_img:   { title:"Putar / Balik",         desc:"Putar atau mirror gambar",                                              icon:"🔄", accept:"image/*",     multiple:false, hint:"Unggah 1 file gambar" },
  adjust:       { title:"Sesuaikan Gambar",      desc:"Ubah kecerahan, kontras, dan saturasi",                                 icon:"🎛",  accept:"image/*",     multiple:false, hint:"Unggah 1 file gambar" },
  grayscale:    { title:"Skala Abu-abu",         desc:"Ubah gambar berwarna menjadi hitam putih",                              icon:"🎨", accept:"image/*",     multiple:false, hint:"Unggah 1 file gambar" },
  exif:         { title:"Penampil EXIF",         desc:"Lihat metadata foto dan hapus untuk privasi",                           icon:"📋", accept:"image/jpeg,image/jpg", multiple:false, hint:"Unggah 1 file gambar JPG" },
  base64img:    { title:"Gambar → Base64",       desc:"Encode gambar menjadi string Base64 untuk embed HTML",                  icon:"🔤", accept:"image/*",     multiple:false, hint:"Unggah 1 file gambar" },
  ascii:        { title:"Seni ASCII",            desc:"Ubah gambar menjadi karakter teks ASCII yang bisa disalin atau diunduh",icon:"🎨", accept:"image/*",     multiple:false, hint:"Unggah 1 file gambar tanpa background (JPG, PNG, WEBP)" },
  // Dokumen
  md2html:      { title:"Markdown → HTML",       desc:"Konversi file .md menjadi halaman HTML siap pakai",                    icon:"📝", accept:".md,.txt",    multiple:false, hint:"Unggah file .md atau .txt berisi Markdown" },
  csv2json:     { title:"CSV ↔ JSON",            desc:"Konversi data CSV ke JSON atau sebaliknya",                             icon:"📊", accept:".csv,.json",  multiple:false, hint:"Unggah file .csv atau .json" },
};

// ── Opsi HTML per tool ────────────────────────────────────
const TOOL_OPTIONS = {
  split: `
    <div class="option-row">
      <div><p class="opt-label">Mode pisah</p></div>
      <div class="format-pills">
        <label class="format-pill"><input type="radio" name="split-mode" value="all" checked /> Semua halaman</label>
        <label class="format-pill"><input type="radio" name="split-mode" value="range" /> Rentang</label>
      </div>
    </div>
    <div id="split-range-row" style="display:none" class="option-row">
      <div><p class="opt-label">Halaman (contoh: 1-3, 5, 7-9)</p></div>
      <input type="text" id="split-range" class="form-input" placeholder="1-3, 5" style="max-width:180px"
        maxlength="50" oninput="this.value=this.value.replace(/[^0-9,\- ]/g,'')" />
    </div>`,

  rotate: `
    <div class="option-row">
      <div><p class="opt-label">Arah rotasi</p></div>
      <div class="format-pills">
        <label class="format-pill"><input type="radio" name="rot-deg" value="90" checked /> 90° ↻</label>
        <label class="format-pill"><input type="radio" name="rot-deg" value="180" /> 180°</label>
        <label class="format-pill"><input type="radio" name="rot-deg" value="270" /> 90° ↺</label>
      </div>
    </div>`,

  deletepages: `
    <div class="option-row">
      <div><p class="opt-label">Halaman yang dihapus</p><p class="opt-desc">contoh: 2, 4-6, 8</p></div>
      <input type="text" id="del-pages" class="form-input" placeholder="2, 4-6, 8" style="max-width:180px"
        maxlength="50" oninput="this.value=this.value.replace(/[^0-9,\- ]/g,'')" />
    </div>`,

  compresspdf: `
    <div class="option-row">
      <div><p class="opt-label">Level kompresi</p><p class="opt-desc">Memengaruhi kualitas gambar di dalam PDF</p></div>
      <div class="format-pills">
        <label class="format-pill"><input type="radio" name="pdf-compress" value="low" /> Ringan</label>
        <label class="format-pill"><input type="radio" name="pdf-compress" value="med" checked /> Sedang</label>
        <label class="format-pill"><input type="radio" name="pdf-compress" value="high" /> Agresif</label>
      </div>
    </div>`,

  passwordpdf: `
    <div class="option-row">
      <div><p class="opt-label">Kata Sandi</p><p class="opt-desc">Minimal 4 karakter</p></div>
      <input type="password" id="pdf-password" class="form-input" placeholder="Masukkan sandi..."
        style="max-width:200px" maxlength="100" />
    </div>
    <div class="option-row">
      <div><p class="opt-label">Konfirmasi Sandi</p></div>
      <input type="password" id="pdf-password2" class="form-input" placeholder="Ulangi sandi..."
        style="max-width:200px" maxlength="100" />
    </div>`,

  img2pdf: `
    <div class="option-row">
      <div><p class="opt-label">Ukuran halaman</p></div>
      <div class="format-pills">
        <label class="format-pill"><input type="radio" name="pdf-page" value="fit" checked /> Sesuai gambar</label>
        <label class="format-pill"><input type="radio" name="pdf-page" value="a4" /> A4</label>
      </div>
    </div>`,

  pdf2img: `
    <div class="option-row">
      <div><p class="opt-label">Kualitas render</p></div>
      <div class="format-pills">
        <label class="format-pill"><input type="radio" name="pdf-scale" value="1.5" /> Normal</label>
        <label class="format-pill"><input type="radio" name="pdf-scale" value="2" checked /> HD</label>
        <label class="format-pill"><input type="radio" name="pdf-scale" value="3" /> Full HD</label>
      </div>
    </div>`,

  imgconvert: `
    <div class="option-row">
      <div><p class="opt-label">Konversi ke format</p></div>
      <div class="format-pills">
        <label class="format-pill"><input type="radio" name="imgfmt" value="image/png" checked /> PNG</label>
        <label class="format-pill"><input type="radio" name="imgfmt" value="image/jpeg" /> JPG</label>
        <label class="format-pill"><input type="radio" name="imgfmt" value="image/webp" /> WEBP</label>
      </div>
    </div>`,

  compress: `
    <div class="option-row">
      <div><p class="opt-label">Kualitas: <span id="cq-val">72</span>%</p><p class="opt-desc">Makin kecil = ukuran file makin kecil</p></div>
      <input type="range" id="compress-quality" min="10" max="95" value="72" class="slider" style="width:140px"
        oninput="document.getElementById('cq-val').textContent=this.value" />
    </div>`,

  resize: `
    <div class="option-row">
      <div><p class="opt-label">Lebar (px)</p></div>
      <input type="number" id="resize-w" class="form-input" placeholder="contoh 800" style="max-width:120px" min="1" max="10000" />
    </div>
    <div class="option-row">
      <div><p class="opt-label">Tinggi (px)</p><p class="opt-desc">Kosongkan = jaga rasio otomatis</p></div>
      <input type="number" id="resize-h" class="form-input" placeholder="otomatis" style="max-width:120px" min="1" max="10000" />
    </div>`,

  crop: `
    <div class="option-row" style="border:none;flex-direction:column;align-items:flex-start;gap:8px">
      <p class="opt-label">Seret area di atas gambar untuk memilih area potong</p>
      <p class="opt-desc" id="crop-coords-label">Belum ada seleksi</p>
      <div id="crop-wrap" style="display:none">
        <img id="crop-img" src="" alt="Gambar untuk dipotong" draggable="false" />
        <div id="crop-select"></div>
      </div>
    </div>`,

  rotate_img: `
    <div class="option-row">
      <div><p class="opt-label">Rotasi</p></div>
      <div class="format-pills">
        <label class="format-pill"><input type="radio" name="ri-rot" value="90" checked /> 90° ↻</label>
        <label class="format-pill"><input type="radio" name="ri-rot" value="180" /> 180°</label>
        <label class="format-pill"><input type="radio" name="ri-rot" value="270" /> 90° ↺</label>
      </div>
    </div>
    <div class="option-row">
      <div><p class="opt-label">Balik / Mirror</p></div>
      <div class="format-pills">
        <label class="format-pill"><input type="radio" name="ri-flip" value="none" checked /> Tidak</label>
        <label class="format-pill"><input type="radio" name="ri-flip" value="h" /> Horizontal</label>
        <label class="format-pill"><input type="radio" name="ri-flip" value="v" /> Vertikal</label>
      </div>
    </div>`,

  adjust: `
    <div class="adjust-grid" style="margin-top:4px">
      <div class="adjust-row">
        <label>☀️ Kecerahan</label>
        <input type="range" id="adj-brightness" min="-100" max="100" value="0" class="slider"
          oninput="document.getElementById('adj-br-val').textContent=this.value;previewAdjust()" />
        <span id="adj-br-val">0</span>
      </div>
      <div class="adjust-row">
        <label>🎚 Kontras</label>
        <input type="range" id="adj-contrast" min="-100" max="100" value="0" class="slider"
          oninput="document.getElementById('adj-ct-val').textContent=this.value;previewAdjust()" />
        <span id="adj-ct-val">0</span>
      </div>
      <div class="adjust-row">
        <label>🌈 Saturasi</label>
        <input type="range" id="adj-saturation" min="-100" max="100" value="0" class="slider"
          oninput="document.getElementById('adj-st-val').textContent=this.value;previewAdjust()" />
        <span id="adj-st-val">0</span>
      </div>
    </div>
    <div id="adjust-preview-wrap" style="display:none;margin-top:12px">
      <canvas id="adjust-preview-canvas" style="max-width:100%;border-radius:8px;border:1px solid var(--border2)"></canvas>
    </div>`,

  csv2json: `
    <div class="option-row">
      <div><p class="opt-label">Mode konversi</p><p class="opt-desc">Terdeteksi otomatis dari ekstensi file</p></div>
      <div class="format-pills">
        <label class="format-pill"><input type="radio" name="cj-mode" value="auto" checked /> Otomatis</label>
        <label class="format-pill"><input type="radio" name="cj-mode" value="csv2json" /> CSV → JSON</label>
        <label class="format-pill"><input type="radio" name="cj-mode" value="json2csv" /> JSON → CSV</label>
      </div>
    </div>`,

  ascii: `
    <div class="option-row">
      <div><p class="opt-label">Lebar: <span id="ascii-width-val">80</span> kolom</p></div>
      <input type="range" id="ascii-width" min="40" max="200" value="80" class="slider" style="width:140px"
        oninput="document.getElementById('ascii-width-val').textContent=this.value" />
    </div>
    <div class="option-row">
      <div><p class="opt-label">Set karakter</p></div>
      <div class="format-pills">
        <label class="format-pill"><input type="radio" name="ascii-charset" value="detailed" checked /> Detail</label>
        <label class="format-pill"><input type="radio" name="ascii-charset" value="simple" /> Simpel</label>
        <label class="format-pill"><input type="radio" name="ascii-charset" value="blocks" /> Blok</label>
        <label class="format-pill"><input type="radio" name="ascii-charset" value="emoji" /> Emoji</label>
      </div>
    </div>
    <div class="option-row">
      <div><p class="opt-label">Mode warna</p></div>
      <div class="format-pills">
        <label class="format-pill"><input type="radio" name="ascii-color" value="bw" checked /> Hitam putih</label>
        <label class="format-pill"><input type="radio" name="ascii-color" value="color" /> Berwarna</label>
      </div>
    </div>
    <div class="option-row" style="border:none">
      <div><p class="opt-label">Balik warna</p><p class="opt-desc">Cocok untuk latar gelap</p></div>
      <label class="toggle"><input type="checkbox" id="ascii-invert" /><span class="toggle-track"></span></label>
    </div>
    <div id="ascii-result-wrap" style="display:none;margin-top:12px">
      <pre id="ascii-output-pre" style="font-family:var(--font-mono);font-size:7px;line-height:1.1;overflow-x:auto;white-space:pre;color:var(--text);background:var(--bg);padding:12px;border-radius:8px;max-height:400px;overflow-y:auto"></pre>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="btn btn-secondary" onclick="asciiCopyWA()" style="font-size:12px;padding:6px 12px">📱 Salin untuk WA</button>
        <button class="btn btn-secondary" onclick="asciiCopy()" style="font-size:12px;padding:6px 12px">📋 Salin Teks</button>
      </div>
    </div>`,
};

// ── Open / close tool panel ───────────────────────────────
function openTool(id) {
  currentTool   = id;
  uploadedFiles = [];
  const t = TOOLS[id];

  document.getElementById("tool-grid-section").style.display = "none";
  document.getElementById("panel-title").textContent         = t.title;
  document.getElementById("panel-desc").textContent          = t.desc;
  document.getElementById("panel-upload-icon").textContent   = t.icon;
  document.getElementById("panel-upload-hint").textContent   = t.hint;
  document.getElementById("panel-input").accept              = t.accept;
  document.getElementById("panel-input").multiple            = t.multiple;
  document.getElementById("panel-input").value               = "";
  document.getElementById("file-list").innerHTML             = "";
  document.getElementById("tool-options").innerHTML          = TOOL_OPTIONS[id] || "";
  document.getElementById("btn-process").disabled            = true;
  document.getElementById("btn-clear").style.display         = "none";
  document.getElementById("result-box").classList.remove("show");
  document.getElementById("progress-bar").style.display      = "none";
  document.getElementById("panel-dropzone").style.display    = "block";
  document.getElementById("img-source-preview-wrap").style.display = "none";
  document.getElementById("tool-panel").classList.add("show");

  // ── Catat aktivitas ──
  _trackActivity(id);

  if (id === "split") {
    document.querySelectorAll('input[name="split-mode"]').forEach(r => {
      r.addEventListener("change", () => {
        document.getElementById("split-range-row").style.display =
          (r.value === "range" && r.checked) ? "flex" : "none";
      });
    });
  }
}

function closeTool() {
  currentTool   = null;
  uploadedFiles = [];
  document.getElementById("tool-panel").classList.remove("show");
  document.getElementById("tool-grid-section").style.display = "block";
}

// ── Tracking aktivitas ────────────────────────────────────
const ACTIVITY_KEY  = STORAGE_KEYS.ACTIVITY;
const PROCESSED_KEY = STORAGE_KEYS.PROCESSED;
const MAX_ACTIVITY  = 10;

function _trackActivity(toolId) {
  const t = TOOLS[toolId];
  if (!t) return;

  const pdfTools   = ["merge","split","rotate","deletepages","compresspdf","passwordpdf","pdf2txt","img2pdf","pdf2img"];
  const imageTools = ["imgconvert","compress","resize","crop","rotate_img","adjust","grayscale","exif","base64img","ascii"];
  let cat = "Dokumen";
  if (pdfTools.includes(toolId))   cat = "PDF";
  if (imageTools.includes(toolId)) cat = "Gambar";

  const entry = { tool: t.title, icon: t.icon, cat, time: Date.now() };

  let log = [];
  try { log = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]"); } catch(_) {}
  log = log.filter(l => l.tool !== entry.tool);
  log.unshift(entry);
  if (log.length > MAX_ACTIVITY) log = log.slice(0, MAX_ACTIVITY);
  try { localStorage.setItem(ACTIVITY_KEY, JSON.stringify(log)); } catch(_) {}

  const total = parseInt(localStorage.getItem(PROCESSED_KEY) || "0") + 1;
  try { localStorage.setItem(PROCESSED_KEY, total); } catch(_) {}
}

// ── Drag & drop feedback ──────────────────────────────────
function _initDragDropFeedback() {
  const dz = document.getElementById("panel-dropzone");
  if (!dz) return;

  let dragCounter = 0;

  dz.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragCounter === 1) {
      const items  = e.dataTransfer?.items;
      const t      = currentTool ? TOOLS[currentTool] : null;
      let isValid  = true;

      if (items && t) {
        const accept = t.accept;
        isValid = [...items].every(item => {
          if (item.kind !== "file") return false;
          if (accept.includes("image/*")) return item.type.startsWith("image/");
          if (accept.includes(".pdf"))    return item.type === "application/pdf";
          return true;
        });
      }

      if (!isValid) {
        dz.classList.add("drag-invalid");
        _showDragError(dz, `Format tidak didukung. Tool ini menerima: ${t?.accept || "file"}`);
      } else {
        dz.classList.add("drag-over");
        _removeDragError(dz);
      }
    }
  });

  dz.addEventListener("dragleave", () => {
    dragCounter--;
    if (dragCounter === 0) {
      dz.classList.remove("drag-over", "drag-invalid");
      _removeDragError(dz);
    }
  });

  dz.addEventListener("dragover", (e) => { e.preventDefault(); });

  dz.addEventListener("drop", (e) => {
    e.preventDefault();
    dragCounter = 0;
    dz.classList.remove("drag-over", "drag-invalid");
    _removeDragError(dz);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const t = currentTool ? TOOLS[currentTool] : null;
    if (t) {
      const accept  = t.accept;
      const invalid = [...files].some(f => {
        if (accept.includes("image/*")) return !f.type.startsWith("image/");
        if (accept.includes(".pdf"))    return f.type !== "application/pdf";
        return false;
      });

      if (invalid) {
        dz.classList.add("drag-invalid");
        _showDragError(dz, `File tidak sesuai. Diperlukan: ${accept}`);
        setTimeout(() => { dz.classList.remove("drag-invalid"); _removeDragError(dz); }, 2000);
        showToast("Format file tidak sesuai tool ini", "error");
        return;
      }
    }

    dz.classList.add("drop-success");
    setTimeout(() => dz.classList.remove("drop-success"), 600);
    handlePanelFiles(files);
  });
}

function _showDragError(dz, msg) {
  _removeDragError(dz);
  const el = document.createElement("div");
  el.className = "drag-error-msg";
  el.id = "drag-error-msg";
  el.textContent = "⚠️ " + msg;
  dz.appendChild(el);
}
function _removeDragError(dz) {
  const el = document.getElementById("drag-error-msg");
  if (el) el.remove();
}

// ── Penanganan file ───────────────────────────────────────
function handlePanelFiles(fileList) {
  const t = TOOLS[currentTool];
  if (!t.multiple) uploadedFiles = [];
  for (const f of fileList) uploadedFiles.push(f);
  renderFileList();
  onFilesReady();
}

function renderFileList() {
  const list = document.getElementById("file-list");
  list.innerHTML = uploadedFiles.map((f, i) => `
    <div class="file-item">
      <span class="fi-icon">${f.type.includes("pdf") ? "📄" : "🖼"}</span>
      <span class="fi-name">${escHtml(sanitizeString(f.name, 100))}</span>
      <span class="fi-size">${fmtSize(f.size)}</span>
      <button class="fi-del" onclick="removeFile(${i})" aria-label="Hapus file">✕</button>
    </div>`).join("");
  document.getElementById("btn-process").disabled    = uploadedFiles.length === 0;
  document.getElementById("btn-clear").style.display = uploadedFiles.length > 0 ? "inline-flex" : "none";
  document.getElementById("result-box").classList.remove("show");
}

function removeFile(idx) { uploadedFiles.splice(idx, 1); renderFileList(); }

function clearFiles() {
  uploadedFiles = [];
  document.getElementById("panel-input").value = "";
  renderFileList();
  document.getElementById("img-source-preview-wrap").style.display = "none";
}

function onFilesReady() {
  const imgTools = ["compress","resize","crop","rotate_img","adjust","grayscale","exif","base64img","imgconvert","ascii"];
  if (imgTools.includes(currentTool) && uploadedFiles.length > 0 && uploadedFiles[0].type.startsWith("image/")) {
    const url     = URL.createObjectURL(uploadedFiles[0]);
    const preview = document.getElementById("img-source-preview");
    preview.src   = url;
    document.getElementById("img-source-preview-wrap").style.display = "block";

    if (currentTool === "crop") initCrop(url);
    if (currentTool === "adjust") {
      const img = new Image();
      img.onload = () => { window._adjImg = img; previewAdjust(); };
      img.src = url;
    }
  }
}

// ── Progress & hasil ──────────────────────────────────────
function setProgress(pct) {
  document.getElementById("progress-bar").style.display = "block";
  document.getElementById("progress-fill").style.width  = pct + "%";
}

function showResult(title, desc, downloads) {
  document.getElementById("result-title").textContent = title;
  document.getElementById("result-desc").textContent  = desc;
  document.getElementById("result-buttons").innerHTML = downloads.map((d, i) =>
    `<button class="btn btn-primary" style="font-size:12px;padding:7px 14px" onclick="triggerDownload(${i})">⬇ ${escHtml(d.label)}</button>`
  ).join("");
  window._downloads = downloads;
  document.getElementById("result-box").classList.add("show");
  setProgress(100);

  // Catat ke riwayat konversi
  if (currentTool && typeof window.convHistoryAdd === "function") {
    const t = TOOLS[currentTool];
    window.convHistoryAdd(currentTool, t.title, t.icon, uploadedFiles, desc);
  }
}

function triggerDownload(i) {
  const d = window._downloads[i];
  const a = document.createElement("a");
  a.href     = URL.createObjectURL(d.blob);
  a.download = d.filename;
  a.click();
  showToast("File diunduh ✓");
}

// ── Dispatcher utama ──────────────────────────────────────
const handlers = {
  merge, split, rotate, deletepages, compresspdf, passwordpdf,
  pdf2txt, img2pdf, pdf2img, imgconvert, compress, resize, crop: cropImg,
  rotate_img, adjust: adjustImg, grayscale,
  exif: exifTool, base64img, md2html, csv2json, ascii: asciiArt,
};

async function processFile() {
  if (!currentTool || uploadedFiles.length === 0) return;
  document.getElementById("btn-process").disabled = true;
  document.getElementById("result-box").classList.remove("show");
  setProgress(5);
  try {
    await handlers[currentTool]();
  } catch(e) {
    showToast("Gagal: " + e.message, "error");
    console.error(e);
    setProgress(0);
    document.getElementById("progress-bar").style.display = "none";
  }
  document.getElementById("btn-process").disabled = false;
}

// ════════════════════════════════════════════════════════════
// PDF TOOLS
// ════════════════════════════════════════════════════════════

async function merge() {
  if (uploadedFiles.length < 2) { showToast("Unggah minimal 2 file PDF", "error"); return; }
  const { PDFDocument } = PDFLib;
  const merged = await PDFDocument.create();
  for (let i = 0; i < uploadedFiles.length; i++) {
    setProgress(10 + Math.round((i / uploadedFiles.length) * 80));
    const buf   = await uploadedFiles[i].arrayBuffer();
    const doc   = await PDFDocument.load(buf);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    pages.forEach(p => merged.addPage(p));
  }
  setProgress(95);
  const bytes = await merged.save();
  showResult("PDF berhasil digabung!", `${uploadedFiles.length} file → 1 PDF (${merged.getPageCount()} halaman)`,
    [{ label:"Unduh PDF", blob: new Blob([bytes], { type:"application/pdf" }), filename:"gabungan.pdf" }]);
}

async function split() {
  const { PDFDocument } = PDFLib;
  const buf   = await uploadedFiles[0].arrayBuffer();
  const doc   = await PDFDocument.load(buf);
  const total = doc.getPageCount();
  const mode  = document.querySelector('input[name="split-mode"]:checked').value;
  let ranges  = [];
  if (mode === "all") {
    ranges = Array.from({ length: total }, (_, i) => [i]);
  } else {
    ranges = parseRanges(sanitizeString(document.getElementById("split-range").value, 100), total);
    if (!ranges.length) { showToast("Format rentang tidak valid", "error"); return; }
  }
  const downloads = [];
  for (let r = 0; r < ranges.length; r++) {
    setProgress(15 + Math.round((r / ranges.length) * 75));
    const nd = await PDFDocument.create();
    const cp = await nd.copyPages(doc, ranges[r]);
    cp.forEach(p => nd.addPage(p));
    const bytes = await nd.save();
    downloads.push({
      label: mode === "all" ? `Hal.${ranges[r][0]+1}` : `Bag.${r+1}`,
      blob: new Blob([bytes], { type:"application/pdf" }),
      filename: `pisah_${r+1}.pdf`,
    });
  }
  showResult("PDF berhasil dipecah!", `${ranges.length} file dari ${total} halaman`, downloads);
}

async function rotate() {
  const { PDFDocument, degrees } = PDFLib;
  const buf = await uploadedFiles[0].arrayBuffer();
  const doc = await PDFDocument.load(buf);
  const deg = parseInt(document.querySelector('input[name="rot-deg"]:checked').value);
  setProgress(40);
  doc.getPages().forEach(p => p.setRotation(degrees((p.getRotation().angle + deg) % 360)));
  setProgress(85);
  const bytes = await doc.save();
  const name  = uploadedFiles[0].name.replace(".pdf", "") + "_diputar.pdf";
  showResult("PDF berhasil diputar!", `Semua halaman diputar ${deg}°`,
    [{ label:"Unduh PDF", blob: new Blob([bytes], { type:"application/pdf" }), filename: name }]);
}

async function deletepages() {
  const raw = sanitizeString(document.getElementById("del-pages").value, 100);
  if (!raw.trim()) { showToast("Masukkan nomor halaman yang ingin dihapus", "error"); return; }
  const { PDFDocument } = PDFLib;
  const buf      = await uploadedFiles[0].arrayBuffer();
  const doc      = await PDFDocument.load(buf);
  const total    = doc.getPageCount();
  const toDelete = new Set();
  parseRanges(raw, total).forEach(r => r.forEach(i => toDelete.add(i)));
  if (!toDelete.size) { showToast("Halaman tidak valid", "error"); return; }
  [...toDelete].sort((a, b) => b - a).forEach(i => doc.removePage(i));
  setProgress(80);
  const bytes = await doc.save();
  showResult("Halaman berhasil dihapus!", `${toDelete.size} halaman dihapus, tersisa ${doc.getPageCount()} halaman`,
    [{ label:"Unduh PDF", blob: new Blob([bytes], { type:"application/pdf" }), filename:"hapus_halaman.pdf" }]);
}

async function compresspdf() {
  const { PDFDocument } = PDFLib;
  const buf  = await uploadedFiles[0].arrayBuffer();
  const doc  = await PDFDocument.load(buf, { ignoreEncryption: true });
  setProgress(50);
  const bytes = await doc.save({ addDefaultPage: false, useObjectStreams: true });
  setProgress(90);
  const saved = Math.max(0, Math.round((1 - bytes.byteLength / buf.byteLength) * 100));
  const name  = uploadedFiles[0].name.replace(".pdf", "") + "_terkompres.pdf";
  showResult("PDF berhasil dikompres!", `${fmtSize(buf.byteLength)} → ${fmtSize(bytes.byteLength)}${saved > 0 ? ` (hemat ${saved}%)` : ""}`,
    [{ label:"Unduh PDF", blob: new Blob([bytes], { type:"application/pdf" }), filename: name }]);
}

async function passwordpdf() {
  const p1 = document.getElementById("pdf-password").value;
  const p2 = document.getElementById("pdf-password2").value;
  if (!p1 || p1.length < 4) { showToast("Sandi minimal 4 karakter", "error"); return; }
  if (p1 !== p2) { showToast("Sandi tidak cocok!", "error"); return; }
  const { PDFDocument } = PDFLib;
  const buf = await uploadedFiles[0].arrayBuffer();
  const doc = await PDFDocument.load(buf);
  setProgress(50);
  const bytes = await doc.save();
  setProgress(90);
  showToast("Catatan: enkripsi penuh memerlukan library premium.", "error");
  showResult("File disimpan",
    "pdf-lib versi gratis tidak mendukung enkripsi penuh. Gunakan browser print → Simpan PDF untuk proteksi dasar.",
    [{ label:"Unduh PDF", blob: new Blob([bytes], { type:"application/pdf" }), filename:"output.pdf" }]);
}

async function pdf2txt() {
  if (!window.pdfjsLib) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  const buf  = await uploadedFiles[0].arrayBuffer();
  const pdf  = await pdfjsLib.getDocument({ data: buf }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    setProgress(10 + Math.round((i / pdf.numPages) * 80));
    const page    = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text    = content.items.map(item => item.str).join(" ");
    fullText += `=== Halaman ${i} ===\n${text}\n\n`;
  }
  setProgress(95);
  const blob = new Blob([fullText], { type:"text/plain;charset=utf-8" });
  const name = uploadedFiles[0].name.replace(".pdf", "") + ".txt";
  showResult("Teks berhasil diekstrak!", `${pdf.numPages} halaman → file .txt`,
    [{ label:"Unduh TXT", blob, filename: name }]);
}

async function img2pdf() {
  const { PDFDocument } = PDFLib;
  const pdfDoc  = await PDFDocument.create();
  const fitMode = document.querySelector('input[name="pdf-page"]:checked').value;
  const A4_W = 595, A4_H = 842;
  for (let i = 0; i < uploadedFiles.length; i++) {
    setProgress(10 + Math.round((i / uploadedFiles.length) * 80));
    const f   = uploadedFiles[i];
    const buf = await f.arrayBuffer();
    let embed;
    if (f.type === "image/png") {
      embed = await pdfDoc.embedPng(buf);
    } else {
      const blob2 = await canvasConvert(f, "image/jpeg", 0.92);
      embed = await pdfDoc.embedJpg(await blob2.arrayBuffer());
    }
    const d = embed.scale(1);
    let pw = d.width, ph = d.height;
    if (fitMode === "a4") {
      const sc = Math.min(A4_W / pw, A4_H / ph);
      pw *= sc; ph *= sc;
      const page = pdfDoc.addPage([A4_W, A4_H]);
      page.drawImage(embed, { x:(A4_W-pw)/2, y:(A4_H-ph)/2, width:pw, height:ph });
    } else {
      const page = pdfDoc.addPage([pw, ph]);
      page.drawImage(embed, { x:0, y:0, width:pw, height:ph });
    }
  }
  setProgress(95);
  const bytes = await pdfDoc.save();
  showResult("Gambar berhasil dijadikan PDF!", `${uploadedFiles.length} gambar → ${pdfDoc.getPageCount()} halaman`,
    [{ label:"Unduh PDF", blob: new Blob([bytes], { type:"application/pdf" }), filename:"gambar.pdf" }]);
}

async function pdf2img() {
  if (!window.pdfjsLib) {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
  const scale  = parseFloat(document.querySelector('input[name="pdf-scale"]:checked').value);
  const buf    = await uploadedFiles[0].arrayBuffer();
  const pdf    = await pdfjsLib.getDocument({ data: buf }).promise;
  const total  = pdf.numPages;
  const canvas = document.getElementById("work-canvas");
  const ctx    = canvas.getContext("2d");
  const downloads = [];
  for (let i = 1; i <= total; i++) {
    setProgress(10 + Math.round((i / total) * 85));
    const page = await pdf.getPage(i);
    const vp   = page.getViewport({ scale });
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.92));
    downloads.push({ label:`Hal.${i}`, blob, filename:`halaman_${i}.jpg` });
  }
  showResult("PDF berhasil dikonversi!", `${total} halaman → ${total} file JPG`, downloads);
}

// ════════════════════════════════════════════════════════════
// IMAGE TOOLS
// ════════════════════════════════════════════════════════════

async function imgconvert() {
  const file = uploadedFiles[0];
  const fmt  = document.querySelector('input[name="imgfmt"]:checked').value;
  const ext  = fmt === "image/jpeg" ? "jpg" : fmt.split("/")[1];
  setProgress(40);
  const blob = await canvasConvert(file, fmt, 0.93);
  setProgress(95);
  const name = file.name.replace(/\.[^.]+$/, "") + "." + ext;
  showResult("Format berhasil dikonversi!", `${escHtml(file.name)} → ${ext.toUpperCase()}`,
    [{ label:`Unduh ${ext.toUpperCase()}`, blob, filename: name }]);
}

async function compress() {
  const file    = uploadedFiles[0];
  const quality = parseInt(document.getElementById("compress-quality").value) / 100;
  setProgress(40);
  const blob  = await canvasConvert(file, "image/jpeg", quality);
  setProgress(95);
  const saved = Math.round((1 - blob.size / file.size) * 100);
  const name  = file.name.replace(/\.[^.]+$/, "") + "_terkompres.jpg";
  showResult("Gambar berhasil dikompres!", `${fmtSize(file.size)} → ${fmtSize(blob.size)} (hemat ${saved}%)`,
    [{ label:"Unduh JPG", blob, filename: name }]);
}

async function resize() {
  const file = uploadedFiles[0];
  const newW = parseInt(document.getElementById("resize-w").value);
  const newH = parseInt(document.getElementById("resize-h").value) || 0;
  if (!newW || newW < 1 || newW > 10000) { showToast("Masukkan lebar yang valid (1–10000 px)!", "error"); return; }
  const bm     = await createImageBitmap(file);
  const finalH = newH || Math.round(newW * (bm.height / bm.width));
  const canvas = document.getElementById("work-canvas");
  canvas.width = newW; canvas.height = finalH;
  canvas.getContext("2d").drawImage(bm, 0, 0, newW, finalH);
  setProgress(80);
  const ext  = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise(res => canvas.toBlob(res, ext, 0.93));
  const name = file.name.replace(/\.[^.]+$/, "") + `_${newW}x${finalH}.` + (ext === "image/png" ? "png" : "jpg");
  showResult("Gambar berhasil diubah ukurannya!", `${bm.width}×${bm.height} → ${newW}×${finalH}px`,
    [{ label:"Unduh", blob, filename: name }]);
}

let cropData = null;

function initCrop(url) {
  cropData = null;
  const wrap = document.getElementById("crop-wrap");
  const img  = document.getElementById("crop-img");
  const sel  = document.getElementById("crop-select");
  wrap.style.display = "block";
  img.src = url;
  document.getElementById("img-source-preview-wrap").style.display = "none";
  document.getElementById("crop-coords-label").textContent = "Seret di atas gambar untuk memilih area potong";

  let startX, startY, dragging = false;

  function getRelPos(e) {
    const rect = img.getBoundingClientRect();
    const cx   = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy   = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: Math.max(0, Math.min(cx, rect.width)), y: Math.max(0, Math.min(cy, rect.height)) };
  }

  function onDown(e) { e.preventDefault(); const p = getRelPos(e); startX = p.x; startY = p.y; dragging = true; sel.style.display = "none"; }
  function onMove(e) {
    if (!dragging) return; e.preventDefault();
    const p = getRelPos(e);
    const x = Math.min(startX, p.x), y = Math.min(startY, p.y);
    const w = Math.abs(p.x - startX), h = Math.abs(p.y - startY);
    sel.style.cssText += `;left:${x}px;top:${y}px;width:${w}px;height:${h}px;display:block`;
  }
  function onUp() {
    if (!dragging) return; dragging = false;
    const rect   = img.getBoundingClientRect();
    const scaleX = img.naturalWidth  / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const sx = parseFloat(sel.style.left)   * scaleX;
    const sy = parseFloat(sel.style.top)    * scaleY;
    const sw = parseFloat(sel.style.width)  * scaleX;
    const sh = parseFloat(sel.style.height) * scaleY;
    if (sw > 5 && sh > 5) {
      cropData = { sx, sy, sw, sh };
      document.getElementById("crop-coords-label").textContent =
        `Seleksi: ${Math.round(sw)}×${Math.round(sh)}px`;
    }
  }

  img.addEventListener("mousedown",  onDown);
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup",   onUp);
  img.addEventListener("touchstart", onDown, { passive:false });
  document.addEventListener("touchmove",  onMove, { passive:false });
  document.addEventListener("touchend",   onUp);
}

async function cropImg() {
  if (!cropData) { showToast("Pilih area potong dengan menyeret di gambar!", "error"); return; }
  const { sx, sy, sw, sh } = cropData;
  const file   = uploadedFiles[0];
  const bitmap = await createImageBitmap(file);
  const canvas = document.getElementById("work-canvas");
  canvas.width = Math.round(sw); canvas.height = Math.round(sh);
  canvas.getContext("2d").drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
  setProgress(80);
  const ext  = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise(res => canvas.toBlob(res, ext, 0.93));
  const name = file.name.replace(/\.[^.]+$/, "") + `_terpotong.` + (ext === "image/png" ? "png" : "jpg");
  showResult("Gambar berhasil dipotong!", `${Math.round(sw)}×${Math.round(sh)}px`,
    [{ label:"Unduh", blob, filename: name }]);
}

async function rotate_img() {
  const file = uploadedFiles[0];
  const deg  = parseInt(document.querySelector('input[name="ri-rot"]:checked').value);
  const flip = document.querySelector('input[name="ri-flip"]:checked').value;
  const bm   = await createImageBitmap(file);
  const canvas = document.getElementById("work-canvas");
  const rad  = deg * Math.PI / 180;
  const swap = deg === 90 || deg === 270;
  canvas.width  = swap ? bm.height : bm.width;
  canvas.height = swap ? bm.width  : bm.height;
  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  if (flip === "h") ctx.scale(-1,  1);
  if (flip === "v") ctx.scale( 1, -1);
  ctx.drawImage(bm, -bm.width / 2, -bm.height / 2);
  setProgress(80);
  const ext  = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise(res => canvas.toBlob(res, ext, 0.93));
  const name = file.name.replace(/\.[^.]+$/, "") + `_diputar.` + (ext === "image/png" ? "png" : "jpg");
  showResult("Gambar berhasil diproses!", "", [{ label:"Unduh", blob, filename: name }]);
}

function previewAdjust() {
  const img = window._adjImg;
  if (!img) return;
  const br = parseInt(document.getElementById("adj-brightness").value);
  const ct = parseInt(document.getElementById("adj-contrast").value);
  const st = parseInt(document.getElementById("adj-saturation").value);
  const pc = document.getElementById("adjust-preview-canvas");
  pc.width = img.naturalWidth; pc.height = img.naturalHeight;
  const ctx = pc.getContext("2d");
  ctx.filter = `brightness(${1+br/100}) contrast(${1+ct/100}) saturate(${1+st/100})`;
  ctx.drawImage(img, 0, 0);
  document.getElementById("adjust-preview-wrap").style.display = "block";
}

async function adjustImg() {
  const file = uploadedFiles[0];
  const br   = parseInt(document.getElementById("adj-brightness").value);
  const ct   = parseInt(document.getElementById("adj-contrast").value);
  const st   = parseInt(document.getElementById("adj-saturation").value);
  const bm   = await createImageBitmap(file);
  const canvas = document.getElementById("work-canvas");
  canvas.width = bm.width; canvas.height = bm.height;
  const ctx = canvas.getContext("2d");
  ctx.filter = `brightness(${1+br/100}) contrast(${1+ct/100}) saturate(${1+st/100})`;
  ctx.drawImage(bm, 0, 0);
  setProgress(80);
  const ext  = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise(res => canvas.toBlob(res, ext, 0.93));
  const name = file.name.replace(/\.[^.]+$/, "") + "_disesuaikan." + (ext === "image/png" ? "png" : "jpg");
  showResult("Gambar berhasil disesuaikan!", "", [{ label:"Unduh", blob, filename: name }]);
}

async function grayscale() {
  const file = uploadedFiles[0];
  const bm   = await createImageBitmap(file);
  const canvas = document.getElementById("work-canvas");
  canvas.width = bm.width; canvas.height = bm.height;
  const ctx = canvas.getContext("2d");
  ctx.filter = "grayscale(1)";
  ctx.drawImage(bm, 0, 0);
  setProgress(80);
  const ext  = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise(res => canvas.toBlob(res, ext, 0.93));
  const name = file.name.replace(/\.[^.]+$/, "") + "_abuabu." + (ext === "image/png" ? "png" : "jpg");
  showResult("Gambar berhasil diubah ke abu-abu!", `${fmtSize(file.size)} → ${fmtSize(blob.size)}`,
    [{ label:"Unduh", blob, filename: name }]);
}

async function exifTool() {
  const file = uploadedFiles[0];
  setProgress(30);
  const buf  = await file.arrayBuffer();
  const view = new DataView(buf);
  let exifData = {};
  try { exifData = parseBasicExif(view); } catch(_) {}
  setProgress(60);
  const optDiv = document.getElementById("tool-options");
  if (Object.keys(exifData).length === 0) {
    optDiv.innerHTML += `<div class="info-row" style="border:none"><span class="info-label">Tidak ada data EXIF ditemukan di file ini.</span></div>`;
  } else {
    const rows = Object.entries(exifData).map(([k, v]) =>
      `<tr><td style="color:var(--text2);font-size:11px">${escHtml(k)}</td><td>${escHtml(String(v))}</td></tr>`).join("");
    optDiv.innerHTML += `
      <p style="font-size:12px;color:var(--text2);margin-top:12px;margin-bottom:6px">Data EXIF yang ditemukan:</p>
      <div style="overflow-x:auto;max-height:220px;overflow-y:auto">
        <table class="exif-table"><thead><tr><th>Tag</th><th>Nilai</th></tr></thead><tbody>${rows}</tbody></table>
      </div>`;
  }
  const bm     = await createImageBitmap(file);
  const canvas = document.getElementById("work-canvas");
  canvas.width = bm.width; canvas.height = bm.height;
  canvas.getContext("2d").drawImage(bm, 0, 0);
  const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.95));
  const name = file.name.replace(/\.[^.]+$/, "") + "_tanpa_exif.jpg";
  setProgress(95);
  showResult("EXIF berhasil dibaca!",
    Object.keys(exifData).length > 0
      ? `${Object.keys(exifData).length} tag ditemukan. Unduh versi bersih tanpa EXIF:`
      : "Tidak ada EXIF. Unduh versi bersih:",
    [{ label:"Unduh Tanpa EXIF", blob, filename: name }]);
}

function parseBasicExif(view) {
  const result = {};
  if (view.getUint16(0) !== 0xFFD8) return result;
  let offset = 2;
  while (offset < view.byteLength) {
    if (view.getUint8(offset) !== 0xFF) break;
    const marker = view.getUint16(offset);
    const length = view.getUint16(offset + 2);
    if (marker === 0xFFE1) {
      const exifHeader = String.fromCharCode(...new Uint8Array(view.buffer, offset + 4, 4));
      if (exifHeader === "Exif") {
        const tiffOffset   = offset + 10;
        const littleEndian = view.getUint16(tiffOffset) === 0x4949;
        const ifd0         = tiffOffset + view.getUint32(tiffOffset + 4, littleEndian);
        const tagCount     = view.getUint16(ifd0, littleEndian);
        const tagNames = {
          0x010F:"Make", 0x0110:"Model", 0x0112:"Orientation",
          0x0131:"Software", 0x0132:"DateTime", 0x013B:"Artist",
          0xA002:"LebarPixel", 0xA003:"TinggiPixel",
          0x9003:"WaktuAsli", 0x9004:"WaktuDigital",
          0x010E:"Deskripsi", 0x8298:"Hak Cipta",
        };
        for (let i = 0; i < tagCount; i++) {
          const tagOffset = ifd0 + 2 + (i * 12);
          const tag   = view.getUint16(tagOffset, littleEndian);
          const type  = view.getUint16(tagOffset + 2, littleEndian);
          const count = view.getUint32(tagOffset + 4, littleEndian);
          if (tagNames[tag]) {
            try {
              let val = "";
              if (type === 2) {
                const strOffset = count <= 4 ? tagOffset + 8 : tiffOffset + view.getUint32(tagOffset + 8, littleEndian);
                for (let c = 0; c < count - 1; c++) val += String.fromCharCode(view.getUint8(strOffset + c));
              } else if (type === 3) { val = view.getUint16(tagOffset + 8, littleEndian); }
              else if (type === 4) { val = view.getUint32(tagOffset + 8, littleEndian); }
              else if (type === 5) {
                const rOff = tiffOffset + view.getUint32(tagOffset + 8, littleEndian);
                val = view.getUint32(rOff, littleEndian) + "/" + view.getUint32(rOff + 4, littleEndian);
              }
              if (val !== "" && val !== 0) result[tagNames[tag]] = val;
            } catch(_) {}
          }
        }
      }
    }
    offset += 2 + length;
  }
  return result;
}

async function base64img() {
  const file = uploadedFiles[0];
  setProgress(40);
  const b64 = await new Promise(res => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.readAsDataURL(file);
  });
  setProgress(90);
  const blob    = new Blob([b64], { type:"text/plain" });
  const name    = file.name.replace(/\.[^.]+$/, "") + "_base64.txt";
  const snippet = b64.substring(0, 120) + "...";
  document.getElementById("tool-options").innerHTML += `
    <div style="margin-top:12px">
      <p style="font-size:12px;color:var(--text2);margin-bottom:6px">Pratinjau (${fmtSize(b64.length)}):</p>
      <code style="font-size:10px;color:var(--accent2);background:var(--bg);padding:10px;border-radius:6px;display:block;word-break:break-all;line-height:1.5">${escHtml(snippet)}</code>
      <button class="btn btn-secondary" style="margin-top:8px;font-size:12px"
        onclick="navigator.clipboard.writeText(document.getElementById('b64-full').value).then(()=>showToast('Base64 disalin ✓'))">
        📋 Salin ke Papan Klip
      </button>
      <textarea id="b64-full" style="display:none">${escHtml(b64)}</textarea>
    </div>`;
  showResult("Gambar berhasil di-encode!", `${fmtSize(file.size)} → Base64 (${fmtSize(b64.length)})`,
    [{ label:"Unduh TXT", blob, filename: name }]);
}

// ════════════════════════════════════════════════════════════
// DOKUMEN TOOLS
// ════════════════════════════════════════════════════════════

async function md2html() {
  const file = uploadedFiles[0];
  const text = await file.text();
  setProgress(40);
  let html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^#{6}\s(.+)$/gm, "<h6>$1</h6>").replace(/^#{5}\s(.+)$/gm, "<h5>$1</h5>")
    .replace(/^#{4}\s(.+)$/gm, "<h4>$1</h4>").replace(/^###\s(.+)$/gm,  "<h3>$1</h3>")
    .replace(/^##\s(.+)$/gm,   "<h2>$1</h2>").replace(/^#\s(.+)$/gm,    "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
    .replace(/^---$/gm, "<hr>")
    .replace(/^[-*]\s(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/^\d+\.\s(.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");
  html = "<p>" + html + "</p>";
  const fullHtml = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(file.name.replace(".md",""))}</title>
<style>body{font-family:system-ui,sans-serif;max-width:760px;margin:48px auto;padding:0 24px;line-height:1.7;color:#1a1a2e}
h1,h2,h3{line-height:1.3;margin-top:1.8em}h1{font-size:2em;border-bottom:2px solid #eee;padding-bottom:.3em}
h2{font-size:1.5em;border-bottom:1px solid #f0f0f0;padding-bottom:.2em}
code{background:#f4f4f8;padding:2px 6px;border-radius:4px;font-size:.9em}
a{color:#7c6aff}hr{border:none;border-top:1px solid #eee;margin:2em 0}ul{padding-left:1.5em}li{margin:.3em 0}</style>
</head><body>${html}</body></html>`;
  setProgress(90);
  const blob = new Blob([fullHtml], { type:"text/html;charset=utf-8" });
  const name = file.name.replace(/\.[^.]+$/, "") + ".html";
  showResult("Markdown berhasil dikonversi ke HTML!", `${fmtSize(file.size)} → ${fmtSize(blob.size)}`,
    [{ label:"Unduh HTML", blob, filename: name }]);
}

async function csv2json() {
  const file = uploadedFiles[0];
  const text = await file.text();
  const ext  = file.name.split(".").pop().toLowerCase();
  const mode = document.querySelector('input[name="cj-mode"]:checked').value;
  const actualMode = mode === "auto" ? (ext === "json" ? "json2csv" : "csv2json") : mode;
  setProgress(40);
  let blob, name, desc;
  if (actualMode === "csv2json") {
    const lines   = text.trim().split("\n").filter(Boolean);
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const rows    = lines.slice(1).map(line => {
      const vals = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      const obj  = {};
      headers.forEach((h, i) => { obj[h] = isNaN(vals[i]) ? vals[i] : Number(vals[i]); });
      return obj;
    });
    const json = JSON.stringify(rows, null, 2);
    blob = new Blob([json], { type:"application/json" });
    name = file.name.replace(/\.[^.]+$/, "") + ".json";
    desc = `${lines.length - 1} baris → JSON (${fmtSize(blob.size)})`;
  } else {
    const data    = JSON.parse(text);
    const arr     = Array.isArray(data) ? data : [data];
    const headers = [...new Set(arr.flatMap(r => Object.keys(r)))];
    const csv     = [
      headers.join(","),
      ...arr.map(r => headers.map(h => {
        const v = r[h] ?? "";
        return typeof v === "string" && v.includes(",") ? `"${v}"` : v;
      }).join(",")),
    ].join("\n");
    blob = new Blob([csv], { type:"text/csv;charset=utf-8" });
    name = file.name.replace(/\.[^.]+$/, "") + ".csv";
    desc = `${arr.length} objek → CSV (${fmtSize(blob.size)})`;
  }
  setProgress(90);
  showResult(`Konversi ${actualMode === "csv2json" ? "CSV → JSON" : "JSON → CSV"} selesai!`, desc,
    [{ label:`Unduh ${name.split(".").pop().toUpperCase()}`, blob, filename: name }]);
}

// ════════════════════════════════════════════════════════════
// ASCII ART
// ════════════════════════════════════════════════════════════

const ASCII_CHARSETS = {
  detailed: ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$'.split('').reverse(),
  simple:   ' .:-=+*#%@'.split('').reverse(),
  blocks:   ' ░▒▓█'.split('').reverse(),
  emoji:    ['  ','🌑','🌒','🌓','🌔','🌕'],
};

async function asciiArt() {
  const file    = uploadedFiles[0];
  const width   = Math.min(200, Math.max(40, parseInt(document.getElementById("ascii-width").value)));
  const charset = document.querySelector('input[name="ascii-charset"]:checked').value;
  const colored = document.querySelector('input[name="ascii-color"]:checked').value === "color";
  const invert  = document.getElementById("ascii-invert").checked;
  const chars   = ASCII_CHARSETS[charset];
  const bitmap  = await createImageBitmap(file);
  const canvas  = document.getElementById("work-canvas");
  const height  = Math.round(width * (bitmap.height / bitmap.width) * 0.45);
  canvas.width  = width; canvas.height = height;
  const ctx     = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  setProgress(60);

  const output = document.getElementById("ascii-output-pre");
  if (colored) {
    let html = "";
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i  = (y * width + x) * 4;
        const r  = pixels[i], g = pixels[i+1], b = pixels[i+2];
        const br = (0.299*r + 0.587*g + 0.114*b) / 255;
        const ch = chars[Math.floor(br * (chars.length - 1))];
        html += `<span style="color:rgb(${r},${g},${b})">${ch}</span>`;
      }
      html += "\n";
    }
    output.innerHTML = html;
  } else {
    let text = "";
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i  = (y * width + x) * 4;
        let br   = (0.299*pixels[i] + 0.587*pixels[i+1] + 0.114*pixels[i+2]) / 255;
        if (invert) br = 1 - br;
        text += chars[Math.floor(br * (chars.length - 1))];
      }
      text += "\n";
    }
    output.textContent = text;
  }

  setProgress(90);
  document.getElementById("ascii-result-wrap").style.display = "block";
  const rawText = output.textContent || output.innerText;
  const txtBlob = new Blob([rawText], { type:"text/plain" });
  const pngBlob = await asciiToPng(output, invert, colored);
  showResult("Seni ASCII berhasil dibuat!", `${width} kolom × ${height} baris`, [
    { label:"Unduh TXT", blob: txtBlob, filename:"seni-ascii.txt" },
    { label:"Unduh PNG", blob: pngBlob, filename:"seni-ascii.png" },
  ]);
}

async function asciiToPng(preEl, invert, colored) {
  const text  = preEl.textContent || preEl.innerText;
  const lines = text.split("\n");
  const FS = 11, LH = FS * 1.1, CW = FS * 0.605, PAD = 20;
  const maxCol = Math.max(...lines.map(l => l.length));
  const ec     = document.getElementById("work-canvas2");
  ec.width     = Math.round(maxCol * CW + PAD * 2);
  ec.height    = Math.round(lines.length * LH + PAD * 2);
  const ctx    = ec.getContext("2d");
  ctx.fillStyle = (invert && !colored) ? "#000" : "#fff";
  ctx.fillRect(0, 0, ec.width, ec.height);
  ctx.font = `${FS}px 'JetBrains Mono','Courier New',monospace`;
  ctx.textBaseline = "top";
  if (colored) {
    const spans = preEl.querySelectorAll("span");
    let si = 0;
    for (let y = 0; y < lines.length; y++) {
      for (let x = 0; x < lines[y].length; x++) {
        const sp = spans[si++];
        if (sp) { ctx.fillStyle = sp.style.color || "#000"; ctx.fillText(sp.textContent, PAD + x*CW, PAD + y*LH); }
      }
    }
  } else {
    ctx.fillStyle = invert ? "#e8e8e8" : "#111";
    for (let y = 0; y < lines.length; y++) ctx.fillText(lines[y], PAD, PAD + y*LH);
  }
  return new Promise(res => ec.toBlob(res, "image/png"));
}

function asciiCopy() {
  const out = document.getElementById("ascii-output-pre");
  navigator.clipboard.writeText(out.textContent || out.innerText)
    .then(() => showToast("Disalin ke papan klip ✓"))
    .catch(() => showToast("Gagal menyalin", "error"));
}

function asciiCopyWA() {
  const out = document.getElementById("ascii-output-pre");
  const raw = out.textContent || out.innerText;
  navigator.clipboard.writeText("```\n" + raw.trimEnd() + "\n```")
    .then(() => showToast("Disalin untuk WhatsApp ✓"))
    .catch(() => showToast("Gagal menyalin", "error"));
}

// ════════════════════════════════════════════════════════════
// UTILITAS
// ════════════════════════════════════════════════════════════

function parseRanges(str, total) {
  const parts = str.split(",").map(s => s.trim()).filter(Boolean);
  const result = [];
  for (const p of parts) {
    const m = p.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) return [];
    const a = parseInt(m[1]) - 1;
    const b = m[2] ? parseInt(m[2]) - 1 : a;
    if (a < 0 || b >= total || a > b) return [];
    const pages = [];
    for (let i = a; i <= b; i++) pages.push(i);
    result.push(pages);
  }
  return result;
}

async function canvasConvert(file, mimeType, quality) {
  const bm = await createImageBitmap(file);
  const c  = document.getElementById("work-canvas");
  c.width = bm.width; c.height = bm.height;
  c.getContext("2d").drawImage(bm, 0, 0);
  return new Promise(res => c.toBlob(res, mimeType, quality));
}

function loadScript(src) {
  return new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = src; s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
}

function fmtSize(b) {
  if (b < 1024)    return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(2) + " MB";
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════

(function initConverterPage() {
  // Inisialisasi drag & drop feedback yang lebih kaya
  // Panel belum ada saat ini, _initDragDropFeedback dipanggil
  // ulang setiap openTool() karena dropzone di-reset
  // Cukup pasang sekali di sini, handler akan tetap aktif
  _initDragDropFeedback();
})();

// ===== Service worker =====

(function () {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");

      // Cek update setiap 60 menit
      setInterval(() => reg.update(), 60 * 60 * 1000);

      // Deteksi ada Service Worker baru menunggu
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          // SW baru sudah siap tapi belum aktif
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateBanner(newWorker);
          }
        });
      });

    } catch (err) {
      console.warn("[SW] Registrasi gagal:", err);
    }
  });

  /**
   * Tampilkan banner notifikasi update tersedia.
   * @param {ServiceWorker} worker
   */
  function showUpdateBanner(worker) {
    // Jangan tampilkan duplikat
    if (document.getElementById("sw-update-banner")) return;

    const banner = document.createElement("div");
    banner.id = "sw-update-banner";
    banner.style.cssText = [
      "position:fixed", "bottom:80px", "left:50%",
      "transform:translateX(-50%)",
      "z-index:99999",
      "background:rgba(22,22,42,0.97)",
      "border:1px solid rgba(124,106,255,0.4)",
      "border-radius:12px",
      "padding:14px 20px",
      "display:flex", "align-items:center", "gap:14px",
      "box-shadow:0 8px 32px rgba(0,0,0,0.5)",
      "font-family:var(--font-body,sans-serif)",
      "font-size:13px",
      "color:#eeedf8",
      "max-width:320px",
      "width:calc(100% - 48px)",
      "backdrop-filter:blur(12px)",
    ].join(";");

    banner.innerHTML = `
      <span style="font-size:20px">✦</span>
      <div style="flex:1">
        <p style="font-weight:600;color:#b8abff;margin-bottom:2px">Update tersedia!</p>
        <p style="font-size:12px;color:#8887a4">Versi baru Ucupz siap digunakan.</p>
      </div>
      <button id="sw-update-btn" style="
        background:#7c6aff;color:#fff;border:none;border-radius:8px;
        padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;
        white-space:nowrap;font-family:inherit;flex-shrink:0;
      ">Perbarui</button>
      <button id="sw-dismiss-btn" style="
        background:none;border:none;color:#4a4962;cursor:pointer;
        font-size:18px;padding:0 2px;line-height:1;flex-shrink:0;
      ">✕</button>
    `;

    document.body.appendChild(banner);

    // Tombol perbarui — aktifkan SW baru dan reload
    document.getElementById("sw-update-btn").onclick = () => {
      worker.postMessage("SKIP_WAITING");
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
      });
    };

    // Tombol tutup banner
    document.getElementById("sw-dismiss-btn").onclick = () => {
      banner.remove();
    };

    // Auto hilang setelah 30 detik
    setTimeout(() => { if (banner.parentNode) banner.remove(); }, 30000);
  }
})();
