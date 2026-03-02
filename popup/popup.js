// ── Element refs ──────────────────────────────────────────────────────────────
const siteInput    = document.getElementById("siteInput");
const modeSelect   = document.getElementById("modeSelect");
const hoursInput   = document.getElementById("hoursInput");
const minutesInput = document.getElementById("minutesInput");
const secondsInput = document.getElementById("secondsInput");
const blockButton  = document.getElementById("blockButton");
const siteList     = document.getElementById("siteList");
const timerRow     = document.getElementById("timerRow");
const toggleReveal = document.getElementById("toggleReveal");
const countBadge   = document.getElementById("countBadge");

// ── Modal refs ─────────────────────────────────────────────────────────────────
const passwordOverlay      = document.getElementById("passwordOverlay");
const passwordInput        = document.getElementById("passwordInput");
const passwordConfirmInput = document.getElementById("passwordConfirmInput");
const passwordModalTitle   = document.getElementById("passwordModalTitle");
const passwordModalSub     = document.getElementById("passwordModalSubtitle");
const passwordError        = document.getElementById("passwordError");
const passwordCancel       = document.getElementById("passwordCancel");
const passwordConfirm      = document.getElementById("passwordConfirm");

const deleteOverlay  = document.getElementById("deleteOverlay");
const deleteModalBody = document.getElementById("deleteModalBody");
const deleteCancel   = document.getElementById("deleteCancel");
const deleteConfirm  = document.getElementById("deleteConfirm");

let showNames = false;
let tickInterval = null;

// ── Timer row visibility ───────────────────────────────────────────────────────
modeSelect.addEventListener("change", () => {
  timerRow.classList.toggle("visible", modeSelect.value === "timer");
});

// ── Reveal / hide names ───────────────────────────────────────────────────────
toggleReveal.addEventListener("click", () => {
  if (!showNames) {
    openPasswordModal();
  } else {
    showNames = false;
    toggleReveal.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
      Reveal names`;
    loadBlockedSites();
  }
});

// ── Password modal logic ───────────────────────────────────────────────────────
let _isSettingPassword = false;

function closePasswordModal() {
  passwordOverlay.classList.remove("active");
  passwordInput.value = "";
  passwordConfirmInput.value = "";
  passwordError.textContent = "";
  passwordConfirmInput.style.display = "none";
  passwordModalTitle.textContent = "Enter Password";
  passwordModalSub.textContent = "Enter your password to reveal the blocked site names.";
  passwordConfirm.textContent = "Unlock";
  _isSettingPassword = false;
}

function openPasswordModal() {
  chrome.storage.local.get(["revealPassword"], (data) => {
    passwordInput.value = "";
    passwordConfirmInput.value = "";
    passwordError.textContent = "";

    if (!data.revealPassword) {
      // First time — prompt user to set a password
      _isSettingPassword = true;
      passwordModalTitle.textContent = "Set a Password";
      passwordModalSub.textContent = "No password set yet. Create one to protect the blocked site names.";
      passwordConfirmInput.style.display = "block";
      passwordConfirm.textContent = "Set Password";
    } else {
      _isSettingPassword = false;
      passwordModalTitle.textContent = "Enter Password";
      passwordModalSub.textContent = "Enter your password to reveal the blocked site names.";
      passwordConfirmInput.style.display = "none";
      passwordConfirm.textContent = "Unlock";
    }

    passwordOverlay.classList.add("active");
    setTimeout(() => passwordInput.focus(), 80);
  });
}

passwordCancel.addEventListener("click", closePasswordModal);

passwordOverlay.addEventListener("click", (e) => {
  if (e.target === passwordOverlay) closePasswordModal();
});

function submitPassword() {
  const val = passwordInput.value;

  if (_isSettingPassword) {
    // Setting a new password
    if (val.length < 4) {
      passwordError.textContent = "Password must be at least 4 characters.";
      return;
    }
    if (val !== passwordConfirmInput.value) {
      passwordError.textContent = "Passwords do not match.";
      passwordConfirmInput.value = "";
      passwordConfirmInput.focus();
      return;
    }
    chrome.storage.local.set({ revealPassword: val }, () => {
      showNames = true;
      closePasswordModal();
      toggleReveal.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </svg>
        Hide names`;
      loadBlockedSites();
    });
  } else {
    // Verifying existing password
    chrome.storage.local.get(["revealPassword"], (data) => {
      if (val === data.revealPassword) {
        showNames = true;
        closePasswordModal();
        toggleReveal.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
          Hide names`;
        loadBlockedSites();
      } else {
        passwordError.textContent = "Incorrect password. Try again.";
        passwordInput.value = "";
        passwordInput.focus();
      }
    });
  }
}

passwordConfirm.addEventListener("click", submitPassword);
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (_isSettingPassword) passwordConfirmInput.focus();
    else submitPassword();
  }
});
passwordConfirmInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitPassword();
});

// ── Normalise a user-supplied domain string ───────────────────────────────────
// Strips scheme, www., trailing slash, and path — keeps the full hostname
// including its TLD (e.g. "https://www.reddit.com/r/all" → "reddit.com")
function normaliseDomain(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]   // drop path
    .split("?")[0]   // drop query
    .split("#")[0];  // drop fragment
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRemaining(ms) {
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const parts = [];
  if (h) parts.push(`${h}h`);
  if (m || h) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function domainInitial(site) {
  return (site[0] || "?").toUpperCase();
}

// ── Render blocked list ───────────────────────────────────────────────────────
function loadBlockedSites() {
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }

  chrome.storage.sync.get(["blocked"], (data) => {
    const blocked = data.blocked || [];
    siteList.innerHTML = "";

    countBadge.textContent = `${blocked.length} site${blocked.length !== 1 ? "s" : ""}`;

    if (blocked.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
        </svg>
        <span>No sites blocked yet</span>`;
      siteList.appendChild(empty);
      return;
    }

    const hasTimer = blocked.some((e) => e.mode === "timer");

    blocked.forEach((entry, index) => {
      const li = document.createElement("li");
      li.className = "site-item";

      // Icon
      const icon = document.createElement("div");
      icon.className = "site-icon";
      icon.textContent = showNames ? domainInitial(entry.site) : "•";

      // Info
      const info  = document.createElement("div");
      info.className = "site-info";

      const name  = document.createElement("div");
      name.className = "site-name";
      name.textContent = showNames ? entry.site : "••••••••";

      const meta  = document.createElement("div");
      meta.className = "site-meta";

      if (entry.mode === "timer") {
        const now = Date.now();
        const remaining = entry.durationMs - (now - entry.addedAt);
        meta.textContent = remaining > 0
          ? `⏱ ${formatRemaining(remaining)}`
          : "Expired";
        meta.dataset.entry = index; // mark for live tick
      } else {
        meta.textContent = "Blocked forever";
      }

      info.append(name, meta);

      // Mode pill
      const pill = document.createElement("span");
      pill.className = `mode-pill ${entry.mode}`;
      pill.textContent = entry.mode === "permanent" ? "∞ perm" : "⏳ timer";

      // Remove button
      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.title = "Remove";
      removeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      removeBtn.addEventListener("click", () => {
        openDeleteModal(entry.site, () => {
          const updated = [...blocked];
          updated.splice(index, 1);
          chrome.storage.sync.set({ blocked: updated }, () => {
            loadBlockedSites();
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]?.id) chrome.tabs.reload(tabs[0].id);
            });
          });
        });
      });

      li.append(icon, info, pill, removeBtn);
      siteList.appendChild(li);
    });

    // Live-tick timer countdowns
    if (hasTimer) {
      tickInterval = setInterval(() => {
        const now = Date.now();
        blocked.forEach((entry, index) => {
          if (entry.mode !== "timer") return;
          const remaining = entry.durationMs - (now - entry.addedAt);
          const metaEl = siteList.querySelector(`[data-entry="${index}"]`);
          if (metaEl) {
            metaEl.textContent = remaining > 0 ? `⏱ ${formatRemaining(remaining)}` : "Expired";
          }
          if (remaining <= 0) {
            clearInterval(tickInterval);
            tickInterval = null;
            loadBlockedSites();
          }
        });
      }, 1000);
    }
  });
}

// ── Delete confirmation modal logic ───────────────────────────────────────────
let _pendingDeleteCallback = null;

function openDeleteModal(siteName, onConfirm) {
  if (showNames) {
    deleteModalBody.innerHTML = `Are you sure you want to remove <strong style="color:var(--danger)">${siteName}</strong> from the block list?`;
  } else {
    deleteModalBody.textContent = "Are you sure you want to remove this site from the block list?";
  }
  _pendingDeleteCallback = onConfirm;
  deleteOverlay.classList.add("active");
}

function closeDeleteModal() {
  deleteOverlay.classList.remove("active");
  _pendingDeleteCallback = null;
}

deleteCancel.addEventListener("click", closeDeleteModal);

deleteOverlay.addEventListener("click", (e) => {
  if (e.target === deleteOverlay) closeDeleteModal();
});

deleteConfirm.addEventListener("click", () => {
  if (_pendingDeleteCallback) _pendingDeleteCallback();
  closeDeleteModal();
});

// ── Add a site ────────────────────────────────────────────────────────────────
function addSite() {
  const site = normaliseDomain(siteInput.value);
  const mode = modeSelect.value;
  const hrs  = parseInt(hoursInput.value)   || 0;
  const mins = parseInt(minutesInput.value) || 0;
  const secs = parseInt(secondsInput.value) || 0;

  // Validation
  if (!site || site.length < 3) {
    alert("Please enter a valid domain (e.g. reddit.com).");
    return;
  }

  // Must contain at least one dot to have a TLD, unless it's a localhost-style host
  if (!site.includes(".") && site !== "localhost") {
    alert('Please include the domain extension (e.g. "reddit.com", not just "reddit").');
    return;
  }

  if (mode === "timer" && hrs === 0 && mins === 0 && secs === 0) {
    alert("Timer duration must be greater than 0.");
    return;
  }

  const durationMs = mode === "timer" ? (hrs * 3600 + mins * 60 + secs) * 1000 : null;

  const newEntry = { site, mode, durationMs, addedAt: Date.now() };

  chrome.storage.sync.get(["blocked"], (data) => {
    const existing = data.blocked || [];
    if (existing.some((e) => e.site === site)) {
      alert(`"${site}" is already in the block list.`);
      return;
    }

    existing.push(newEntry);
    chrome.storage.sync.set({ blocked: existing }, () => {
      loadBlockedSites();

      // Inject content.js immediately — no reload needed
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.id) {
          chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
        }
      });
    });

    // Clear inputs
    siteInput.value    = "";
    hoursInput.value   = "";
    minutesInput.value = "";
    secondsInput.value = "";
  });
}

blockButton.addEventListener("click", addSite);

// Allow pressing Enter in the domain field to submit
siteInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addSite();
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadBlockedSites();

