# EufyMake E1 Monitor 1.2.0

- Rename Ink Reserves to Ink Supply; show waste fill in green/yellow/red at 60% and 80% boundaries.
- Clarify bed detection and locking-latch guidance. Show known dimensions in mm and inches.
- Explain missing readings and stale telemetry; copy unknown operating codes and show estimated print finish time.
- Preserve last completed print metrics after Idle; add bounded print, connection, maintenance and ink-supply history.
- Add optional local Home Assistant notifications (off by default) and configurable per-color low-ink thresholds.
- Detect supported cartridge identity changes privately. Show conservative inventory-based usage estimates, with explicit missing-data limits, and unit-unverified printer quantities.
- Preserve existing entity IDs, configuration, automatic dates, MQTT authentication and dashboards.

See NEXT_RELEASE.md for verification, uncertainty and installation instructions. Activity Lab 0.4.0 is a separate release.
