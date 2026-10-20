# EufyMake E1 Monitor v1.1.0

- Show waste-tank fullness as a growing red bar while preserving the existing remaining-capacity sensor.
- Warn to check the bed locking latch when no bed is detected; do not claim a directly measured unlocked latch.

Recognizes the experimentally tested beds/accessories and improves operating-state, maintenance and print telemetry without replacing the existing integration.

- Standard Flatbed, Mini Flatbed, rotary and removal detection, with independent bed and accessory codes.
- Raw codes, reply values, source/report timestamps, bed presence and unknown-code visibility.
- Flash/deep cleaning, moisturizing and ink-injection progress associated with the correct active operation.
- Elapsed and remaining print time, stale-data handling and state-based completion instead of assuming 100% means finished.
- Read-only connection, last-activity and raw printer-state information; existing entity IDs, dates, authentication and dashboards retained.
- Routine updates coalesced; important state and accessory changes remain immediate.

No printer controls, automatic maintenance or camera access are introduced. The post-moisturizing state description remains inferred, and the protocol-wide meaning of reply is not established. This monitor release does not release or update Activity Lab.

## Install

Refresh HACS data, download EufyMake E1 Monitor v1.1.0, and restart Home Assistant manually when convenient. Refresh the browser with Ctrl+Shift+R. Keep your existing integration entry and credentials. No manual file uploads are needed when using HACS.

The eufymake_e1.zip asset provides a complete custom_components/eufymake_e1 tree for manual installation. Back up Home Assistant before updating.

## Validation

62 standalone Python tests and both dashboard layouts passed locally. Read-only replay covered the available October 20 export; rotary swaps are covered by synthetic fixtures of the supplied physical observations. Tests use Home Assistant API doubles. Live Home Assistant deployment and a physical legacy iPad have not been validated for this update. The release workflow reruns the monitor tests before publication.
