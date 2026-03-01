// IIFE — runs on every page load to check if the current site is blocked
(async () => {
  const [{ blocked }, { blockConfig }] = await Promise.all([
    chrome.storage.sync.get("blocked"),
    chrome.storage.sync.get("blockConfig"),
  ]);

  // Normalise the current page's hostname (strip leading www.)
  const domain = location.hostname.replace(/^www\./, "").toLowerCase();
  const now = Date.now();

  /**
   * Domain-aware match:
   *   stored "github.com"   matches "github.com" and "sub.github.com"
   *   stored "github"       is treated as a bare label and only matches
   *                         hostnames equal to "github" (no extension leak)
   * This prevents "face" matching "interface.io" etc.
   */
  function domainMatches(stored, current) {
    const s = stored.toLowerCase();
    return current === s || current.endsWith("." + s);
  }

  const matchedEntry = (blocked || []).find((entry) => {
    if (!domainMatches(entry.site, domain)) return false;

    if (entry.mode === "permanent") return true;

    if (entry.mode === "timer") {
      const remainingMs = entry.durationMs - (now - entry.addedAt);
      return remainingMs > 0;
    }

    return false;
  });

  if (!matchedEntry) return;

  // Prevent body scroll while overlay is shown
  document.documentElement.style.overflow = "hidden";

  // Inject overlay
  const config = blockConfig || {};
  const message = config.message || "This site is blocked.";

  const overlay = document.createElement("div");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f0f 100%)",
    color: "#fff",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: "2147483647",
    textAlign: "center",
    flexDirection: "column",
    userSelect: "none",
    gap: "16px",
  });

  // Shield icon
  const icon = document.createElement("div");
  icon.innerHTML = `<svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="#4f8ef7" opacity="0.9"/>
    <path d="M10 14l-2-2 1.4-1.4L10 11.2l4.6-4.6L16 8l-6 6z" fill="white"/>
  </svg>`;
  icon.style.filter = "drop-shadow(0 0 20px rgba(79,142,247,0.6))";

  // Heading
  const heading = document.createElement("div");
  heading.textContent = "Access Blocked";
  Object.assign(heading.style, {
    fontSize: "clamp(24px, 4vw, 48px)",
    fontWeight: "700",
    letterSpacing: "-0.5px",
    color: "#f0f0f0",
  });

  // Message
  const msg = document.createElement("div");
  msg.textContent = message;
  Object.assign(msg.style, {
    fontSize: "clamp(14px, 1.8vw, 20px)",
    color: "#a0aec0",
    maxWidth: "480px",
    lineHeight: "1.5",
  });

  // Domain pill
  const domainPill = document.createElement("div");
  domainPill.textContent = domain;
  Object.assign(domainPill.style, {
    display: "inline-block",
    padding: "6px 16px",
    background: "rgba(79,142,247,0.15)",
    border: "1px solid rgba(79,142,247,0.4)",
    borderRadius: "999px",
    fontSize: "clamp(12px, 1.4vw, 16px)",
    color: "#4f8ef7",
    fontFamily: "'Courier New', monospace",
    letterSpacing: "0.5px",
  });

  // Timer badge (only shown for timer mode)
  const timerBadge = document.createElement("div");
  Object.assign(timerBadge.style, {
    padding: "8px 20px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: "8px",
    fontSize: "clamp(13px, 1.6vw, 18px)",
    color: "#e2e8f0",
    fontVariantNumeric: "tabular-nums",
    display: matchedEntry.mode === "timer" ? "block" : "none",
  });

  overlay.append(icon, heading, domainPill, msg, timerBadge);
  document.body.appendChild(overlay);

  // Handle countdown
  if (matchedEntry.mode === "timer") {
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = matchedEntry.durationMs - (now - matchedEntry.addedAt);

      if (remaining <= 0) {
        clearInterval(interval);
        overlay.remove();
        document.documentElement.style.overflow = "";

        chrome.storage.sync.get(["blocked"], (data) => {
          const sites = data.blocked || [];
          const updated = sites.filter((e) => e.site !== matchedEntry.site);
          chrome.storage.sync.set({ blocked: updated });
        });
      } else {
        const h   = Math.floor(remaining / 3600000);
        const m   = Math.floor((remaining % 3600000) / 60000);
        const s   = Math.floor((remaining % 60000) / 1000);
        const parts = [];
        if (h) parts.push(`${h}h`);
        if (m || h) parts.push(`${m}m`);
        parts.push(`${s}s`);
        timerBadge.textContent = `⏱ Unblocking in ${parts.join(" ")}`;
      }
    }, 500);

    // Trigger first render immediately
    const initRemaining = matchedEntry.durationMs - (Date.now() - matchedEntry.addedAt);
    if (initRemaining > 0) {
      const h = Math.floor(initRemaining / 3600000);
      const m = Math.floor((initRemaining % 3600000) / 60000);
      const s = Math.floor((initRemaining % 60000) / 1000);
      const parts = [];
      if (h) parts.push(`${h}h`);
      if (m || h) parts.push(`${m}m`);
      parts.push(`${s}s`);
      timerBadge.textContent = `⏱ Unblocking in ${parts.join(" ")}`;
    }
  }
})();
