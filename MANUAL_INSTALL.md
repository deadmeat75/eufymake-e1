# Manual installation — not performed by this task

Full ready-to-use component folders are in these existing workspaces:

- `/workspace/eufymake-e1/custom_components/eufymake_e1/`
- `/workspace/private-tools/eufymake-activity-lab/custom_components/eufymake_activity_lab/`

Complete update ZIPs are in the `review-downloads` directory on each authorized GitHub review branch, as well as `/workspace/artifacts/eufymake-telemetry/` locally. They contain full `custom_components/<domain>/` trees (including existing manifests, translations, brand assets and frontend files), not partial YAML. They contain no credentials, database files or recordings. They are review-branch development artifacts; no release has been made.

When you choose to install manually:

1. Make a Home Assistant backup and export Activity Lab JSON. Keep the previous component folders so you can restore them.
2. Extract the appropriate ZIP on your computer. Copy its entire `custom_components/eufymake_e1` folder over `/config/custom_components/eufymake_e1` and, if updating Activity Lab too, its entire `custom_components/eufymake_activity_lab` folder over the matching path. Copy every new helper module as well as existing files. Do not delete or replace `/config/.storage` or `/config/eufymake_activity_lab`; those contain configuration/dates and the Lab database.
3. Do not add a new integration entry, change credentials/MQTT settings, or replace your dashboard YAML. Existing entries and IDs are reused.
4. Restart Home Assistant yourself when you choose to apply the new files, then refresh the dashboard browser fully. This task has not installed files in your Home Assistant or restarted it. An ordinary HACS download of the published release will still fetch the published code, not these local changes.

## Verify after installation

- Confirm your original printer entry, ink/waste readings, dates, unit selection, panel layouts and existing automations still work.
- In Settings → Devices & services → your existing E1 device, inspect existing Bed Type, Progress, Print Time, Time Remaining and Activity Progress sensors. New keys are accessory_type, bed_present, printer_state, maintenance_operation, connection_status and last_activity. Do not change entity IDs used by existing dashboards.
- On a normal safe accessory swap, compare the separate bed/accessory raw codes, source commands, report times and consistency status. Rotary must be bed 3/accessory 4, Mini 2/1, Standard 1/2 and removal 0/0. A brief unavailable counterpart is expected while asynchronous reports catch up. Do not move/remove an accessory while the printer is operating.
- Compare a normal print with Studio: progress 1700 → 17%, remaining 678 → 11m 18s, elapsed 187 → 3m 7s. 100% must remain Printing until the status changes. Idle must not show a completed job's old metrics as current printing.
- During naturally occurring maintenance, check each progress source against its operation. No need to run cleaning solely for testing. 13/0 and 13/1 must not show active-cleaning progress or trigger an error/action.
- In E1 Lab inspect installation meanings, raw Details/note, reply values, UTC JSON timestamps and Pacific display times. Reconnect should not create a false installation. User labels, notes, capture settings, limits and exports should still work.
- If networking drops, live sensors become unavailable and connection status changes; saved expiration dates remain. Last report timestamps explain stale observations.

Rollback: restore the backed-up component files and restart Home Assistant yourself. The unchanged SQLite storage and saved-date formats remain usable. Do not remove the integration entry to roll back; removal can delete its saved data.
