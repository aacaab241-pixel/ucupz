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
