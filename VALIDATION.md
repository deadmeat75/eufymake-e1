# Validation — 1.0.0

## Completed locally

- 51 Python tests: protocol/checksums and command filtering, credentials/setup, state decoding, operation-specific progress and clearing, 100% with time remaining, late print packets, pause/resume, independent freshness, bed/height/light validation, persistent date handling and entity migration.
- Dashboard tests for both layouts: relevant missing readings, separate activity progress, inactive metrics, details/report timestamps, HTML escaping, remembered ink units, unavailable data and existing rendering behavior.
- Actual Activity Lab export replay checked snapshot progress/height, bed type, light status and completion transitions. The export deduplicates repeated status packets, so replay checks decoding and transitions; independent freshness is covered by synthetic timed tests. No uploaded records or credentials are committed.
- JavaScript syntax, JSON parsing and whitespace checks.

Tests use Home Assistant API doubles and do not replace a real installation test. Prior versions have been reported working on the maintainer's Home Assistant; 1.0.0's new code has not yet been installed there during this preparation.

## Installation checks

1. Update through HACS, restart Home Assistant, refresh the dashboard. Confirm the existing entry and sensors remain and four new sensors appear (30 entities total).
2. Check both layouts, saved dates, remembered units, bed/light details and measured height/report time after a snapshot.
3. Confirm idle/maintenance does not warn about absent print metrics, while missing ink/waste still warns.
4. Check snapshot progress and normal printing through a status transition back to Idle. Do not assume 100% is completion.
5. During the next naturally required ink injection, compare progress with Studio.
6. Check disconnect/freshness behavior and saved-date persistence after restart.

Camera, controls, arbitrary accessory mappings and fragmented protocol reassembly are not part of this release. The 13/0 maintenance description remains inferred from observed history.
