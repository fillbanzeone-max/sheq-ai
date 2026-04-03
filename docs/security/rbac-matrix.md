# RBAC Permission Matrix
> ESG Management Systems — SHEQ Platform
> Last updated: 2026-04-03

## Roles

| Role | Description |
|------|-------------|
| `viewer` | Read-only access, no PII visible |
| `reporter` | Can create records; no PII, no delete |
| `sheq_manager` | Full SHEQ access including PII fields |
| `privacy_officer` | GDPR operations + PII; no delete |
| `admin` | Unrestricted access |

## Permission Matrix

| Permission | viewer | reporter | sheq_manager | privacy_officer | admin |
|------------|--------|----------|--------------|-----------------|-------|
| `view` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `create` | — | ✓ | ✓ | ✓ | ✓ |
| `edit` | — | — | ✓ | ✓ | ✓ |
| `delete` | — | — | ✓ | — | ✓ |
| `export` | — | — | ✓ | ✓ | ✓ |
| `view_pii` | — | — | ✓ | ✓ | ✓ |
| `admin_settings` | — | — | — | — | ✓ |
| `gdpr` | — | — | — | ✓ | ✓ |
| `reset_data` | — | — | — | — | ✓ |

## Guarded Functions

| Function | Required Permission |
|----------|-------------------|
| `deleteObs / deleteNM / deleteInc / deletePTW / deleteRisk / deleteLegal / deleteCapa / deleteToolbox / deleteInduction / deleteMoc / deleteAsset / deleteAudit` | `delete` |
| `exportJSON` | `export` |
| `resetData` | `reset_data` |
| `saveApiKey` | `admin_settings` |
| `gdprExportSubject / gdprEraseSubject / gdprSubmitDsar` | `gdpr` |

## PII-Masked Fields

Fields shown as initials only for roles without `view_pii`:

| Module | Field |
|--------|-------|
| Observations | `observer` |
| Near Misses | `reporter` |
| Incidents | `person` |
