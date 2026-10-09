# Validation — 0.2.0 native integration preview

## Completed locally

- 33 Python tests passed: credentials parse/validation, minimal retained account data, numeric units, complete ink/waste snapshots, unknown startup, zero and expired countdowns, manual dates under unavailable readings, fresh countdown updates, independent per-reading freshness, status mappings, missing-channel clearing, disconnect/reconnect behavior, restoring saved dates, encrypted frame round trip and corruption detection, batched frame processing, guided setup selection/error/duplicate/reauth behavior, network-thread handoff, immediate manual-date persistence, native sensor/date properties, and unload callback protection.
- JavaScript syntax and rendering tests passed for both layouts at 0% and 100%, offline state, saved dates, renamed entity IDs, and balanced markup.
- Local browser fixture preview inspected at 1280×720; the horizontal card fits inside the viewport. Corrected progress-icon overlap caused by carrying button-card offsets into a standalone element. Native ring content now uses explicit positions. Preview icons are placeholders, not Home Assistant's actual icon components.
- JSON manifests/translations parse and Python files compile. No credential/profile files or Python caches are included in the archive.

The boundary tests use small API doubles, not Home Assistant Core. No credentials were imported and no real Eufy cloud connection occurred.

## Required before release

1. Create the prepared aperluss/eufymake-e1 repository (owner and manifest URLs are set). Run hassfest and HACS repository validation.
2. Load on Home Assistant Core 2026.10.0+ on a supported Linux runtime. Confirm all integration dependencies load and all 26 entities are created.
3. Exercise Studio file selection, multiple-printer selection, certificate validation, invalid credentials and duplicate setup.
4. Verify actual idle, printing, paused, progress and remaining time against Studio during a short print.
5. Verify low ink, zero/negative expiration, unknown cartridge fields, manual dates and cartridge replacement behavior.
6. Disconnect the printer/network; confirm live readings become unavailable while saved dates remain. Reconnect and verify no stale readings reappear before fresh messages.
7. Restart/reload/remove the integration and restart Home Assistant. Confirm dates persist through restart, connections/timers stop on unload, sidebar panel is removed on unload, and existing dashboards/helpers remain intact.
8. Test reauthentication with updated Studio exports. Confirm the selected printer cannot accidentally change during reauth.
9. Inspect the automatic sidebar panel and existing-Lovelace card on desktop and mobile using actual Home Assistant icons/theme.
10. Install/update from a GitHub custom repository using HACS, then test a release update.

The archive is a development preview. A real Home Assistant/printer test and repository publication are still needed to fulfill the complete public-installation goal.

## 0.2.1 regression fix

Manual dates now persist as explicit overrides. A model serialization test and a coordinator restart test verify that subsequent zero countdowns cannot replace Yellow/Gloss dates. 33 Python tests pass. Real Home Assistant restart verification of this fix is pending.
