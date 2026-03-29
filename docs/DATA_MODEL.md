# SHEQ-AI — Data Model Quick Reference

**localStorage key:** `sheqai_v2`
**Format:** Single JSON object
**Max recommended size:** ~5,000 records across all modules

---

## Top-Level Structure

```
sheqai_v2 (localStorage)
├── initialized: boolean
├── observations: OBS[]
├── nearMisses:   NM[]
├── incidents:    INC[]
├── permits:      PTW[]
├── risks:        RSK[]
├── legalItems:   LR[]
├── capas:        CAPA[]
└── calendar:     { year → { activity → { month → state } } }
```

---

## Record Schemas

### OBS — Job Observation
| Field | Type | Values / Format |
|---|---|---|
| id | string | OBS-NNN |
| observer | string | Full name |
| date | string | YYYY-MM-DD |
| location | string | Area name |
| activity | string | Work description |
| type | enum | SAFE \| AT-RISK \| IMPROVEMENT |
| desc | string | Observation description |
| action | string | Immediate action taken |
| capa | enum | Y \| N |
| capaRef | string | CAPA-YYYY-NNN or empty |
| priority | enum | Critical \| High \| Medium \| Low |

---

### NM — Near Miss
| Field | Type | Values / Format |
|---|---|---|
| id | string | NM-NNN |
| reporter | string | Full name |
| date | string | YYYY-MM-DD |
| location | string | Area name |
| desc | string | Event description |
| outcome | string | Potential outcome |
| hipo | integer | 0 = No, 1 = Yes (High Potential) |
| sev | integer | 1=Critical, 2=High, 3=Medium, 4=Low |
| action | string | Immediate action |
| status | enum | Open \| Under Investigation \| Closed |
| capa | enum | Y \| N |
| capaRef | string | CAPA-YYYY-NNN or empty |
| priority | enum | Critical \| High \| Medium \| Low |

---

### INC — Incident
| Field | Type | Values / Format |
|---|---|---|
| id | string | INC-NNN |
| date | string | YYYY-MM-DD |
| type | enum | Safety \| Environmental \| Quality \| Security |
| sev | integer | 1=Critical, 2=High, 3=Medium, 4=Low |
| location | string | Area name |
| desc | string | Incident description |
| person | string | Name / Employee # |
| status | enum | Open \| Under Investigation \| CAPA Issued \| Closed |
| rootCause | string | RCA findings |
| capaWhat | string | CAPA corrective action |
| capaWho | string | Responsible person |
| capaWhen | string | Target date YYYY-MM-DD |
| capaHow | string | Verification method |
| priority | enum | Critical \| High \| Medium \| Low |
| capaRef | string | CAPA-YYYY-NNN or empty |

---

### PTW — Permit to Work
| Field | Type | Values / Format |
|---|---|---|
| id | string | PTW-NNN |
| type | enum | Hot Work \| Electrical \| Confined Space \| Working at Height \| Line Breaking |
| requestor | string | Name |
| activity | string | Work description |
| location | string | Area name |
| from | string | YYYY-MM-DDTHH:MM |
| to | string | YYYY-MM-DDTHH:MM |
| precautions | string | Safety precautions list |
| status | enum | PENDING \| ACTIVE \| SUSPENDED \| CLOSED |
| hazard | string | Hazard identification |
| ip | integer | Inherent probability 1–5 |
| ii | integer | Inherent impact 1–5 |
| iScore | integer | ip × ii (1–25) |
| iRating | enum | LOW \| MEDIUM \| HIGH \| EXTREME |
| controls | string | Control measures |
| rp | integer | Residual probability 1–5 |
| ri | integer | Residual impact 1–5 |
| rScore | integer | rp × ri (1–25) |
| rRating | enum | LOW \| MEDIUM \| HIGH \| EXTREME |
| ppe | string[] | ['hardhat','glasses','gloves','boots','harness','fr','resp','face','other'] |
| isolation | enum | Y \| N |
| emergency | enum | Y \| N |
| capa | enum | Y \| N |
| capaRef | string | CAPA-YYYY-NNN or empty |
| priority | enum | Critical \| High \| Medium \| Low |

**Computed field (not stored):** `getPTWStatus(p)` returns EXPIRED if `p.to < now`

---

### RSK — Risk Register
| Field | Type | Values / Format |
|---|---|---|
| id | string | RSK-NNN |
| hazard | string | Hazard description |
| category | enum | Safety \| Environmental \| Health \| Quality \| Security |
| consequence | string | Potential consequences |
| ip | integer | Inherent probability 1–5 |
| ii | integer | Inherent impact 1–5 |
| iScore | integer | ip × ii |
| iRating | enum | LOW \| MEDIUM \| HIGH \| EXTREME |
| controls | string | Existing controls |
| rp | integer | Residual probability 1–5 |
| ri | integer | Residual impact 1–5 |
| rScore | integer | rp × ri |
| rRating | enum | LOW \| MEDIUM \| HIGH \| EXTREME |
| owner | string | Risk owner name / department |
| reviewDate | string | YYYY-MM-DD |
| status | enum | Open \| Under Review \| Closed |
| capa | enum | Y \| N |
| capaRef | string | CAPA-YYYY-NNN or empty |

---

### LR — Legal Item
| Field | Type | Values / Format |
|---|---|---|
| id | string | LR-NNN |
| law | string | Law / standard name |
| requirement | string | Compliance requirement description |
| responsible | string | Person / role |
| freq | enum | Monthly \| Quarterly \| Semi-Annual \| Annual \| Ad-hoc |
| lastComplied | string | YYYY-MM-DD |
| status | enum | COMPLIANT \| OVERDUE \| PENDING \| SCHEDULED |

---

### CAPA — Corrective Action
| Field | Type | Values / Format |
|---|---|---|
| id | string | CAPA-YYYY-NNN |
| source_module | enum | JO \| NM \| INC \| PTW \| RISK \| MANUAL |
| source_ref | string | Reference ID from source (e.g., OBS-002) |
| what | string | Corrective action description |
| who | string | Responsible person |
| when | string | Target date YYYY-MM-DD |
| how | string | Verification method |
| priority | enum | Critical \| High \| Medium \| Low |
| status | enum | Open \| In Progress \| Overdue \| Closed |
| created | string | YYYY-MM-DD |
| closed_date | string | YYYY-MM-DD or empty |
| evidence | string | Closure evidence description |

**Auto-overdue rule:** If `status ≠ Closed` AND `when < today` → `status = Overdue` (applied on every page load)

---

### Calendar Structure
```
calendar: {
  2026: {
    "Monthly SHEQ Inspection": {
      "Jan": "completed",
      "Feb": "completed",
      "Mar": "planned",
      "Apr": "planned",
      ...
      "Dec": "planned"
    },
    "PTW Audit": {
      "Jan": "blank",
      "Feb": "completed",
      ...
    }
  },
  2027: { ... },
  2028: { ... },
  2029: { ... },
  2030: { ... }
}
```

**Cell states:** `blank` | `planned` | `completed` | `missed`

---

## ID Generation

| Module | Function | Format | Example |
|---|---|---|---|
| Observations | `genId('OBS', arr)` | OBS-NNN | OBS-009 |
| Near Miss | `genId('NM', arr)` | NM-NNN | NM-005 |
| Incidents | `genId('INC', arr)` | INC-NNN | INC-006 |
| PTW | `genId('PTW', arr)` | PTW-NNN | PTW-007 |
| Risks | `genId('RSK', arr)` | RSK-NNN | RSK-011 |
| Legal | `genId('LR', arr)` | LR-NNN | LR-011 |
| CAPA | `genCapaId(capas)` | CAPA-YYYY-NNN | CAPA-2026-009 |

`genId` — finds max existing number in array, increments by 1, zero-pads to 3 digits.

`genCapaId` — filters by current year prefix, finds max, increments.

---

## Report Document Reference Format

```
CTRG-SHQ-RPT-MSR-{MM}-{YYYY}

Examples:
  CTRG-SHQ-RPT-MSR-03-2026  (March 2026)
  CTRG-SHQ-RPT-MSR-12-2026  (December 2026)
```

---

*Data Model Reference | SHEQ-AI v2 | Central Térmica de Ressano Garcia | March 2026*
