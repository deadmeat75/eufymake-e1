# 1.0.0 — first stable release

- Add automatic moisturizing (5/9), ink injection (5/3), and post-moisturizing maintenance (13/0; inferred from the recorded sequence and Studio maintenance history).
- Show snapshot and ink-injection progress separately from print progress, with independent freshness and operation-change clearing.
- Add read-only bed type, measured surface height in mm, and printer light status; show per-reading report times in both dashboard layouts.
- Map observed bed code 2 to Mini Flatbed; show unknown numeric bed codes without inventing accessory mappings.
- Exclude inactive print readings from missing-reading warnings; continue reporting missing ink and waste readings.
- Hide inactive print metrics and keep Printing status at 100% until the printer reports a state change. Clear old job readings on transitions and reject late progress outside printing/paused states.
- Preserve read-only automatic dates, offline saved dates, existing entity identities, and remembered percent/mL selection.
- Camera access and printer controls remain outside this release. Activity Lab remains a separate tool.

# 0.2.7

- Remember percent/mL selection per printer in browser storage across dashboard reloads and layout changes.
- Keep the toggle usable when browser storage is unavailable; waste and print progress remain percentages.

# 0.2.6

- Replace editable expiration-date entities with seven read-only date sensors; remove dashboard edit buttons and the date-setting service path.
- Preserve saved dates and legacy fallback overrides until valid printer data replaces them.
- Remove only this integration entry's obsolete date entities during setup; custom dashboards and automations must switch their old date entity references to sensors.
- Update the dashboard explanation and documentation for automatic expiration dates.

# 0.2.5

- Add observed firmware update, calibration/self-check, file transfer, waiting-for-Start and print-head priming status labels.
- Label automatic deep cleaning and its subsequent ink-injection maintenance state using recorded transitions, matching Studio screenshots and its maintenance-completed notification.
- Prefer valid printer expiration timestamps, including expired cartridges; retain manual/countdown fallbacks and reject invalid timestamps.
- Preserve saved dates when expired ink reports a clamped zero countdown without a valid timestamp.
- Refer to the desktop app as Anker Make Studio (formerly EufyMake Studio); retain verified legacy file locations with a folder-version clarification.
- Keep the Home Assistant-only date-edit disclaimer and existing entity identities.

# 0.2.4

- Rename the integration and dashboard to EufyMake E1 Monitor, preserving the domain and entity IDs.
- Add a percent/mL ink display toggle for all six 100 mL cartridges; waste and print progress remain percentages.
- Let valid positive expiration countdowns replace manual dates and clear their overrides; preserve manual dates for unavailable, zero, or negative countdowns.
- Show the timestamp of the latest live printer message, including while offline.
- Keep the Home Assistant-only expiration disclaimer visible in both layouts.
- Add observed state/step mappings for automatic flash clean (5/7) and taking snapshot (8/0).
- Bump the dashboard asset URL to refresh cached JavaScript.

# 0.2.3

- Add the EufyMake integration icon.
- Explain why manual expiration dates may be needed when printer countdowns are unavailable.
- Clarify that automatically calculated dates remain saved after expiration and Home Assistant restarts.
- Clarify that manual dates remain overrides until edited again.

# 0.2.2

- Clarify that expiration date edits only affect Home Assistant; they do not change cartridge or printer dates or bypass printing lockouts.
- Replace the saved-date visibility message with an expiration-edit disclaimer in both dashboard layouts.
- Add detailed Windows Studio file locations and upload instructions.
- Update installation, credential privacy, and validation documentation.

# 0.2.1

- Persist manual expiration-date overrides across restarts; live countdowns cannot replace them.
- Preserve dates from 0.2.0 as overrides on upgrade. Dates already overwritten must be entered again.
- Add model and coordinator restart regression tests.

# Changelog

## 0.2.0 — native integration preview

- Replace the standalone Supervisor app with a HACS-structured native integration.
- Connect directly to cloud MQTT; remove local MQTT and Prometheus dependencies.
- Add native sensors, editable persisted date entities, guided Studio import and reauthentication.
- Bundle the graphical card and an automatic sidebar panel.
- Preserve existing legacy setup by using printer-specific integration entity IDs.
- Add decoding, credential and HA boundary tests. Real Home Assistant/printer validation remains pending.
