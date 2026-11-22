
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

// ===== Halaman scan =====
initLocalApp();
renderSidebar("scan");
applyGlobalSettings();

const scanVideo = document.getElementById("scan-video");
const scanCanvas = document.getElementById("scan-canvas");
const scanContext = scanCanvas.getContext("2d", { willReadFrequently: true });
const scanStatus = document.getElementById("scan-status");
const scanStartButton = document.getElementById("scan-start");
const scanStopButton = document.getElementById("scan-stop");
let scanStream = null;
let scanFrame = 0;
let qrDetector = null;
let fallbackDecoderPromise = null;

function setScanStatus(message, isError = false) {
  scanStatus.textContent = message;
  scanStatus.classList.toggle("error", isError);
}

function stopCamera() {
  if (scanFrame) cancelAnimationFrame(scanFrame);
  scanFrame = 0;
  if (scanStream) {
    scanStream.getTracks().forEach(track => track.stop());
    scanStream = null;
  }
  scanVideo.srcObject = null;
  scanStartButton.disabled = false;
  scanStopButton.disabled = true;
}

function showScanResult(value) {
  stopCamera();
  const resultCard = document.getElementById("scan-result-card");
  const resultText = document.getElementById("scan-result-text");
  const openButton = document.getElementById("scan-open");
  resultText.textContent = value;
  resultCard.hidden = false;

  let safeUrl = "";
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") safeUrl = url.href;
  } catch (_) {}
  openButton.hidden = !safeUrl;
  if (safeUrl) openButton.href = safeUrl;

  setScanStatus("QR Code berhasil dibaca.");
  resultCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function loadFallbackDecoder() {
  if (typeof window.jsQR === "function") return Promise.resolve();
  if (!fallbackDecoderPromise) {
    fallbackDecoderPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Pemindai QR tidak dapat dimuat. Periksa koneksi internet."));
      document.head.appendChild(script);
    });
  }
  return fallbackDecoderPromise;
}

async function decodeQrFromCanvas() {
  if ("BarcodeDetector" in window) {
    try {
      if (!qrDetector) qrDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const results = await qrDetector.detect(scanCanvas);
      return results.length ? results[0].rawValue : null;
    } catch (_) {}
  }

  await loadFallbackDecoder();
  const image = scanContext.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
  const result = window.jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
  return result ? result.data : null;
}

function scanCameraFrame() {
  if (!scanStream || scanVideo.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    scanFrame = requestAnimationFrame(scanCameraFrame);
    return;
  }

  const scale = Math.min(1, 800 / scanVideo.videoWidth);
  scanCanvas.width = Math.round(scanVideo.videoWidth * scale);
  scanCanvas.height = Math.round(scanVideo.videoHeight * scale);
  scanContext.drawImage(scanVideo, 0, 0, scanCanvas.width, scanCanvas.height);
  decodeQrFromCanvas().then(result => {
    if (!scanStream) return;
    if (result) showScanResult(result);
    else scanFrame = requestAnimationFrame(scanCameraFrame);
  }).catch(error => {
    stopCamera();
    setScanStatus(error.message || "Pemindaian QR gagal.", true);
  });
}

scanStartButton.addEventListener("click", async () => {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setScanStatus("Browser ini tidak mendukung akses kamera. Pilih gambar untuk memindai QR.", true);
    return;
  }

  scanStartButton.disabled = true;
  setScanStatus("Meminta akses kamera...");
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
    scanVideo.srcObject = scanStream;
    await scanVideo.play();
    document.getElementById("scan-placeholder").hidden = true;
    scanStopButton.disabled = false;
    setScanStatus("Arahkan kamera ke kode QR.");
    scanFrame = requestAnimationFrame(scanCameraFrame);
  } catch (error) {
    stopCamera();
    const message = error.name === "NotAllowedError"
      ? "Izin kamera ditolak. Aktifkan izin kamera atau pilih gambar."
      : "Kamera tidak dapat dibuka. Pastikan kamera tersedia dan halaman menggunakan HTTPS.";
    setScanStatus(message, true);
  }
});

scanStopButton.addEventListener("click", () => {
  stopCamera();
  document.getElementById("scan-placeholder").hidden = false;
  setScanStatus("Pemindaian kamera dihentikan.");
});

document.getElementById("scan-file").addEventListener("change", event => {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  stopCamera();
  document.getElementById("scan-placeholder").hidden = false;
  if (!file.type.startsWith("image/")) {
    setScanStatus("Pilih file gambar yang valid.", true);
    event.target.value = "";
    return;
  }

  const imageUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = async () => {
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    scanCanvas.width = Math.round(image.naturalWidth * scale);
    scanCanvas.height = Math.round(image.naturalHeight * scale);
    scanContext.drawImage(image, 0, 0, scanCanvas.width, scanCanvas.height);
    URL.revokeObjectURL(imageUrl);
    try {
      const result = await decodeQrFromCanvas();
      if (result) showScanResult(result);
      else setScanStatus("QR Code tidak ditemukan pada gambar.", true);
    } catch (error) {
      setScanStatus(error.message || "Gambar tidak dapat dipindai.", true);
    } finally {
      event.target.value = "";
    }
  };
  image.onerror = () => {
    URL.revokeObjectURL(imageUrl);
    setScanStatus("Gambar tidak dapat dibaca.", true);
    event.target.value = "";
  };
  image.src = imageUrl;
});

document.getElementById("scan-copy").addEventListener("click", async () => {
  const text = document.getElementById("scan-result-text").textContent;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Hasil scan disalin ✓");
  } catch (error) {
    setScanStatus("Tidak dapat mengakses papan klip. Salin teks hasil secara manual.", true);
  }
});

document.getElementById("scan-again").addEventListener("click", () => {
  document.getElementById("scan-result-card").hidden = true;
  document.getElementById("scan-placeholder").hidden = false;
  setScanStatus("Siap memindai kode QR.");
});

window.addEventListener("pagehide", stopCamera);

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
