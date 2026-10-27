# Current preparation

See [NEXT_RELEASE.md](NEXT_RELEASE.md) for Monitor 1.2.0 / Activity Lab 0.4.0 behavior, evidence, limits and validation. The following sections document the previously published baseline; current waste colors, latch wording, optional notifications and history features supersede their older descriptions.

# Observed E1 telemetry enhancement — monitor 1.1.0

The monitor changes were authorized for release as 1.1.0 after review. Activity Lab remains on its separate review branch and is not released by this monitor update. Home Assistant is not deployed to or restarted. The manifest and frontend cache URL identify monitor version 1.1.0.

## Existing architecture and compatibility

The monitor's existing CloudClient authenticates to the same cloud broker, subscribes to the same topics, and publishes only its existing command-1027 telemetry query. No credentials, MQTT settings, TLS checks, publishing actions or query frequency were changed. New read-only command types were added to its existing receive filter. Coordinator, model, native sensor setup and bundled cards remain the integration paths.

Activity Lab keeps its existing independent connection, config flow, admin-only websocket interface, SQLite journal, capture settings, notes, labels and export buttons. SQLite paths and its incremental storage format are unchanged. Additional interpretation state is ordinary backward-compatible metadata. Older saved history is used to establish a baseline when needed; records and annotations are not rewritten or replaced.

No existing sensor key, unique ID, entity name or integration domain was removed or renamed. Existing dashboards, expiration dates, remembered ink units, other integrations and automations were not changed. No printer controls were added, removed or invoked. The monitor exposes no controls in this checkout; any controls elsewhere are untouched.

The pure telemetry meanings helper is packaged identically inside each already-existing integration. There is no new integration, runtime cross-dependency or dependency installation.

## Decoding

| Meaning | 1118.plateType | 1153.attType |
| --- | --- | --- |
| No bed/accessory detected | 0 | 0 |
| Standard Flatbed | 1 | 2 |
| Mini Flatbed | 2 | 1 |
| Rotary | 3 | 4 |

Each source has its own raw code, source command and UTC report time. Reply is retained only as raw command-1118 metadata; its last reported time is separate. It has no invented generic meaning. Unknown values display `Unknown (code)`; their bed-present status is unknown rather than guessed. Operating state 0/0 remains Idle and is independent of bed code zero.

A newer contradictory report can make the older HA hardware sensor unavailable while its original report remains in attributes. The newest known hardware report determines bed-present status. Missing counterparts are not fabricated. A matching later counterpart restores agreement. Historical per-source messages cannot replace newer reports. Snapshot plate-type fields are only a fallback before command 1118 has ever reported; job names and command-1068 dimensions never establish installed hardware.

Accessory version/model/serial metadata is retained in bounded private runtime memory when supplied. Existing text redaction remains in HA/export views; serials are not exposed, persisted or logged. Numeric serial-number keys are now redacted as well. Partial reports preserve prior metadata for the same code; a different accessory code clears it. This intentionally does not expose actual serial/version strings in exported diagnostics.

Command 1000 retains existing meanings and raw state/step. Unknown 2/5 and 8/2 remain Unknown, with the raw pair visible in the card. No unknown state is translated into a familiar one.

Command 1001 uses progress / 100, remaining seconds from time, and elapsed seconds from totalTime. Existing print_time, time_remaining and print_progress IDs are reused. Command 1068 is an elapsed fallback only when fresh 1001 elapsed data is missing. Time formatting includes hours, minutes and seconds. Old job metrics are hidden/cleared on relevant transitions; paused/resumed metrics remain independent. 100% alone is not completion. No stable private job identifier is exported; association uses state transitions and explicit observation timestamps, so undelivered transitions or packets without trustworthy source times remain a limitation.

| Active operation | State/step | Progress command |
| --- | --- | --- |
| Flash cleaning | 5/7 | 1148 |
| Deep cleaning | 5/10 | 1155 |
| Moisturizing | 5/9 | 1155 |
| Ink injection | 5/3 | 1136 |
| Snapshot | 8/0 | 1105 |

The existing activity_progress sensor is reused; no duplicate progress sensors are created. Progress must match the active operation and cannot precede a newer state observation. Print-job progress is independent. States 13/0 and 13/1 are post-maintenance residence, not active cleaning and not errors. No maintenance is triggered.

New sensor keys are `accessory_type`, `bed_present`, `printer_state`, `maintenance_operation`, `connection_status`, and `last_activity`, using the unchanged entity prefix `sensor.eufymake_e1_<serial>_`. Existing bed_type and activity_progress are extended. Attributes expose source/time/raw non-identifying numeric observations, report agreement, operation context, last activity time and last telemetry time. Ordinary live readings retain the existing 120-second freshness limit and disconnect behavior. Saved dates remain available offline.

Routine coordinator notifications are coalesced to at most once per second; operating-state and accessory changes and connection events remain immediate. The periodic freshness refresh remains in place. Raw observation timestamps are captured before handing MQTT callbacks to the HA event loop. They are receipt times, not claimed physical-action/device times. Explicit event timestamps are accepted for reconstruction and ordered in UTC. Job timestamp fields are not assumed to be message timestamps.

Human-readable time displays use the IANA America/Los_Angeles timezone by default, including DST. The monitor accepts an optional card time_zone override. Existing calendar date interpretation is preserved. Legacy frontend syntax/features already in use are retained; no new frontend dependencies were introduced.

## Activity Lab history

Raw redacted fields and original command codes remain attached to retained records. Meanings are additional detail, not a replacement for raw capture. Hardware code changes bypass five-second telemetry sampling so short removal/install transitions are retained. Repeated commands can add counts without duplicate human events. 1118/1153 reports of the same installation produce one installed description. A startup/reconnect report establishes or refreshes a baseline and does not claim a new physical installation.

Status events describe print start/pause/resume, end, maintenance start/end and post-maintenance entry. Completion is described only when the observed active print reaches 100% and then Idle without a session gap; otherwise an end is unconfirmed. Maintenance end means a status change, not an assertion of successful completion. Connection gaps clear live progress, preserve baseline hardware identity and do not invent a finish event.

Explicitly out-of-order records retain their original observation time and raw fields, are marked historical, and do not revert current decoded values or close a newer status residence. Repeated identical timed reports are bounded-deduplicated. Existing event IDs/revisions survive saves, restarts, notes and labels. Timeline/CSV descriptions use decoded meanings but user labels retain precedence. Duration is labeled state residence, never continuous cleaning duration.

Unknown command capture, bounded redaction, sampling, retention and diagnostic counts remain. The tool still does not capture complete wire payloads or reconstruct fragmented frames. User notes can contain private information; protect local backups and review exports before sharing.

## Evidence and validation

- Three attached October 20 exports were identical (SHA-256 prefix 2df26832bfa39381); this available export contains 5,501 events and 5,373 retained field records, not the separately described 6,124-event export.
- Read-only replay confirmed Standard Flatbed installation exactly once, with separate bed/accessory raw reports. The supplied export contains Mini/Standard/removal codes, but not the later rotary swap. The rotary tests use the exact observations supplied directly in the task as small synthetic UTC fixtures.
- Actual October 19 20:32–20:33 Pacific samples match the four screenshot percentages; remaining time differs by 1, 1, 2 and 0 seconds respectively. These compact non-identifying samples are included in the test fixture.
- Monitor: 62 Python tests and both card-layout suites pass.
- Activity Lab: 33 Python tests and both jsdom interaction suites pass, including raw details, notes, settings, labels, progress freshness, code separation and DST rendering.
- JavaScript syntax, Python parsing, integration JSON and whitespace checks are run locally. Existing dependency declarations and lockfiles are unchanged.

These are standalone/boundary tests and export replay. A live Home Assistant installation, real MQTT connection, actual rotary reconnection, camera, browser device tests on a physical legacy iPad, hassfest/HACS validators and manual installation were not performed. No claim of hardware deployment verification is made. The 13/0 wording, all maintenance-progress associations, reply semantics beyond the observed correlations, unknown scales/fields and untested accessories remain inferred or unknown as appropriate.

## Files and manual use

See CHANGED_FILES.md for the implementation file list and MANUAL_INSTALL.md for installation and verification steps. The GitHub release workflow tests and publishes only the monitor. No partial dashboard YAML is needed.

## Additional monitor release clarifications

Waste tank visualization is fullness, `100 - waste_tank_remaining`, with a red growing bar. The underlying existing remaining-capacity entity is unchanged. A fresh zero-detection report warns that the bed may be absent or its latch not engaged. Latch position cannot be decoded independently from these observations. This also limits any claim that a zero report proves physical accessory removal. No new automatic notifications or control actions are added. The separate Activity Lab review branch is not changed by this monitor release.
