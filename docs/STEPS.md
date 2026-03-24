# SHEQ-AI — Full Development Steps Log

**Project:** SHEQ-AI Web Application
**Organisation:** GRCentral
**Date Range:** March 2026
**Repository:** https://github.com/grcentral/sheq-ai

---

## Phase 1 — Initial App Creation

### Step 1 — Requirements Gathering
**Input:** System prompt and feature specification covering:
- 10 SHEQ modules: Dashboard, Job Observations, Near Miss, Incidents, Permit to Work, Risk Register, Legal Register, SHEQ Calendar, Monthly Report, SHEQ-AI Chat
- CTRG branding (Central Térmica de Ressano Garcia)
- Mozambique-specific legal references
- ISO 45001, 14001, 9001, 31000 alignment
- 5×5 risk matrix (P1–P5 × I1–I5, scores 1–25)
- CAPA format: WHAT/WHO/WHEN/HOW
- Severity scale: 1=Critical, 2=High, 3=Medium, 4=Low
- RAG status reporting

### Step 2 — Single-File HTML App Built
**File created:** `C:/Users/USER/OneDrive/Desktop/App Codes/GRC/SHEQ-AI.html`
**Architecture decision:** Single HTML file (no build step, no backend, no npm)
**Dependencies:** Chart.js 4.4.0 (CDN) for charts
**Initial data layer:** localStorage (later upgraded to Firebase, then back to localStorage)

**Modules implemented:**
- Sidebar navigation with icons
- Dashboard with 4 KPI cards and 3 Chart.js charts
- All 10 module pages with CRUD operations
- Risk matrix interactive 5×5 grid
- SHEQ Calendar with clickable cells
- Monthly Report generator (Sections A–I)
- Claude API streaming chat integration

---

## Phase 2 — GitHub Pages Deployment

### Step 3 — GitHub Repository Created via API
```bash
curl -X POST https://api.github.com/user/repos \
  -H "Authorization: Bearer {PAT}" \
  -H "Content-Type: application/json" \
  -d '{"name":"sheq-ai","description":"SHEQ Management System","public":true}'
```
**Issue encountered:** First attempt returned HTTP 400 — missing `Content-Type: application/json` header.
**Fix:** Added explicit `Content-Type` header.

### Step 4 — Local Git Repository Initialised
```bash
cd "C:/Users/USER/OneDrive/Desktop/App Codes/GRC"
git init
git remote add origin https://github.com/grcentral/sheq-ai.git
cp SHEQ-AI.html index.html
git add index.html
git commit -m "Initial SHEQ-AI deployment"
git push -u origin main
```

### Step 5 — GitHub Pages Enabled
```bash
curl -X POST https://api.github.com/repos/grcentral/sheq-ai/pages \
  -H "Authorization: Bearer {PAT}" \
  -H "Content-Type: application/json" \
  -d '{"source":{"branch":"main","path":"/"}}'
```
**Live URL confirmed:** https://grcentral.github.io/sheq-ai/

---

## Phase 3 — Multi-Device Sync Fix (Firebase)

### Step 6 — Problem Identified
**User report:** "I tried adding an observation from a different device and it's only reflecting in that device not in all logins."

**Root cause:** App was using `localStorage` — which is per-device and per-browser. Data entered on Device A never reached Device B.

### Step 7 — Firebase Realtime Database Integration
**Firebase project created:** `ctrg-sheq-ai`
**Database URL:** `https://ctrg-sheq-ai-default-rtdb.firebaseio.com`

**Firebase config added to SHEQ-AI.html:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAVoruGdEk7wGPOdKtdrD4MzEZs6zIvAzI",
  authDomain: "ctrg-sheq-ai.firebaseapp.com",
  databaseURL: "https://ctrg-sheq-ai-default-rtdb.firebaseio.com",
  projectId: "ctrg-sheq-ai",
  storageBucket: "ctrg-sheq-ai.firebasestorage.app",
  messagingSenderId: "476450226116",
  appId: "1:476450226116:web:bd42e059f78cad8e60ae91"
};
firebase.initializeApp(firebaseConfig);
const _db = firebase.database();
```

**CDN scripts added:**
```html
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js"></script>
```

**Real-time sync implemented:**
```javascript
// All clients listen for changes
_db.ref('sheqai').on('value', snapshot => {
  _appData = snapshot.val();
  navigateTo(currentPage); // re-render current page
});

// Write: overwrites entire JSON tree
window.saveData = function(d) {
  _db.ref('sheqai').set(d);
};
```

**Sync status indicator added** to topbar: `⬤ Synced` / `⬤ Saving…` / `⬤ Offline`

**Firebase database security rules** (required to be set in Firebase Console to allow public read/write — Test Mode):
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

### Step 8 — Deployed Firebase Version
```bash
cp SHEQ-AI.html index.html
git add index.html SHEQ-AI.html
git commit -m "Add Firebase real-time sync for multi-device data"
git push origin main
```

---

## Phase 4 — White Theme + SHEQwise Rebrand

### Step 9 — White Theme Applied
**User request:** "Adjust the design using the most recommendable size of table and letters and use a white background. Change the name CTRG to SHEQwise."

**CSS variables updated:**
```css
/* Before (dark theme) */
--bg:#0e1117; --sidebar:#161b27; --card:#1a2035;

/* After (white/light professional theme) */
--bg:#f0f2f5; --sidebar:#ffffff; --card:#ffffff; --card2:#f8fafc;
--border:#e2e8f0; --accent:#2563eb; --text:#1e293b; --muted:#475569;
```

**Muted colour changed** from `#64748b` (4.1:1 contrast) to `#475569` (5.8:1 contrast) for WCAG 2.1 AA compliance.

**rgba dark overlays replaced** with solid pastel equivalents:
```css
/* Before */
rgba(0,200,83,.15) → #dcfce7  (green tint)
rgba(255,23,68,.15) → #fee2e2 (red tint)

/* After — WCAG compliant solid pastel */
```

### Step 10 — Professional Enterprise Design System Applied
**User specification included:**
- Inter font via Google Fonts
- 6-size typographic scale in rem: 0.75 / 0.875 / 1 / 1.25 / 1.5 / 2rem
- 8px spacing grid: `--sp-0` through `--sp-5`
- Table: `font-size: 0.875rem`, row height ~44px, zebra striping, sticky thead
- Sort indicators on `th[data-sort]` via `::after` pseudo-element (⇅ / ↑ / ↓)
- Focus rings: `box-shadow: 0 0 0 3px rgba(37,99,235,.12)`
- Border-radius tokens: `--radius-sm/md/lg/pill`
- Shadow tokens: `--shadow-sm/md/lg`

### Step 11 — CTRG → SHEQwise Rename
All instances replaced via `sed` commands:
```bash
sed -i 's/CTRG/SHEQwise/g' SHEQ-AI.html
```
Locations updated:
- Page `<title>`
- Sidebar logo text
- System prompt (AI chat)
- Monthly report footer
- Document reference prefix
- Activity feed descriptions
- Sample data strings

**Note:** Company name "Central Térmica de Ressano Garcia" retained in report headers and legal items (factual information).

---

## Phase 5 — v2 Major Improvements (10-Point Spec)

### Step 12 — Architecture Review
**Decision:** Revert to localStorage as primary data layer.

**Reasons:**
1. Firebase security rules required manual Firebase Console configuration that caused sync issues
2. Prompt specification explicitly stated: "No backend — all data in localStorage"
3. JSON export/import provides an adequate offline backup mechanism
4. localStorage avoids CORS, authentication, and network dependency issues

**Firebase CDN scripts removed** from HTML head.

### Step 13 — New File Written (3,952 lines)

The complete rewrite was executed in 3 parts:

#### Part 1 — HTML Head + Complete CSS (~1,940 lines)
Built from scratch with:
- All CSS variables from design system spec
- New additions: RAG row classes (`.row-red`, `.row-amber`, `.row-green`)
- PTW risk section styles (`.risk-section`, `.risk-section-header`, `.risk-section-body`)
- CAPA badge styles (`.capa-badge`)
- API warning box (`.api-warning`)
- Mobile responsive `@media (max-width: 768px)` block
- Mobile bottom nav (`#mobile-nav`, `.mobile-nav-item`)
- `.mobile-cards` card table layout for mobile
- `.ppe-checkbox-grid` for PTW PPE checkboxes
- `.kpi-grid` updated to 5 columns (was 4)
- Connection status: added `.ready`, `.loading`, `.ai-ready` classes

#### Part 2 — HTML Body + All Modals (~713 lines)
Pages added/updated:
- All 11 page `div` elements (added CAPA Tracker between Monthly Report and Chat)
- Enhanced **Observation modal**: added CAPA WHAT/WHO/WHEN/HOW fields (hidden until CAPA=Y)
- Enhanced **Near Miss modal**: added CAPA fields, Priority field
- Enhanced **PTW modal**: added full collapsible Risk Assessment section with PPE checkboxes
- Enhanced **Incident modal**: added Priority and CAPA Required fields
- Enhanced **Risk modal**: added CAPA Required field
- Enhanced **Legal modal**: added Reference field, SCHEDULED status option
- **New CAPA modal**: CAPA ID (auto-generated), Source Module, Source Ref, WHAT/WHO/WHEN/HOW, Priority, Status, Closed Date, Evidence
- Enhanced **Settings modal**: API key security warning, Export/Import JSON buttons, Reset All Data button
- Mobile bottom navigation bar (6 items)

#### Part 3 — Complete JavaScript (~1,305 lines in 2 sub-parts)

**Part 3a — Data layer through Incidents:**
- `getData()` / `saveData(d)` — localStorage functions
- `getDefaultData()` — pre-loaded sample data including 10 Mozambican legal items
- `buildDefaultCalendar()` — 19 activities scheduled per specification
- `genCapaId(capas)` — CAPA-YYYY-NNN format generator
- `autoCreateCapa(...)` — auto-generation helper
- `autoMarkOverdue(d)` — overdue detection on load
- All utility functions: `riskRating`, `ratingPill`, `sevPill`, `priorityPill`, `statusPill`, `typePill`, `ptwTypeIcon`, `capaBadge`, `getPTWStatus`, `fmtDate`, `truncate`, `escapeHtml`, `today`, `daysOpen`, `getDaysUntil`
- Modal helpers: `openModal`, `closeModal`
- Pagination: `paginate`, `renderPagination`
- Navigation: `navigateTo` (11 pages including CAPA)
- Dashboard: `renderDashboard` — real data for all 5 KPIs and 3 charts
- Observations: full CRUD with CAPA auto-generation, CSV export, stats row
- Near Miss: full CRUD with CAPA auto-generation, multi-filter
- Incidents: full CRUD with CAPA auto-generation, KPI mini-row

**Part 3b — PTW through Init:**
- PTW: `calcPTWRisk` (before/after risk calculation), `getPpeList`, full CRUD, status colour coding, CAPA auto-generation
- Risk Register: `renderRiskMatrix` (interactive 5×5), `calcRisk`, full CRUD, CAPA auto-generation
- Legal Register: full CRUD with edit, multi-filter, pre-loaded data on first load
- Calendar: `renderCalendar` (year tabs, activity grid), `toggleCal` (cycles blank→planned→completed→missed)
- CAPA Tracker: `renderCapas` (RAG row colouring, sort by status, stats row), `editCapa`, `saveCapa`, `deleteCapa`, `highlightCapa` (navigate + scroll to row)
- Monthly Report: `generateReport` — all 11 sections with real data, RAG logic, LTIFR calculation, print CSS
- Settings: `saveApiKey`, `clearApiKey`, `testApiKey`, `exportJSON`, `importJSON`, `resetData`
- CSV Export: `exportCSV(module)` — handles all 7 modules with correct column definitions
- Claude Chat: `streamChat` (SSE), `initChat`, `sendChatMessage`, `clearChat`, `onChunk`, `onDone`
- Init: `DOMContentLoaded` — load/create data, mark overdue, update status, navigate to dashboard

### Step 14 — Deploy v2 to GitHub Pages
```bash
cp SHEQ-AI.html index.html
git add index.html SHEQ-AI.html
git commit -m "Complete SHEQ-AI v2 rewrite: 10 major improvements"
git push origin main
```
**Result:** 6,794 lines inserted, 2,906 deleted (net +3,888 lines)
**Commit hash:** 1dfcac3

---

## Errors Encountered and Resolutions

| # | Error | Cause | Fix |
|---|---|---|---|
| 1 | Write tool "missing content" error | Tool parameter validation | Used Agent subagent instead |
| 2 | Agent usage limit hit | Rate limiting | Waited for reset, resumed |
| 3 | GitHub API 400 on repo creation | Missing `Content-Type: application/json` | Added header to curl command |
| 4 | Multi-device sync not working | Firebase database security rules locked (`.read: false`) | Set rules to `{".read":true,".write":true}` in Firebase Console |
| 5 | `sed` encoding issue with `&` in system prompt | Unescaped `&` in sed replacement string | Used `\&` escape character |
| 6 | Edit tool "file not read" error | Attempted edit without prior read | Used `sed` bash command for that substitution |
| 7 | `git push` ran in background without output | Background job flag | Confirmed via `git push` re-run returning "Everything up-to-date" |
| 8 | Chart.js charts not destroying on re-render | Previous chart instance not cleaned up | Added `if(chart) chart.destroy()` before each `new Chart()` |

---

## Summary of Changes by Phase

| Phase | Key Deliverable | Lines Changed |
|---|---|---|
| 1 | Initial 10-module app | ~2,009 |
| 2 | GitHub Pages deployment | +3 (index.html copy) |
| 3 | Firebase real-time sync | +200 |
| 4 | White theme + SHEQwise rebrand + design system | +400 |
| 5 | v2 complete rewrite | 3,952 total |

---

## File Checksums (v2)

| File | Lines | Description |
|---|---|---|
| `index.html` | 3,952 | Live deployment file (GitHub Pages) |
| `SHEQ-AI.html` | 3,952 | Development working copy |
| `docs/README.md` | ~450 | Full technical documentation |
| `docs/STEPS.md` | ~280 | This development log |
| `docs/DATA_MODEL.md` | ~120 | Data schema quick reference |

---

*Development log compiled by SHEQ Department | Central Térmica de Ressano Garcia | March 2026*
