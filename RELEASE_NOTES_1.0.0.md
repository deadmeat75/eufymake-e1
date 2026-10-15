# EufyMake E1 Monitor 1.0.0

First stable release of the Home Assistant monitor, with clearer maintenance activity and additional read-only printer information.

- Automatic moisturizing, ink injection and post-moisturizing maintenance labels.
- Snapshot and ink-injection progress, separate from printing.
- Mini Flatbed identification for observed code 2, measured surface height and printer light status, with report times.
- Fewer misleading missing-reading warnings when not printing.
- Correct handling of 100% progress before the printer actually returns to Idle.
- Automatic expiration dates and remembered percent/mL selection retained.

The post-moisturizing maintenance label is inferred from observed transitions and Studio history. Bed information reflects the printer-reported setting. Camera access and printer controls are not included.

## Update

Install 1.0.0 in HACS, restart Home Assistant, and reload the dashboard with Ctrl+Shift+R. Existing configuration is reused. Activity Lab is independent and does not need updating. Upgrades from before 0.2.6 replace editable date entities with read-only sensors; update custom date entity references as described in the README.

## Validation

51 Python tests and both dashboard rendering suites pass. Recorded printer messages were replayed locally. The new code still needs installation validation on the maintainer's Home Assistant; the release designation does not imply official Eufy support or testing with all accessories.

After installation, confirm idle warnings, bed/light details, snapshot progress and its surface-height timestamp, printing through completion, and unit selection after reload. Ink-injection progress can be checked during the next normally required injection; no maintenance cycle is needed solely to test it.
