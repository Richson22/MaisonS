/**
 * ============================================================
 * MAISON S — DATA LAYER (API-backed)
 * ============================================================
 * Same public API as before (isHostableDay, getSpaces,
 * addBooking, isSpaceAvailable, etc.) — index.html and
 * admin.html don't need to change at all. Internally, this now
 * talks to the Express + MongoDB API in /server instead of
 * localStorage.
 *
 * Set window.MAISON_API_BASE before this script loads if your
 * API isn't running on http://localhost:4000, e.g.:
 *   <script>window.MAISON_API_BASE = "https://api.maison-s.ng/api";</script>
 *   <script src="js/db.js"></script>
 * ============================================================
 */

(function (global) {

  const API_BASE = global.MAISON_API_BASE || "http://localhost:4000/api";
  const TOKEN_KEY = "maisonS_admin_token";

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || null;
  }

  function setToken(token) {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  async function apiFetch(path, options = {}) {
    let res;
    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;

    try {
      res = await fetch(API_BASE + path, {
        headers: { ...headers, ...(options.headers || {}) },
        ...options
      });
    } catch (err) {
      throw new Error(
        "Could not reach the Maison S API at " + API_BASE +
        ". Is the server running (cd server && npm start)?"
      );
    }

    if (!res.ok) {
      let message = "Request failed (" + res.status + ")";
      try {
        const body = await res.json();
        if (body && body.error) message = body.error;
      } catch (e) {
        // response wasn't JSON — keep the generic message
      }
      throw new Error(message);
    }

    if (res.status === 204) return null;
    return res.json();
  }

  // ----------------------------------------------------------
  // Date helpers (pure — no network needed)
  // ----------------------------------------------------------

  function isHostableDay(dateStr) {
    if (!dateStr) return false;
    const parts = dateStr.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const day = d.getDay();
    return day === 0 || day === 5 || day === 6;
  }

  // ----------------------------------------------------------
  // ADMIN AUTH
  // ----------------------------------------------------------

  async function adminLogin(passcode) {
    const result = await apiFetch("/admin/login", {
      method: "POST",
      body: JSON.stringify({ passcode })
    });
    setToken(result.token);
    return result;
  }

  function adminLogout() {
    setToken(null);
  }

  function isLoggedIn() {
    return !!getToken();
  }

  // ----------------------------------------------------------
  // GALLERIES
  // ----------------------------------------------------------

  function getGalleries() {
    return apiFetch("/galleries");
  }

  async function uploadGalleryImage(cardKey, file) {
    const formData = new FormData();
    formData.append("image", file);

    const token = getToken();
    const headers = {};
    if (token) headers.Authorization = "Bearer " + token;

    let res;
    try {
      res = await fetch(API_BASE + "/galleries/" + encodeURIComponent(cardKey) + "/upload", {
        method: "POST",
        headers,
        body: formData
      });
    } catch (err) {
      throw new Error("Could not reach the Maison S API. Is the server running?");
    }

    if (!res.ok) {
      let message = "Upload failed (" + res.status + ")";
      try {
        const body = await res.json();
        if (body && body.error) message = body.error;
      } catch (e) {}
      throw new Error(message);
    }

    return res.json();
  }

  function deleteGalleryImage(cardKey, imageUrl) {
    return apiFetch("/galleries/" + encodeURIComponent(cardKey) + "/image", {
      method: "DELETE",
      body: JSON.stringify({ imageUrl })
    });
  }

  // ----------------------------------------------------------
  // SITE CONTENT
  // ----------------------------------------------------------

  function getContent() {
    return apiFetch("/content");
  }

  function updateContent(updates) {
    return apiFetch("/content", {
      method: "PATCH",
      body: JSON.stringify(updates)
    });
  }

  // ----------------------------------------------------------
  // SPACES
  // ----------------------------------------------------------
  function getSpaces({ includeInactive = false } = {}) {
    return apiFetch("/spaces" + (includeInactive ? "?includeInactive=true" : ""));
  }

  function addSpace({ name, capacity, description, priceLabel }) {
    return apiFetch("/spaces", {
      method: "POST",
      body: JSON.stringify({ name, capacity, description, priceLabel })
    });
  }

  function updateSpace(id, updates) {
    return apiFetch("/spaces/" + encodeURIComponent(id), {
      method: "PATCH",
      body: JSON.stringify(updates)
    });
  }

  async function deleteSpace(id) {
    await apiFetch("/spaces/" + encodeURIComponent(id), { method: "DELETE" });
    return true;
  }

  // ----------------------------------------------------------
  // BOOKINGS
  // ----------------------------------------------------------

  function getBookings() {
    return apiFetch("/bookings");
  }

  function addBooking({ type, name, email, phone, guests, date, spaceId, notes }) {
    return apiFetch("/bookings", {
      method: "POST",
      body: JSON.stringify({ type, name, email, phone, guests, date, spaceId, notes })
    });
  }

  function updateBookingStatus(id, status) {
    return apiFetch("/bookings/" + encodeURIComponent(id) + "/status", {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
  }
    function sendBookingMessage(id, subject, message) {
    return apiFetch("/bookings/" + encodeURIComponent(id) + "/message", {
      method: "POST",
      body: JSON.stringify({ subject, message })
    });
  }

  async function deleteBooking(id) {
    await apiFetch("/bookings/" + encodeURIComponent(id), { method: "DELETE" });
    return true;
  }

  // ----------------------------------------------------------
  // MANUAL AVAILABILITY BLOCKS
  // ----------------------------------------------------------

  function getBlocks() {
    return apiFetch("/blocks");
  }

  function addBlock({ spaceId, date, reason }) {
    return apiFetch("/blocks", {
      method: "POST",
      body: JSON.stringify({ spaceId, date, reason })
    });
  }

  async function removeBlock(id) {
    await apiFetch("/blocks/" + encodeURIComponent(id), { method: "DELETE" });
    return true;
  }

  // ----------------------------------------------------------
  // AVAILABILITY
  // ----------------------------------------------------------

  function getAvailabilityForDate(date) {
    return apiFetch("/availability?date=" + encodeURIComponent(date));
  }

  async function isSpaceAvailable(spaceId, date) {
    const availability = await getAvailabilityForDate(date);
    const entry = availability.find((s) => s.id === spaceId);
    return entry ? entry.available : false;
  }

  // ----------------------------------------------------------
  // CHANGE NOTIFICATIONS
  // There's no localStorage "storage" event to hook anymore
  // now that data lives on a server, so this polls instead.
  // Good enough for an admin dashboard; swap for WebSockets /
  // Server-Sent Events later if you want instant push updates.
  // ----------------------------------------------------------

  function onChange(callback, intervalMs = 5000) {
    setInterval(callback, intervalMs);
  }

  // ----------------------------------------------------------
  // PUBLIC API
  // ----------------------------------------------------------

  global.MaisonDB = {
    isHostableDay,
    adminLogin,
    adminLogout,
    isLoggedIn,
    getContent,
    updateContent,
    getGalleries,
    uploadGalleryImage,
    deleteGalleryImage,
    getSpaces,
    addSpace,
    updateSpace,
    deleteSpace,
    getBookings,
    addBooking,
    updateBookingStatus,
    sendBookingMessage,
    deleteBooking,
    getBlocks,
    addBlock,
    removeBlock,
    isSpaceAvailable,
    getAvailabilityForDate,
    onChange
  };

})(window);