# Validation for 1.3.1

- 87 Python tests pass.
- UI suites cover both existing layouts/panel interactions plus observed cleaning and mL formatting.
- Numeric fixtures match four Studio totals; command 1102 is operation-scoped and cannot replace print progress.
- Per-field metadata preserves the unverified status of separate print/pump quantities.
- No new dependencies, credentials or data-store changes.
- No live HA/printer/iPad testing or hassfest/HACS validation performed.
- Publication authorized; no automatic HA installation or restart.
