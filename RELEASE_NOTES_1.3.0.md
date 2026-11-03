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
