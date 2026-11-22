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
