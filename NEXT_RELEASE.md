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
