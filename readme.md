# IRLMode

Another site blocker and  lightweight Manifest V3 Chrome extension that blocks any website with a full-page overlay. Supports permanent blocking and timer-based blocking with live countdown. No external dependencies, no backend — everything runs locally using the Chrome Extension APIs.

---

## Features

- **Block any domain** — works with any TLD (`.com`, `.io`, `.org`, `.net`, `.co.uk`, etc.)
- **Permanent mode** — site stays blocked until you manually remove it
- **Timer mode** — site unblocks automatically after the configured duration (hours / minutes / seconds)
- **Live countdown** — both the popup and the in-page overlay tick in real time
- **No reload required** — `content.js` is injected immediately into the active tab on block
- **Privacy-first** — site names are masked by default in the popup; revealed only on explicit confirmation
- **Persistent storage** — block list survives browser restarts via `chrome.storage.sync`
- **Exact domain matching** — blocks `reddit.com` and `sub.reddit.com` without accidentally matching unrelated hostnames

---

## Project Structure

```
site-blocker-extension/
├── manifest.json          # Extension manifest (MV3)
├── content.js             # Injected into every page; renders the blocking overlay
├── popup/
│   ├── index.html         # Popup UI markup & styles
│   └── popup.js           # Popup logic — add, remove, and list blocked sites
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   └── icon120.png
└── fonts/
    └── Chillax-Variable.ttf
```

---

## Installation

> Requires Google Chrome (or any Chromium-based browser).

1. **Clone the repository**
   ```bash
   git clone https://github.com/JeraldPascual/site-blocker-extension.git
   cd site-blocker-extension
   ```

2. **Open the Extensions page**
   ```
   chrome://extensions/
   ```

3. **Enable Developer Mode** (toggle in the top-right corner)

4. Click **"Load unpacked"** and select the cloned project folder

5. The extension icon will appear in your toolbar — click it to open the popup

---

## Usage

1. Click the **Site Blocker** icon in the Chrome toolbar
2. Enter a domain in the input field (e.g. `reddit.com`, `youtube.com`, `x.com`)
3. Choose a blocking mode:
   - **Permanent** — blocked indefinitely
   - **Timer** — blocked for a specified duration
4. If using Timer mode, set hours / minutes / seconds
5. Click **Block Site**

The target domain will show a full-page overlay immediately — no page reload required.

To **remove a site**, click the × button next to its entry in the blocked list.

---

## How It Works

### `manifest.json`

Declares the extension with Manifest V3. Key permissions:

| Permission | Purpose |
|---|---|
| `storage` | Persist the blocked-sites list via `chrome.storage.sync` |
| `scripting` | Programmatically inject `content.js` into the active tab |
| `tabs` | Query and reload the active tab when needed |
| `host_permissions: <all_urls>` | Allow content script injection on any URL |

---

### `popup.js`

Handles all user interactions inside the popup:

- **`normaliseDomain(raw)`** — strips `https://`, `www.`, paths, query strings, and fragments from any pasted URL, then lowercases the result. This ensures `https://www.Reddit.com/r/all` is stored as `reddit.com`.
- **`addSite()`** — validates input, prevents duplicates, persists the new entry to `chrome.storage.sync`, and immediately injects `content.js` into the active tab.
- **`loadBlockedSites()`** — reads storage and re-renders the blocked list. For timer entries, a `setInterval` ticks the countdown every second directly in the popup.
- **Reveal / hide toggle** — site names are masked as `••••••••` by default. The user must confirm before names are revealed.

---

### `content.js`

Runs in the context of every visited page (injected via `content_scripts` at document start, and re-injected programmatically on new blocks):

- **`domainMatches(stored, current)`** — performs an exact or subdomain-aware match:
  - `stored = "reddit.com"` matches `reddit.com` and `old.reddit.com`
  - `stored = "reddit.com"` does **not** match `notreddit.com` (unlike a naive `includes()`)
- If a match is found and the block is still valid, a fullscreen overlay is injected into `document.body` using only JavaScript — no external CSS file required.
- For timer mode, a `setInterval` ticks the countdown every 500 ms. When the timer expires, the overlay is removed, `document.documentElement.style.overflow` is restored, and the entry is deleted from storage — all without a page reload.

---

## Domain Matching Rules

| Input entered | Stored as | Matches |
|---|---|---|
| `reddit.com` | `reddit.com` | `reddit.com`, `old.reddit.com` |
| `https://www.youtube.com/watch?v=xyz` | `youtube.com` | `youtube.com`, `m.youtube.com` |
| `x.com` | `x.com` | `x.com` |
| `app.example.co.uk` | `app.example.co.uk` | `app.example.co.uk` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension platform | Chrome Extensions — Manifest V3 |
| Storage | `chrome.storage.sync` |
| Scripting | `chrome.scripting.executeScript` |
| UI | Vanilla HTML / CSS / JavaScript |
| Fonts | Chillax Variable (`@font-face`) |

No build tools, no bundler, no frameworks.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit your changes (`git commit -m 'feat: description'`)
4. Push and open a pull request


