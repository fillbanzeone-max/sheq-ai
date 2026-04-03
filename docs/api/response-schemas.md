# API Response Field Classification
> ESG Management Systems — SHEQ Platform
> Last updated: 2026-04-03 | Finding: API-03

## Data Classification Levels

| Level | Definition |
|-------|------------|
| `Public` | Safe for any authenticated user |
| `Internal` | Internal use only; not for external sharing |
| `Restricted` | Sensitive operational data; role-controlled |
| `Personal` | PII — requires `view_pii` permission |

## Observations (`/api/v3/sheq/observations`)

| Field | Classification | Roles with Access |
|-------|---------------|-------------------|
| `id` | Public | all |
| `date` | Public | all |
| `location` | Public | all |
| `activity` | Public | all |
| `type` | Public | all |
| `desc` | Internal | all authenticated |
| `action` | Internal | all authenticated |
| `priority` | Internal | all authenticated |
| `observer` | **Personal** | `sheq_manager`, `privacy_officer`, `admin` |
| `capa` / `capaRef` | Internal | all authenticated |

## Near Misses (`/api/v3/sheq/nearmisses`)

| Field | Classification | Roles with Access |
|-------|---------------|-------------------|
| `id` | Public | all |
| `date` | Public | all |
| `location` | Public | all |
| `desc` | Internal | all authenticated |
| `outcome` | Internal | all authenticated |
| `sev` / `hipo` | Internal | all authenticated |
| `reporter` | **Personal** | `sheq_manager`, `privacy_officer`, `admin` |

## Incidents (`/api/v3/sheq/incidents`)

| Field | Classification | Roles with Access |
|-------|---------------|-------------------|
| `id` | Public | all |
| `date` | Public | all |
| `type` / `sev` | Public | all |
| `location` | Public | all |
| `desc` | Internal | all authenticated |
| `rootCause` | Restricted | `sheq_manager`, `admin` |
| `status` | Internal | all authenticated |
| `person` | **Personal** | `sheq_manager`, `privacy_officer`, `admin` |
| `capaWho` | **Personal** | `sheq_manager`, `privacy_officer`, `admin` |
