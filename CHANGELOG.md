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
