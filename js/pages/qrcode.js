
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
  const desktopItems = pages.map(page => {
    const active = activePage === page.id;
    return `<a href="${page.href}" class="desktop-nav-item ${active ? "active" : ""}"
      aria-current="${active ? "page" : "false"}">${page.labelShort}</a>`;
  }).join("");

  const sidebar = document.getElementById("sidebar");
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <a class="brand-lockup" href="converter.html" aria-label="Ucupz">
          <span class="brand-icon" aria-hidden="true"><img src="../favicon-512.png" alt="" /></span>
          <span class="brand-name">Ucupz <span>${activePage === "converter" ? "Convert" : activePage === "scan" ? "Scan QR" : "QR Code"}</span></span>
        </a>
        <nav class="desktop-navbar" aria-label="Navigasi halaman">${desktopItems}</nav>
        <div class="header-actions">
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

  updateInstallNotice();
}

let installPromptEvent = null;
const INSTALL_NOTICE_DISMISSED_KEY = "ucupz-install-notice-dismissed";

function isAppInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function updateInstallNotice() {
  const existingNotice = document.getElementById("install-notification");
  let dismissed = false;
  try {
    dismissed = sessionStorage.getItem(INSTALL_NOTICE_DISMISSED_KEY) === "1";
  } catch (error) {
    console.warn("[UI] Status notifikasi instal tidak dapat dibaca:", error);
  }
  if (isAppInstalled() || dismissed) {
    if (existingNotice) existingNotice.remove();
    return;
  }
  if (existingNotice) return;

  const sidebar = document.getElementById("sidebar");
  if (!sidebar) return;
  const notice = document.createElement("aside");
  notice.id = "install-notification";
  notice.className = "install-notification";
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  notice.innerHTML = `
    <span class="install-notification-icon" aria-hidden="true">↓</span>
    <span class="install-notification-copy">
      <strong>Pasang Ucupz</strong>
      <span>Akses alat favoritmu langsung dari perangkat.</span>
    </span>
    <button class="install-notification-action" type="button" data-action="install-app">Instal</button>
    <button class="install-notification-close" type="button" data-action="dismiss-install" aria-label="Tutup notifikasi instal">×</button>
  `;
  sidebar.insertAdjacentElement("afterend", notice);
  notice.querySelector('[data-action="install-app"]').onclick = installApp;
  notice.querySelector('[data-action="dismiss-install"]').onclick = dismissInstallNotice;
}

function dismissInstallNotice() {
  try {
    sessionStorage.setItem(INSTALL_NOTICE_DISMISSED_KEY, "1");
  } catch (error) {
    console.warn("[UI] Status notifikasi instal tidak dapat disimpan:", error);
  }
  const notice = document.getElementById("install-notification");
  if (notice) notice.remove();
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPromptEvent = event;
  updateInstallNotice();
});

window.addEventListener("appinstalled", () => {
  installPromptEvent = null;
  updateInstallNotice();
});

async function installApp() {
  if (isAppInstalled()) {
    updateInstallNotice();
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
  updateInstallNotice();
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

// ===== Halaman QR Code =====
initLocalApp();

// Tampilkan halaman, sembunyikan skeleton
(function() {
  var sk = document.getElementById("page-skeleton");
  var mc = document.getElementById("main-app-content");
  if (sk) sk.style.display = "none";
  if (mc) mc.style.display = "block";
})();
renderSidebar("qrcode");
applyGlobalSettings();

let currentType   = "url";
let logoDataUrl   = null;
let generateTimer = null;
let lastQRText    = "";
let history       = [];

// Muat riwayat dari localStorage dengan aman
try {
  history = JSON.parse(localStorage.getItem(STORAGE_KEYS.QR_HIST) || "[]");
} catch(_) { history = []; }

/** Ganti tipe input QR. */
function switchType(type, btn) {
  currentType = type;
  document.querySelectorAll(".itype-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".input-pane").forEach(p => p.classList.remove("active"));
  document.getElementById("pane-" + type).classList.add("active");
  scheduleGenerate();
}

/** Buat string konten QR berdasarkan tipe aktif. */
function buildQRString() {
  switch (currentType) {
    case "url": {
      const v = sanitizeString(document.getElementById("inp-url").value.trim(), 2000);
      if (!v) return "";
      return v.startsWith("http") ? v : "https://" + v;
    }
    case "text":
      return sanitizeString(document.getElementById("inp-text").value.trim(), 900);
    case "wa": {
      const num = document.getElementById("inp-wa-number").value.trim().replace(/\D/g, "");
      const msg = sanitizeString(document.getElementById("inp-wa-msg").value.trim(), 500);
      if (!num || num.length < 8) return "";
      return msg ? `https://wa.me/${num}?text=${encodeURIComponent(msg)}` : `https://wa.me/${num}`;
    }
    case "wifi": {
      const ssid = sanitizeString(document.getElementById("inp-wifi-ssid").value.trim(), 100);
      const pass = sanitizeString(document.getElementById("inp-wifi-pass").value.trim(), 100);
      const enc  = document.querySelector('input[name="wifi-enc"]:checked').value;
      if (!ssid) return "";
      return `WIFI:T:${enc};S:${ssid};P:${pass};;`;
    }
    case "email": {
      const addr = sanitizeString(document.getElementById("inp-email-addr").value.trim(), 200);
      const subj = sanitizeString(document.getElementById("inp-email-subj").value.trim(), 200);
      const body = sanitizeString(document.getElementById("inp-email-body").value.trim(), 500);
      if (!addr || !addr.includes("@")) return "";
      let str = `mailto:${addr}`;
      const params = [];
      if (subj) params.push("subject=" + encodeURIComponent(subj));
      if (body) params.push("body=" + encodeURIComponent(body));
      if (params.length) str += "?" + params.join("&");
      return str;
    }
    default: return "";
  }
}

/** Jadwalkan generate QR (debounce 400ms). */
function scheduleGenerate() {
  clearTimeout(generateTimer);
  generateTimer = setTimeout(generateQR, 400);
}

/** Generate QR Code ke canvas pratinjau. */
function generateQR() {
  const text = buildQRString();
  if (!text) { showEmpty(); return; }
  lastQRText = text;

  const fgColor = document.getElementById("color-fg").value;
  const bgColor = document.getElementById("color-bg").value;
  const ecl     = document.querySelector('input[name="qr-ecl"]:checked').value;
  const qrSize  = 176;

  const container = document.getElementById("qr-container");
  container.innerHTML = "";

  try {
    new QRCode(container, {
      text, width: qrSize, height: qrSize,
      colorDark: fgColor, colorLight: bgColor,
      correctLevel: QRCode.CorrectLevel[ecl],
    });
  } catch(e) {
    showToast("Konten terlalu panjang untuk QR Code", "error");
    showEmpty();
    return;
  }

  const wrap = document.getElementById("qr-canvas-wrap");
  document.getElementById("qr-placeholder").style.display = "none";
  container.style.display = "block";
  wrap.style.background   = bgColor;
  wrap.style.padding      = "12px";
  wrap.style.width        = (qrSize + 24) + "px";
  wrap.style.height       = (qrSize + 24) + "px";

  updateLogoOverlay(qrSize);

  const typeLabels = { url:"URL/Tautan", text:"Teks", wa:"WhatsApp", wifi:"WiFi", email:"Surel" };
  document.getElementById("info-type").textContent  = typeLabels[currentType];
  document.getElementById("info-chars").textContent = text.length + " karakter";
  document.getElementById("info-ecl").textContent   = ecl;
  document.getElementById("qr-info").classList.add("show");
  document.getElementById("qr-actions").style.display  = "flex";
  document.getElementById("qr-actions2").style.display = "flex";
  document.getElementById("qr-generate-hint").style.display = "none";
}

function showEmpty() {
  document.getElementById("qr-placeholder").style.display  = "flex";
  document.getElementById("qr-container").style.display    = "none";
  document.getElementById("qr-info").classList.remove("show");
  document.getElementById("qr-actions").style.display  = "none";
  document.getElementById("qr-actions2").style.display = "none";
  document.getElementById("qr-generate-hint").style.display = "block";
  document.getElementById("logo-overlay").style.display = "none";
}

function handleLogo(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = e => {
    logoDataUrl = e.target.result;
    document.getElementById("logo-upload-label").textContent = "✓ " + sanitizeString(file.name, 60);
    document.getElementById("btn-remove-logo").style.display = "inline-flex";
    document.getElementById("logo-size-row").style.display   = "flex";
    scheduleGenerate();
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  logoDataUrl = null;
  document.getElementById("logo-upload-label").textContent = "📎 Klik untuk unggah logo (PNG/JPG)";
  document.getElementById("btn-remove-logo").style.display = "none";
  document.getElementById("logo-size-row").style.display   = "none";
  document.getElementById("logo-overlay").style.display    = "none";
  document.getElementById("logo-input").value = "";
  scheduleGenerate();
}

function updateLogoOverlay(qrSize) {
  const overlay = document.getElementById("logo-overlay");
  if (!logoDataUrl) { overlay.style.display = "none"; return; }
  const pct      = parseInt(document.getElementById("logo-size").value) / 100;
  const logoSize = Math.round(qrSize * pct);
  const imgEl    = document.getElementById("logo-img");
  imgEl.src = logoDataUrl;
  imgEl.style.width = imgEl.style.height = logoSize + "px";
  imgEl.style.objectFit = "contain";
  overlay.style.display = "block";
}

function syncColorHex(which) {
  document.getElementById("color-" + which + "-hex").value = document.getElementById("color-" + which).value;
}
function syncColorPicker(which) {
  const hex = document.getElementById("color-" + which + "-hex").value;
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) document.getElementById("color-" + which).value = hex;
}
function applyPreset(which, color, el) {
  document.getElementById("color-" + which).value = color;
  document.getElementById("color-" + which + "-hex").value = color;
  document.querySelectorAll(`#presets-${which} .color-preset`).forEach(p => p.classList.remove("active"));
  el.classList.add("active");
  scheduleGenerate();
}

async function downloadQR(format) {
  if (!lastQRText) { showToast("Buat QR Code terlebih dahulu!", "error"); return; }
  const size    = parseInt(document.querySelector('input[name="qr-size"]:checked').value);
  const fgColor = document.getElementById("color-fg").value;
  const bgColor = document.getElementById("color-bg").value;
  const ecl     = document.querySelector('input[name="qr-ecl"]:checked').value;

  if (format === "png") {
    const tmpDiv = document.createElement("div");
    tmpDiv.style.cssText = "position:fixed;left:-9999px;top:-9999px;";
    document.body.appendChild(tmpDiv);
    new QRCode(tmpDiv, { text: lastQRText, width: size, height: size, colorDark: fgColor, colorLight: bgColor, correctLevel: QRCode.CorrectLevel[ecl] });

    setTimeout(async () => {
      const srcCanvas = tmpDiv.querySelector("canvas");
      if (!srcCanvas) { document.body.removeChild(tmpDiv); showToast("Gagal render", "error"); return; }
      const pad = Math.round(size * 0.06);
      const total = size + pad * 2;
      const ec = document.getElementById("export-canvas");
      ec.width = ec.height = total;
      const ctx = ec.getContext("2d");
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, total, total);
      ctx.drawImage(srcCanvas, pad, pad, size, size);
      if (logoDataUrl) {
        const pct = parseInt(document.getElementById("logo-size").value) / 100;
        const ls  = Math.round(size * pct);
        await new Promise(res => {
          const img = new Image();
          img.onload = () => {
            const x = pad + (size - ls) / 2, y = pad + (size - ls) / 2;
            ctx.fillStyle = bgColor; ctx.fillRect(x - 4, y - 4, ls + 8, ls + 8);
            ctx.drawImage(img, x, y, ls, ls); res();
          };
          img.src = logoDataUrl;
        });
      }
      document.body.removeChild(tmpDiv);
      const blob = await new Promise(res => ec.toBlob(res, "image/png"));
      triggerDownload(blob, "qrcode.png");
      saveHistory(lastQRText, srcCanvas);
      showToast("QR Code PNG diunduh ✓");
    }, 100);
  } else if (format === "svg") {
    const svg = generateSVG(lastQRText, size, fgColor, bgColor, ecl);
    triggerDownload(new Blob([svg], { type: "image/svg+xml" }), "qrcode.svg");
    showToast("QR Code SVG diunduh ✓");
  }
}

function generateSVG(text, size, fg, bg, ecl) {
  const tmpDiv = document.createElement("div");
  tmpDiv.style.cssText = "position:fixed;left:-9999px;";
  document.body.appendChild(tmpDiv);
  new QRCode(tmpDiv, { text, width: 100, height: 100, colorDark: "#000", colorLight: "#fff", correctLevel: QRCode.CorrectLevel[ecl] });
  const srcCanvas = tmpDiv.querySelector("canvas");
  if (!srcCanvas) { document.body.removeChild(tmpDiv); return ""; }
  const ctx = srcCanvas.getContext("2d");
  const w = srcCanvas.width, h = srcCanvas.height;
  const px = ctx.getImageData(0, 0, w, h).data;
  const pad = Math.round(size * 0.06), total = size + pad * 2, cellSize = size / w;
  let rects = "";
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (px[i] < 128 && px[i+1] < 128 && px[i+2] < 128)
      rects += `<rect x="${(pad+x*cellSize).toFixed(2)}" y="${(pad+y*cellSize).toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" fill="${fg}"/>`;
  }
  document.body.removeChild(tmpDiv);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${total}" height="${total}"><rect width="${total}" height="${total}" fill="${bg}"/>${rects}</svg>`;
}

function triggerDownload(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

async function copyQRClipboard() {
  const canvas = document.querySelector("#qr-container canvas");
  if (!canvas) { showToast("Buat QR Code terlebih dahulu!", "error"); return; }
  try {
    const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    showToast("QR Code disalin ke papan klip ✓");
  } catch(e) {
    showToast("Browser tidak mendukung salin gambar", "error");
  }
}

async function shareQR() {
  const canvas = document.querySelector("#qr-container canvas");
  if (!canvas) { showToast("Buat QR Code terlebih dahulu!", "error"); return; }
  const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
  const file = new File([blob], "qrcode.png", { type: "image/png" });
  if (navigator.share && navigator.canShare({ files: [file] })) {
    await navigator.share({ title: "QR Code", files: [file] });
  } else {
    triggerDownload(blob, "qrcode.png");
    showToast("Diunduh sebagai fallback ✓");
  }
}

function saveHistory(text, canvas) {
  const entry = { text, type: currentType, time: Date.now(), thumb: canvas.toDataURL("image/png") };
  history = history.filter(h => h.text !== text);
  history.unshift(entry);
  if (history.length > 10) history = history.slice(0, 10);
  try { localStorage.setItem(STORAGE_KEYS.QR_HIST, JSON.stringify(history)); } catch(_) {}
  renderHistory();
}

function renderHistory() {
  const card = document.getElementById("history-card");
  const list = document.getElementById("history-list");
  if (!history.length) { card.style.display = "none"; return; }
  card.style.display = "block";
  const icons = { url:"🔗", text:"📝", wa:"💬", wifi:"📶", email:"📧" };
  list.innerHTML = history.map((h, i) => `
    <div class="history-item" data-history-index="${i}" role="button" tabindex="0">
      <img src="${h.thumb}" class="history-thumb" alt="" />
      <div class="history-text">
        <p>${escHtml(h.text.length > 50 ? h.text.slice(0,50)+"…" : h.text)}</p>
        <span>${icons[h.type]||"📄"} ${new Date(h.time).toLocaleString("id-ID",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
      </div>
      <button type="button" class="history-del" data-history-delete="${i}" aria-label="Hapus">✕</button>
    </div>`).join("");
}

function loadHistory(i) {
  const h = history[i];
  if (!h) return;
  const types = ["url","text","wa","wifi","email"];
  const idx = types.indexOf(h.type);
  const btn = document.querySelectorAll(".itype-btn")[idx];
  if (btn) switchType(h.type, btn);
  if (h.type === "url")  document.getElementById("inp-url").value  = h.text;
  if (h.type === "text") document.getElementById("inp-text").value = h.text;
  generateQR();
}

function deleteHistory(e, i) {
  e.stopPropagation();
  history.splice(i, 1);
  try { localStorage.setItem(STORAGE_KEYS.QR_HIST, JSON.stringify(history)); } catch(_) {}
  renderHistory();
}

function clearHistory() {
  if (!confirm("Hapus semua riwayat QR Code?")) return;
  history = [];
  try { localStorage.removeItem(STORAGE_KEYS.QR_HIST); } catch(_) {}
  renderHistory();
}

function escHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function bindQrEvents() {
  document.querySelectorAll(".itype-btn").forEach(button => {
    button.addEventListener("click", () => switchType(button.dataset.type, button));
  });

  document.querySelectorAll(".qr-live-input").forEach(input => {
    input.addEventListener("input", () => {
      switch (input.dataset.sanitize) {
        case "digits":
          input.value = input.value.replace(/\D/g, "");
          break;
        case "wifi-ssid":
          input.value = input.value.replace(/[;:,"\\]/g, "");
          break;
        case "wifi-pass":
          input.value = input.value.replace(/[;:"\\]/g, "");
          break;
        case "email-subject":
          input.value = input.value.replace(/[<>"'`]/g, "");
          break;
      }
      scheduleGenerate();
    });
  });

  document.querySelectorAll('input[name="wifi-enc"], input[name="qr-size"], input[name="qr-ecl"]').forEach(input => {
    input.addEventListener("change", scheduleGenerate);
  });

  document.querySelectorAll("[data-color-picker]").forEach(input => {
    input.addEventListener("input", () => {
      syncColorHex(input.dataset.colorPicker);
      scheduleGenerate();
    });
  });

  document.querySelectorAll("[data-color-hex]").forEach(input => {
    input.addEventListener("input", () => {
      syncColorPicker(input.dataset.colorHex);
      scheduleGenerate();
    });
  });

  document.querySelectorAll(".color-preset").forEach(preset => {
    preset.style.backgroundColor = preset.dataset.color;
    if (preset.dataset.color === "#ffffff") preset.classList.add("color-preset-light");
    preset.addEventListener("click", () => applyPreset(preset.dataset.colorSide, preset.dataset.color, preset));
  });

  document.getElementById("logo-size").addEventListener("input", event => {
    document.getElementById("logo-size-val").textContent = event.currentTarget.value;
    scheduleGenerate();
  });
  document.getElementById("logo-input").addEventListener("change", event => handleLogo(event.currentTarget.files[0]));
  document.querySelector('[data-action="choose-logo"]').addEventListener("click", () => {
    document.getElementById("logo-input").click();
  });
  document.querySelector('[data-action="remove-logo"]').addEventListener("click", removeLogo);

  document.querySelectorAll('[data-action="clear-history"]').forEach(button => {
    button.addEventListener("click", clearHistory);
  });
  document.querySelectorAll('[data-action="download-qr"]').forEach(button => {
    button.addEventListener("click", () => downloadQR(button.dataset.format));
  });
  document.querySelector('[data-action="copy-qr"]').addEventListener("click", copyQRClipboard);
  document.querySelector('[data-action="share-qr"]').addEventListener("click", shareQR);

  const historyList = document.getElementById("history-list");
  historyList.addEventListener("click", event => {
    const deleteButton = event.target.closest("[data-history-delete]");
    if (deleteButton) {
      deleteHistory(event, Number(deleteButton.dataset.historyDelete));
      return;
    }
    const item = event.target.closest("[data-history-index]");
    if (item) loadHistory(Number(item.dataset.historyIndex));
  });
  historyList.addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const item = event.target.closest("[data-history-index]");
    if (item && event.target === item) {
      event.preventDefault();
      loadHistory(Number(item.dataset.historyIndex));
    }
  });
}

bindQrEvents();
renderHistory();

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
