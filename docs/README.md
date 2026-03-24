# SHEQ-AI — Technical Documentation

**Version:** 2.0
**Date:** March 2026
**Organisation:** GRCentral
**Facility:** 175 MW Gas-Fired Power Plant, Ressano Garcia, Mozambique
**Department:** Safety, Health, Environment & Quality (SHEQ)
**Live URL:** https://grcentral.github.io/sheq-ai/

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Module Reference](#4-module-reference)
5. [Data Model](#5-data-model)
6. [CAPA Auto-Generation Logic](#6-capa-auto-generation-logic)
7. [Risk Matrix](#7-risk-matrix)
8. [Claude AI Integration](#8-claude-ai-integration)
9. [Data Persistence](#9-data-persistence)
10. [CSV & JSON Export/Import](#10-csv--json-exportimport)
11. [Deployment (GitHub Pages)](#11-deployment-github-pages)
12. [Mobile Responsiveness](#12-mobile-responsiveness)
13. [Design System](#13-design-system)
14. [Security Considerations](#14-security-considerations)
15. [Known Limitations](#15-known-limitations)
16. [Future Enhancements](#16-future-enhancements)

---

## 1. Project Overview

SHEQ-AI is a **single-file HTML web application** built for the SHEQ department of Central Térmica de Ressano Garcia. It provides a complete digital SHEQ management system requiring no server, no database server, no build step, and no installation. It runs entirely in the browser.

### Key Capabilities

| Capability | Detail |
|---|---|
| Job Observations | Record SAFE / AT-RISK / IMPROVEMENT field observations |
| Near Miss Reporting | Log near misses with HiPo flag and severity classification |
| Incident Register | Track incidents with CAPA assignment and root cause |
| Permit to Work | Issue, activate, close permits with embedded risk assessment |
| Risk Register | 5×5 matrix-based risk identification and residual rating |
| Legal Register | Mozambican legislation compliance tracking |
| SHEQ Calendar | Monthly activity planning with Planned/Completed/Missed states |
| Monthly Report | Auto-generated Sections A–K from live data |
| CAPA Tracker | Standalone corrective action management with RAG status |
| SHEQ-AI Chat | Claude AI assistant with SHEQ-specific system prompt |

### Standards Alignment

- ISO 45001:2018 — Occupational Health & Safety
- ISO 14001:2015 — Environmental Management
- ISO 9001:2015 — Quality Management
- ISO 31000:2018 — Risk Management
- Decreto n.º 94/2024 — Mozambican occupational regulations
- Lei n.º 20/2014 — Environmental Law (Mozambique)
- Lei n.º 5/2017 — Work Safety Law (Mozambique)
- Lei n.º 23/2007 — Labour Law (Mozambique)

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Client)                   │
│                                                       │
│  ┌──────────────┐    ┌──────────────────────────┐    │
│  │  index.html  │    │      localStorage         │    │
│  │  (3,952 lines│◄──►│   key: "sheqai_v2"        │    │
│  │  all-in-one) │    │   value: JSON (all data)  │    │
│  └──────┬───────┘    └──────────────────────────┘    │
│         │                                             │
│         │  CDN                                        │
│         ├── Chart.js 4.4.0 (charts)                  │
│         ├── Google Fonts: Inter                       │
│         │                                             │
│         │  External API (user-supplied key)           │
│         └── api.anthropic.com/v1/messages (AI chat)  │
└─────────────────────────────────────────────────────┘

Hosting: GitHub Pages (static, no server required)
URL: https://grcentral.github.io/sheq-ai/
```

### File Structure

```
/sheq-ai (GitHub repo)
├── index.html        ← The entire application (3,952 lines)
├── SHEQ-AI.html      ← Development copy (identical to index.html)
└── docs/
    ├── README.md     ← This file
    ├── STEPS.md      ← Full development steps log
    └── DATA_MODEL.md ← Data schema reference
```

---

## 3. Technology Stack

| Component | Technology | Version | Source |
|---|---|---|---|
| UI Framework | Vanilla HTML/CSS/JS | — | Inline |
| Charts | Chart.js | 4.4.0 | CDN |
| Fonts | Inter (Google Fonts) | — | CDN |
| Data store | localStorage | — | Browser native |
| AI Chat | Anthropic Claude API | claude-opus-4-5 | REST (user key) |
| Hosting | GitHub Pages | — | github.com |
| Build step | **None** | — | Single file |

**No npm, no webpack, no Node.js, no backend server required.**

---

## 4. Module Reference

### 4.1 Dashboard

- **5 KPI cards:** Total Observations (month), Near Misses (YTD), Open Incidents, Open CAPAs, CAPAs Overdue (red when > 0)
- **Charts:** Incident Trend (bar, last 6 months), Observation Ratio (pie: Safe/At-Risk/Improvement), Risk by Residual Rating (donut: LOW/MEDIUM/HIGH/EXTREME)
- **Activity Feed:** 8 most recent events across incidents, near misses, observations
- All values pulled from real localStorage data

### 4.2 Job Observations (JO)

- **Fields:** Observer, Date, Location, Work Activity, Type (SAFE/AT-RISK/IMPROVEMENT), Description, Immediate Action, CAPA Required, Priority
- **CAPA auto-generation:** If CAPA Required = Yes, a CAPA Tracker record is automatically created with pre-filled WHAT/WHO/WHEN/HOW fields
- **Filters:** Search (text), Type
- **Export:** CSV
- **ID format:** OBS-001, OBS-002…

### 4.3 Near Miss Register (NM)

- **Fields:** Reporter, Date, Location, Description, Potential Outcome, HiPo flag, Severity (1–4), Immediate Action, Investigation Status, CAPA Required, Priority
- **Severity scale:** 1=Critical, 2=High, 3=Medium, 4=Low
- **HiPo:** High Potential — flagged with 🔴 in table
- **CAPA auto-generation:** When CAPA Required = Yes
- **Filters:** Search, Severity, Status
- **Export:** CSV
- **ID format:** NM-001, NM-002…

### 4.4 Incident Register (INC)

- **Fields:** Date, Type, Severity, Location, Description, Person Involved, Status, Root Cause, CAPA Details (WHAT/WHO/WHEN/HOW), Priority
- **CAPA auto-generation:** Automatically when CAPA WHAT field is filled in
- **KPI mini-row:** Total / Critical / High / Medium counts
- **Filters:** Search, Severity, Type
- **Export:** CSV
- **ID format:** INC-001, INC-002…

### 4.5 Permit to Work (PTW)

- **Core fields:** Type (Hot Work/Electrical/Confined Space/Working at Height/Line Breaking), Requestor, Activity, Location, Valid From/To, Precautions
- **Risk Assessment section (collapsible):**
  - Hazard Identification (textarea)
  - Risk Before Controls: P × I → auto-calculated Score and Rating
  - Control Measures
  - Risk After Controls: Residual P × I → auto-calculated Residual Score and Rating
  - PPE Checkboxes: Hard hat, Safety glasses, Gloves, Safety boots, Harness, FR clothing, Respirator, Face shield, Other
  - Isolation Confirmed (Yes/No)
  - Emergency Plan in Place (Yes/No)
- **Status colour coding:** Green=ACTIVE, Amber=PENDING, Red=EXPIRED (when Valid To < now), Grey=CLOSED/SUSPENDED
- **Auto-expiry:** Status shown as EXPIRED when Valid To date has passed
- **CAPA auto-generation:** When CAPA Required = Yes
- **Filters:** Search, Type, Status
- **Export:** CSV
- **ID format:** PTW-001, PTW-002…

### 4.6 Risk Register

- **5×5 interactive matrix:** Click any cell to pre-fill the risk modal at that P×I score
- **Fields:** Hazard, Category, Consequence, Inherent Risk (P×I), Controls, Residual Risk (P×I), Owner, Review Date, Status, CAPA Required
- **Rating bands:** LOW (1–4), MEDIUM (5–9), HIGH (10–16), EXTREME (17–25)
- **Filters:** Search, Residual Rating, Category
- **Export:** CSV
- **ID format:** RSK-001, RSK-002…

### 4.7 Legal Register

- **Pre-loaded with 10 Mozambican items** (LR-001 to LR-010) on first load
- **Fields:** Reference, Law/Standard, Requirement, Responsible, Frequency, Last Complied, Status (COMPLIANT/OVERDUE/PENDING/SCHEDULED)
- **Statuses colour-coded:** Green=Compliant, Red=Overdue, Amber=Pending, Blue=Scheduled
- **Filters:** Search, Status
- **Export:** CSV
- **ID format:** LR-001, LR-002…

### 4.8 SHEQ Calendar

- **Years covered:** 2026–2030
- **19 pre-loaded activities** per specification:
  - Monthly SHEQ Inspection, Monthly SHEQ Meeting with DG, Monthly Report to DG (every month)
  - Internal Audits Q1–Q4, IMS Management Review, External ISO Surveillance Audit
  - Risk Register Review, Emergency Drill, Regulatory Review, Environmental Monitoring
  - Contractor Safety Induction, PTW Audit, Training Needs Analysis
  - Annual Performance Report, Emergency Plan Review, SHEQ Policy Review
- **Cell states (click to cycle):** Blank → Planned (blue P) → Completed (green ✓) → Missed (red ✗) → Blank
- **All state changes persist** to localStorage

### 4.9 Monthly Report

- **Sections A–K generated from real data:**
  - A: Executive Summary (period, totals, open CAPAs)
  - B: Leading Indicators with RAG (Observations, Safe Ratio, Near Misses, PTW Compliance)
  - C: Lagging Indicators (Total Incidents, LTIs, First Aid Cases, Environmental Events, LTIFR)
  - D: Incidents table for selected month
  - E: Near Misses table for selected month
  - F: Full CAPA Tracker with RAG row colouring
  - G: PTW Summary by status
  - H: Full Legal Register
  - I: HIGH & EXTREME risks only
  - J: Calendar status for selected month
  - K: Focus Topic placeholder
- **RAG logic:** Green = at/above target, Amber = within 20% below, Red = below 80% of target
- **LTIFR calculation:** (LTIs ÷ estimated man-hours) × 1,000,000
- **Print/PDF:** `window.print()` with A4 print CSS, hides sidebar/topbar
- **Document ref format:** `CTRG-SHQ-RPT-MSR-MM-YYYY`

### 4.10 CAPA Tracker

- **Standalone module** with full CRUD
- **Auto-generated** from JO, NM, INC, PTW, RISK modules when CAPA Required = Yes
- **ID format:** CAPA-YYYY-NNN (e.g., CAPA-2026-001)
- **Fields:** CAPA ID, Source Module, Source Ref, WHAT, WHO, WHEN, HOW, Priority, Status, Created Date, Closed Date, Evidence
- **Auto-overdue detection:** On every page load, any CAPA with target date < today and status ≠ Closed is automatically set to "Overdue"
- **RAG row colouring:**
  - 🔴 Red: Status = Overdue OR target date < today and not Closed
  - 🟡 Amber: Target date within 7 days and not Closed
  - 🟢 Green: Status = Closed
  - White: All others
- **Sort order:** Overdue → Open → In Progress → Closed
- **Filters:** Search, Source Module, Status, Priority
- **CAPA badges** in source module tables: clickable, navigates to CAPA Tracker and highlights the row
- **Export:** CSV

### 4.11 SHEQ-AI Chat

- **Model:** claude-opus-4-5 (streaming SSE)
- **System prompt:** SHEQ-specific — risk matrix, CAPA format, ISO standards, Mozambican law
- **Streaming:** Real-time token-by-token rendering
- **API key:** Stored in `sessionStorage` (cleared on browser close)
- **Auto-initialisation:** Sends "init" on first open to receive activation banner
- **Requires:** User to enter Anthropic API key in Settings

---

## 5. Data Model

All data stored under `localStorage` key `sheqai_v2` as a single JSON object.

```json
{
  "initialized": true,
  "observations": [ /* OBS records */ ],
  "nearMisses":   [ /* NM records  */ ],
  "incidents":    [ /* INC records */ ],
  "permits":      [ /* PTW records */ ],
  "risks":        [ /* RSK records */ ],
  "legalItems":   [ /* LR records  */ ],
  "capas":        [ /* CAPA records */ ],
  "calendar":     { /* year → activity → month → state */ }
}
```

### OBS Record
```json
{
  "id": "OBS-001",
  "observer": "João Machava",
  "date": "2026-03-03",
  "location": "Turbine Hall",
  "activity": "Lubrication of bearings",
  "type": "SAFE",
  "desc": "All PPE worn correctly.",
  "action": "None required.",
  "capa": "Y",
  "capaRef": "CAPA-2026-001",
  "priority": "High"
}
```

### CAPA Record
```json
{
  "id": "CAPA-2026-001",
  "source_module": "JO",
  "source_ref": "OBS-002",
  "what": "Provide chemical splash goggles.",
  "who": "SHEQ Officer",
  "when": "2026-03-20",
  "how": "Physical inspection.",
  "priority": "High",
  "status": "Open",
  "created": "2026-03-05",
  "closed_date": "",
  "evidence": ""
}
```

### PTW Record (enhanced)
```json
{
  "id": "PTW-001",
  "type": "Hot Work",
  "requestor": "Carlos Tembe",
  "activity": "Welding on generator exhaust flange",
  "location": "Generator Hall",
  "from": "2026-03-17T08:00",
  "to": "2026-03-17T16:00",
  "precautions": "Fire watch...",
  "status": "CLOSED",
  "hazard": "Hot surfaces, ignition sources",
  "ip": 3, "ii": 3, "iScore": 9, "iRating": "MEDIUM",
  "controls": "Fire watch, extinguishers",
  "rp": 1, "ri": 2, "rScore": 2, "rRating": "LOW",
  "ppe": ["hardhat", "gloves", "fr"],
  "isolation": "Y",
  "emergency": "Y",
  "capa": "N",
  "capaRef": ""
}
```

### Calendar Structure
```json
{
  "calendar": {
    "2026": {
      "Monthly SHEQ Inspection": {
        "Jan": "completed",
        "Feb": "completed",
        "Mar": "planned",
        "Apr": "planned"
      }
    }
  }
}
```

---

## 6. CAPA Auto-Generation Logic

When a user saves a record in any source module with CAPA Required = Yes:

```
User clicks Save (JO / NM / INC / PTW / RISK)
         │
         ▼
autoCreateCapa(d, sourceModule, sourceRef, what, who, when, how, priority)
         │
         ├── Generates ID: CAPA-{YEAR}-{NNN} (zero-padded sequential)
         ├── Appends to d.capas[]
         ├── Sets status = "Open", created = today
         └── Returns capaRef → stored on source record
         │
         ▼
saveData(d) → localStorage.setItem('sheqai_v2', JSON.stringify(d))
         │
         ▼
Source record.capaRef = "CAPA-2026-XXX"
CAPA badge appears in source module table (clickable)
```

**Overdue auto-detection** runs on every page load:
```javascript
if (capa.status !== 'Closed' && capa.when < today) {
  capa.status = 'Overdue';
}
```

---

## 7. Risk Matrix

Standard 5×5 matrix. Score = Probability × Impact.

| | I1 Insignif. | I2 Minor | I3 Moderate | I4 Major | I5 Catastrophic |
|---|---|---|---|---|---|
| **P5 Almost Certain** | 5 🟡 | 10 🟠 | 15 🟠 | 20 🔴 | 25 🔴 |
| **P4 Likely** | 4 🟢 | 8 🟡 | 12 🟠 | 16 🟠 | 20 🔴 |
| **P3 Possible** | 3 🟢 | 6 🟡 | 9 🟡 | 12 🟠 | 15 🟠 |
| **P2 Unlikely** | 2 🟢 | 4 🟢 | 6 🟡 | 8 🟡 | 10 🟠 |
| **P1 Rare** | 1 🟢 | 2 🟢 | 3 🟢 | 4 🟢 | 5 🟡 |

**Bands:** LOW = 1–4 🟢 | MEDIUM = 5–9 🟡 | HIGH = 10–16 🟠 | EXTREME = 17–25 🔴

---

## 8. Claude AI Integration

```
Browser → fetch() → api.anthropic.com/v1/messages
                     Header: anthropic-dangerous-direct-browser-access: true
                     Header: x-api-key: {user-supplied key}
                     Body: { model, max_tokens, system, messages, stream: true }

Response: Server-Sent Events (SSE)
   data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}

Rendered: Token by token into chat bubble with basic markdown
          (**bold**, *italic*, line breaks)
```

**API key storage:** `sessionStorage` — cleared when browser tab closes. Never written to localStorage or sent to any server other than api.anthropic.com.

---

## 9. Data Persistence

```
Every Save action:
  saveData(d) → localStorage.setItem('sheqai_v2', JSON.stringify(d))
              → updateSyncStatus() → shows "⬤ Ready • N records"

On page load (DOMContentLoaded):
  getData() → localStorage.getItem('sheqai_v2') → JSON.parse()
  If null → getDefaultData() → pre-loaded sample + legal + calendar data
  autoMarkOverdue(d) → update any expired CAPAs
  navigateTo('dashboard') → render all charts from real data
```

**Storage key:** `sheqai_v2`
**Format:** Single JSON object (entire application state)
**Backup:** Settings → Export Data (JSON) → downloads timestamped `.json` file
**Restore:** Settings → Import Data (JSON) → reads `.json`, replaces entire state
**Reset:** Settings → Reset All Data → clears key, reloads with defaults

---

## 10. CSV & JSON Export/Import

### CSV Export
Available on: Job Observations, Near Miss, Incidents, PTW, Risk Register, Legal Register, CAPA Tracker.

Click **⬇ CSV** button in module header. Downloads `sheqai-{module}-{date}.csv`.

All fields included, values quoted, commas and double-quotes escaped per RFC 4180.

### JSON Export
Settings → **⬇ Export Data (JSON)**
Downloads: `sheqai-backup-{date}.json`
Contains: Complete application state (all modules, all records, calendar states)

### JSON Import
Settings → **⬆ Import Data (JSON)**
Select a previously exported `.json` file.
⚠️ Replaces ALL current data with the imported data.

---

## 11. Deployment (GitHub Pages)

### Repository
- **Owner:** grcentral
- **Repo:** sheq-ai
- **Branch:** main
- **Root path:** `/` (index.html in repo root)
- **Live URL:** https://grcentral.github.io/sheq-ai/

### Update Process
```bash
# 1. Edit SHEQ-AI.html (development file)
# 2. Copy to index.html (served by GitHub Pages)
cp SHEQ-AI.html index.html

# 3. Commit
git add index.html SHEQ-AI.html
git commit -m "Description of changes"

# 4. Push
git push origin main

# GitHub Pages automatically serves the updated index.html
# (allow 1–3 minutes for CDN propagation)
```

---

## 12. Mobile Responsiveness

### Breakpoint: < 768px

| Element | Desktop | Mobile |
|---|---|---|
| Sidebar | Left-side vertical nav | Hidden |
| Navigation | Nav links with labels | Bottom bar with icons |
| KPI grid | 5 columns | 2 columns |
| Charts row | 2 columns | 1 column stacked |
| Form rows | 2 columns | 1 column stacked |
| Tables | Standard with horizontal scroll | Card layout per row |
| Modals | Centred, fixed width | Full-screen, bottom sheet |

### Mobile Bottom Navigation (6 items)
Dashboard, Observations, Incidents, CAPA Tracker, PTW, SHEQ-AI Chat

### Card Table Layout
On mobile, `.mobile-cards` class transforms `<tbody><tr>` into individual cards. `data-label` attributes on each `<td>` provide the field label via CSS `::before` pseudo-elements.

---

## 13. Design System

### Typography Scale (Inter font)
| Token | rem | px | Usage |
|---|---|---|---|
| `--fs-xs` | 0.75rem | 12px | Labels, pills, timestamps |
| `--fs-sm` | 0.875rem | 14px | Table cells, form inputs, buttons |
| `--fs-base` | 1rem | 16px | Body text, nav labels |
| `--fs-md` | 1.25rem | 20px | Section titles |
| `--fs-lg` | 1.5rem | 24px | Page headings |
| `--fs-xl` | 2rem | 32px | KPI values |

### Spacing (8px grid)
| Token | Value | Usage |
|---|---|---|
| `--sp-0` | 0.25rem (4px) | Tight gaps |
| `--sp-1` | 0.5rem (8px) | Component padding |
| `--sp-2` | 1rem (16px) | Card padding, form groups |
| `--sp-3` | 1.5rem (24px) | Section gaps, modal padding |
| `--sp-4` | 2rem (32px) | Page padding |
| `--sp-5` | 3rem (48px) | Major section separators |

### Colour Palette
| Token | Value | Usage |
|---|---|---|
| `--accent` | `#2563eb` | Primary actions, active states |
| `--text` | `#1e293b` | Body text |
| `--muted` | `#475569` | Labels, secondary text (5.8:1 contrast ratio) |
| `--green` | `#16a34a` | Success, compliant, safe |
| `--yellow` | `#d97706` | Warning, medium risk, amber |
| `--red` | `#dc2626` | Danger, overdue, critical |
| `--orange` | `#ea580c` | High severity, at-risk |
| `--teal` | `#0891b2` | Near miss, info |

### Table Design
- Row height: ~44px via `padding: 0.75rem 1rem`
- Sticky `thead` for long tables
- Zebra striping: `tbody tr:nth-child(even) { background: #f8fafc }`
- Hover: `tbody tr:hover { background: #eff6ff }`
- Font size: `var(--fs-sm)` = 14px

---

## 14. Security Considerations

| Concern | Mitigation |
|---|---|
| API key storage | `sessionStorage` only — clears on tab close |
| API key on shared devices | Warning banner displayed in Settings modal |
| Data privacy | All data in browser localStorage — never sent to any server |
| CORS for Claude API | `anthropic-dangerous-direct-browser-access: true` header required |
| XSS in chat output | `escapeHtml()` applied to all user input before rendering |
| Firebase (removed) | Database replaced with localStorage — no cloud exposure |

---

## 15. Known Limitations

| Limitation | Impact |
|---|---|
| localStorage (~5–10 MB limit) | ~2,000–5,000 records before approaching storage limit |
| Single-device data | No automatic sync across devices (use JSON export/import) |
| No authentication | Anyone with the URL can view all data |
| API key required for chat | Claude AI feature disabled without Anthropic API key |
| No server-side backup | Data exists only in the browser — export regularly |
| No PDF attachment | Evidence field is text only — no file upload |

---

## 16. Future Enhancements

- [ ] Firebase Realtime Database re-integration for multi-device sync
- [ ] Role-based access (SHEQ Manager vs Read-Only)
- [ ] Email notifications for overdue CAPAs
- [ ] Photo/file attachment for observations and evidence
- [ ] QR code for mobile field observation entry
- [ ] Power BI / Google Sheets export integration
- [ ] Offline PWA (Progressive Web App) with service worker
- [ ] Automated email monthly report distribution

---

*Document prepared by SHEQ Department | Central Térmica de Ressano Garcia | March 2026*
*Classification: INTERNAL USE ONLY*
