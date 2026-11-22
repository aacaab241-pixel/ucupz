// ============================================================
// js/utils.js — Sanitasi data dan inisialisasi penyimpanan lokal
// ============================================================

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
