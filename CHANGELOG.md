# EufyMake E1 Monitor 1.3.1

- Add **Print-head cleaning (observed)** for operating state 5/1, with command-1102 progress kept separate from normal print progress. Existing state, step and activity-progress entities are reused.
- Record observed cleaning start/end transitions in the existing maintenance history. A status change ends the observed interval; it does not assert successful cleaning.
- Display `ink_quantity` channels and their summed job total in **mL**. Four completed jobs match Studio's screenshot totals after rounding: 0.119485 → 0.12 mL, 0.119486 → 0.12 mL, 1.436693 → 1.44 mL, and 0.236693 → 0.24 mL.
- Keep separate `print_quantity` and `pump_quantity` fields explicitly raw with unverified units. Preserve legacy mixed `units` metadata and add per-field unit metadata, including on existing retained job summaries. Do not rewrite numeric values.
- Preserve all existing credentials, MQTT settings, entity IDs, saved dates, histories, unit preferences, labels, notes, bookmarks, sessions and notification options. No machine-control actions are introduced.

## Evidence and limits

The supplied Studio screenshot and November 3 export show state 5/1 with command-1102 progress 3%, 11%, 15%, matching Studio's 15% display and the user's cyan-cleaning note. The selected color is not present in those captured fields and is not inferred. Studio's approximate 2m 30s duration is not hard-coded: the export ends before cleaning completion.

The four compact numeric regression fixtures are transcribed from the supplied exports and screenshot; large exports and private identifiers are not committed. Six-channel job quantities match Studio's mL display. This does not establish the exact semantics or units of every neighboring quantity field, or exact inventory attribution between printing and maintenance. Cleaning-remaining counter units and command-1140 start-method meaning remain unverified.

## Installation

Update both existing integrations through HACS, restart Home Assistant once after both downloads, and fully refresh the dashboard browser. No ZIP handling, entry removal, credential reimport or dashboard YAML replacement is required. The release process does not install files or restart Home Assistant. Physical HA/printer/iPad deployment and hassfest/HACS validation are not claimed by standalone tests.

Validation: 87 Python tests plus existing UI suites with new cleaning/quantity assertions. Syntax, JSON, version and whitespace checks pass.

# EufyMake E1 Monitor 1.3.0

- Add read-only **Cleaning remaining**, preserving the printer's raw counter without inventing units, physical cleaning-cycle counts or time-to-full predictions.
- Explain the observed low-end waste-percentage plateau; preserve the existing growing, color-coded fill bar and native remaining-capacity entity.
- Show printer sound On/Off and Low/Medium/High volume from observed command-1045 mappings. No controls are introduced.
- Display file-transfer, firmware-upgrade/download and calibration progress only in their matching operating states, independently of print progress. Add Test printing (observed), state 4/1 with command-1064 progress, supported by the user's annotated November 3 capture.
- Show preparation-plus-print, printing-only and priming time estimates from command 1126. These are reported estimates, not active remaining time.
- Preserve newer positive terminal elapsed readings from command 1068 alongside source information; ignore Idle resets. Suppress previous-job quantity carryover when it matches the known previous job until a reset or changed report establishes new data.
- Give specific reasons for newly unavailable inventory usage estimates. Describe unchanged levels as **No measurable decrease**, not proof of zero consumption. Keep printing and pump quantities separate with units unverified.
- Activity Lab retains the first terminal-100% packet outside five-second sampling and adds a one-minute ink heartbeat when telemetry capture is enabled. Export coverage includes retained timestamps and dropped-record warnings.
- Repair retained Lab summaries only from original completion-event evidence and newer retained terminal elapsed reports. Original events, IDs, notes and raw fields are not rewritten. Missing evidence is not invented.
- Preserve existing configuration, entity IDs, authentication, dates, unit selection, histories, sessions, bookmarks, labels, exports and optional notification settings. New capabilities are observational; no print, cleaning, movement, update, sound-control or calibration commands are sent.

## Limits and validation

Cleaning-counter units, waste reporting-floor semantics, job-quantity units and physical-button command-1140 meaning remain unverified. States 2/5 and 8/2 remain unknown. The test-print mapping/progress is observational, not an official protocol specification. Existing estimates with no recorded reason cannot gain a fabricated specific explanation.

Standalone tests use Home Assistant API doubles, not a live Home Assistant/printer deployment. Physical HA/iPad validation and hassfest/HACS checks are not claimed. Read-only replay of the supplied November exports confirmed the noon completion-summary repair to 19m 54s while retaining original event IDs, and preserved the original zero-change maintenance readings with clearer wording. No raw exports, credentials or database files are committed or bundled.

## Install

Back up Home Assistant and export Activity Lab JSON first. Update both existing integrations through HACS, then restart Home Assistant once and fully refresh the dashboard. Do not remove integration entries, reimport credentials, change MQTT settings or replace dashboard YAML. Existing data folders remain untouched. Check the new **Printer observations** section for the counter, sound and estimates. Relevant progress displays appear during their operations; no need to trigger cleaning or updates solely for testing. Settings may become unavailable when their reports are stale rather than being presented as current.

Python validation: 84 tests; corresponding dashboard/UI suites and syntax checks pass. GitHub publication repeats tests before creating release assets. Home Assistant is not installed or restarted by publication.

# EufyMake E1 Monitor 1.2.0

- Rename Ink Reserves to Ink Supply; show waste fill in green/yellow/red at 60% and 80% boundaries.
- Clarify bed detection and locking-latch guidance. Show known dimensions in mm and inches.
- Explain missing readings and stale telemetry; copy unknown operating codes and show estimated print finish time.
- Preserve last completed print metrics after Idle; add bounded print, connection, maintenance and ink-supply history.
- Add optional local Home Assistant notifications (off by default) and configurable per-color low-ink thresholds.
- Detect supported cartridge identity changes privately. Show conservative inventory-based usage estimates, with explicit missing-data limits, and unit-unverified printer quantities.
- Preserve existing entity IDs, configuration, automatic dates, MQTT authentication and dashboards.

See NEXT_RELEASE.md for verification, uncertainty and installation instructions. Activity Lab 0.4.0 is a separate prepared package.

# 1.1.0 — verified accessories and telemetry

- Show waste-tank fullness as a growing red bar while preserving the existing remaining-capacity sensor.
- Warn to check the bed locking latch when no bed is detected; do not claim a directly measured unlocked latch.

- Decode independent bed/accessory mappings for absent, Standard Flatbed, Mini Flatbed and rotary; preserve unknown codes, raw command-1118 reply and report times.
- Handle asynchronous hardware removal/installation reports without presenting conflicting old hardware as current.
- Add raw operating state, bed presence, maintenance operation, connection freshness and last-activity sensors while preserving existing entity IDs.
- Associate flash-cleaning, deep-cleaning, moisturizing and ink-injection progress with the correct operation; keep it independent of printing.
- Use command-1001 elapsed time, improve readable durations, reject old timed reports, and keep 100% distinct from completion.
- Coalesce routine HA updates while keeping status/accessory changes immediate; retain privacy protections and offline expiration dates.
- Show independent accessories and unknown state pairs in the existing layouts. No controls or camera access are added.
- Activity Lab remains a separate review-only update and is not released here.

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
