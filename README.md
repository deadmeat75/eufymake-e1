# EufyMake E1 Monitor — Home Assistant integration

**Stable release 1.1.0.** A Home Assistant integration for monitoring your EufyMake E1 printer, with a bundled dashboard and read-only expiration dates.

Tested and working on the maintainer's Home Assistant installation. This is an unofficial community project, not affiliated with EufyMake or Home Assistant.

The verified telemetry changes are documented in [TELEMETRY_IMPLEMENTATION.md](TELEMETRY_IMPLEMENTATION.md). Update the monitor through HACS; the separate Activity Lab update remains review-only.

## Features

- Guided setup through Home Assistant.
- Direct verified-TLS connection to Eufy's cloud MQTT service.
- 29 monitoring sensors (plus seven saved-date sensors): six ink levels, six ink countdowns, waste capacity and countdown, printer status and step, progress, elapsed time, remaining time, activity progress, bed type, measured surface height, printer lighting status, independent accessory type, bed presence, raw printer state, maintenance operation, connection freshness, and last activity.
- Seven read-only expiration-date sensors, stored in Home Assistant and available while the printer is offline.
- Printer-reported expiration timestamps, including expired ink; previously saved fallback dates persist when reliable printer dates are missing.
- Automatic sidebar dashboard with horizontal and vertical layouts.
- Bundled card for existing Lovelace dashboards.
- Separate identities for each printer.

No local MQTT broker, shell bridge, Prometheus server, or separate dashboard dependency is required.

## Automatic expiration dates

Expiration dates are read-only. Valid printer `expirationTimestamp` values provide the original UTC date, including for expired cartridges whose countdown is clamped to zero. When timestamps are missing, valid countdown data is used. Dates remain saved while the printer is offline and survive Home Assistant restarts.

Previously saved dates are retained during upgrade as fallback values until reliable printer data replaces them. An expired zero countdown alone does not replace a saved date with today. If neither printer data nor a saved date exists, the date is unavailable.

This monitor does not modify ink cartridges or the printer and cannot bypass expiration-related printing lockouts.

### Upgrading from editable dates

Version 0.2.6 replaces the seven `date` entities with read-only `sensor` entities. The obsolete date entities are removed only for this integration's configured printer. Update any automations or custom dashboards that reference the old `date.*_expiration_date` entities to use the new sensors; date-setting actions are no longer supported. Other printer sensors keep their identities. The bundled dashboard updates automatically.

## Requirements

- Home Assistant Core **2026.10.0 or later**, on Home Assistant OS or Container.
- A registered EufyMake E1 printer.
- Internet access to Eufy's cloud broker.
- Anker Make Studio (formerly EufyMake Studio) installed and signed in on your computer.
- Your Studio `device_list.json`, `login_info.json`, and matching broker CA certificate.

This integration requires credentials and cloud access. It is not a local-only or passwordless printer connection.

## Install through HACS

1. Open **HACS**.
2. Open its menu and select **Custom repositories**.
3. Enter `https://github.com/deadmeat75/eufymake-e1`.
4. Choose category **Integration** and add the repository.
5. Find and download **EufyMake E1 Monitor**.
6. Restart Home Assistant.
7. Follow **Find your Studio files on Windows** and **Connect the integration** below.

HACS installs the bundled dashboard card with the integration. A separate frontend repository is unnecessary.

## Manual installation

1. Download and extract the source archive from a GitHub release.
2. Copy its `custom_components/eufymake_e1` folder into your Home Assistant configuration directory, creating:

   `/config/custom_components/eufymake_e1`

3. Restart Home Assistant.
4. Follow the file-location and connection instructions below.

Install the native integration, not the previous app/add-on prototype.

## Find your Studio files on Windows

The desktop app is now called **Anker Make Studio**. The paths below were verified with its earlier EufyMake Studio version; the app rename does not establish that its folders were renamed. If the paths are missing, use the new app's shortcut to find its installation folder and search for the same filenames. Do not substitute guessed folder names or use stale profiles from another account.

### Before you begin

Open Anker Make Studio (formerly EufyMake Studio) on the Windows computer you normally use with your printer. Sign in to the account that owns the E1 and confirm that the printer appears in Studio.

Use files belonging to that account and printer.

### Open the folders in File Explorer

1. Open **File Explorer** using the yellow folder icon on your taskbar.
2. Click the **address bar at the top**, not the search box.
3. Paste one of the folder paths below.
4. Press **Enter**.

You do not need to use Windows + R or manually reveal hidden folders.

### Printer file: device_list.json

Paste this folder path into File Explorer's address bar:

```text
%APPDATA%\eufyMake Studio Profile\cache\offline\device_info
```

Locate:

```text
device_list.json
```

Complete file path:

```text
%APPDATA%\eufyMake Studio Profile\cache\offline\device_info\device_list.json
```

### Account file: login_info.json

Paste this folder path into File Explorer's address bar:

```text
%APPDATA%\eufyMake Studio Profile\cache\offline\user_info
```

Locate:

```text
login_info.json
```

Complete file path:

```text
%APPDATA%\eufyMake Studio Profile\cache\offline\user_info\login_info.json
```

### CA certificate: verified US installation

The certificate was found in this Studio installation folder on the maintainer's Windows computer:

```text
%LOCALAPPDATA%\eufyMake Studio
```

For the verified US setup, locate:

```text
make-us.crt
```

If the certificate is not directly visible, use File Explorer's search box to search that folder and its subfolders for `make-us.crt`.

Studio installation locations may vary. If this folder does not exist, right-click your Studio shortcut and choose **Open file location**. If that opens another shortcut, repeat the operation to reach the installation folder, then search it.

For other regions, use the certificate matching Studio's broker connection. Do not assume `make-us.crt` is correct for every region.

The integration accepts `.crt` or `.pem` files containing a CA certificate. Do not select a private-key file or rename an unrelated file.

### What the Windows path shortcuts mean

Windows expands these automatically for the currently signed-in user:

- `%APPDATA%` normally points to `C:\Users\<your Windows username>\AppData\Roaming`.
- `%LOCALAPPDATA%` normally points to `C:\Users\<your Windows username>\AppData\Local`.

Paste the paths exactly as shown, including the percent signs. You do not need to substitute your username.

If the profile files are missing, sign in to Studio, confirm your printer is listed, and check again. Profile locations may differ between Studio versions.

## Connect the integration

Complete these steps in a browser on the Windows computer containing your Studio files. If you normally access Home Assistant from a phone, use your Studio computer for this setup.

1. Open your Home Assistant instance.
2. Go to **Settings → Devices & services**.
3. Select **Add integration**.
4. Search for **EufyMake E1 Monitor** and select it.
5. Use each file selector to choose the corresponding file:

   | Home Assistant field | File |
   | --- | --- |
   | Printer file | `device_list.json` |
   | Account file | `login_info.json` |
   | Studio CA certificate | Matching broker CA certificate; `make-us.crt` for the verified US setup |

6. Submit the form.

The file selector browses files on the computer running your browser. You do not need to copy these credential files into Home Assistant's `/config` folder or edit their contents.

### Choose the correct printer

If the imported files contain one printer, setup selects it automatically.

If they contain multiple printers, select the intended E1 from the dropdown. Each option displays the last six characters of its serial number. Compare those characters with your printer's serial number before submitting.

Setup checks the cloud connection before completing.

### After setup

1. Open the **EufyMake** sidebar dashboard.
2. Refresh your browser if the card has not loaded.
3. Read the automatic expiration dates on the dashboard or the native expiration-date sensors.

New entities use printer-specific IDs such as:

- `sensor.eufymake_e1_<serial>_*`
- `sensor.eufymake_e1_<serial>_*_expiration_date` (read-only dates)

Existing legacy sensors and helpers are not modified. Dates from legacy helpers are not automatically migrated.

## Troubleshooting setup

### Files could not be read

Select the original files again, ensuring the printer and account files are in the correct fields and the certificate is a valid CA certificate.

Supported region mappings currently include US, CA, MX, EU, GB, DE, and FR.

### Authentication failed

Sign in to Anker Make Studio (formerly EufyMake Studio) again and reimport its current files. Confirm that the selected files belong to the account that owns the printer.

### Connection failed

Check Home Assistant's internet access, your account region, and the matching broker CA certificate.

### Refreshing credentials

When reauthentication is requested, import the current Studio files and select the same printer already configured in Home Assistant.

## Credentials and privacy

The selected files are uploaded to your Home Assistant instance through Home Assistant's file selector. Use a secure Home Assistant connection, especially when accessing it remotely.

The integration reads the files and retains only the information needed for the selected printer's connection:

- User ID and email.
- Region.
- Printer serial number.
- Printer secret key.
- CA certificate.

It does not retain the complete Studio profiles in its config entry.

The retained credentials are used to authenticate to Eufy's cloud service. They are not bundled into the dashboard JavaScript or included in the integration's diagnostics.

**Protect Home Assistant backups:** they can contain integration credentials.

Never upload your credential files to GitHub, attach them to issue reports, or share screenshots showing their contents.

## Ink display units and live-data timestamp

Use the **% / mL** buttons to choose the display unit for the six ink cartridges. Each has a 100 mL capacity, so 65% corresponds to an estimated 65 mL. This is calculated from the printer's percentage, not a separate volume measurement. Ink fill bars and low-ink warnings are unchanged. Waste-tank capacity and print progress remain percentages; unavailable ink remains unavailable.

The ink-unit toggle remembers your selection per printer in this browser, including after reloads and layout changes. Other browsers and devices keep their own preferences. If browser storage is disabled or cleared, the configured default is used. For a Lovelace card, `ink_unit: ml` or `ink_unit: percent` sets the initial default when no saved preference exists.

The dashboard shows when live printer data was last received, including while disconnected. This timestamp refers to the latest received message, not the freshness of every individual sensor. It resets when the integration restarts; saved expiration dates persist independently.

## Activity and printer details

The dashboard distinguishes print progress from **snapshot progress** (command 1105) and **maintenance progress** (1136 for injection, 1148 for flash cleaning, and 1155 for deep cleaning/moisturizing). Percentages belong to the active operation and are cleared when it changes. A print can report 100% with time remaining: it remains Printing until the printer reports a different status. When not printing, print time reads Not printing and old print progress is hidden. Expected inactive print readings are excluded from the missing-readings warning; missing ink and waste readings still count.

Read-only printer details show:

- **Bed:** command 1118 codes `0/1/2/3` mean absent/Standard Flatbed/Mini Flatbed/Rotary. Command 1153 reports the accessory independently using `0/2/1/4` respectively. Other numeric codes remain Unknown (code), rather than guessed. This is the printer-reported bed setting, not independent verification of physically installed hardware.
- **Measured surface height:** millimeters from snapshot measurements, displayed to one decimal place. This is a reported measurement, not a height control.
- **Printer light:** reported On/Off status; no lighting control is added.

Each detail shows its own Last reported time in Home Assistant's timezone. Live fields become unavailable after 120 seconds without a fresh reading, or on disconnect; last-report timestamps remain visible until integration restart. Optional details are not included in the general missing-readings warning because some operations may not report them. Activity progress likewise becomes unavailable when missing or stale.

The `13/0` description is inferred from the maintenance sequence and matching Studio history. It indicates ink injection is required after moisturizing; it does not initiate injection. Camera access, printer controls, and unverified accessory mappings are not included in 1.0.0.

## Existing Lovelace dashboards

The integration registers its card automatically. To add it to an existing dashboard:

```yaml
type: custom:eufymake-e1-card
device_id: eufymake_e1_yourlowercaseserial
layout: horizontal
```

Use the exact `eufymake_device_id` attribute from one of your printer's native sensors.

Set `layout: vertical` for the vertical arrangement. The card also provides a default configuration in the card picker.

The card uses entity metadata, so renamed entity IDs continue to work. Narrow screens wrap; fit depends on screen dimensions and browser zoom.

## Validation and limitations

- Installation and operation confirmed on the maintainer's Home Assistant instance.
- All 62 Python development tests passed, covering credentials, encrypted frames, state decoding, date persistence, and setup/coordinator behavior using Home Assistant API doubles.
- JavaScript rendering checks passed for both dashboard layouts, including renamed entities and unavailable readings.
- hassfest and HACS repository validation remain pending.
- Development tests do not establish compatibility with every Home Assistant installation or printer region.

The protocol implementation handles complete single frames. Fragmented frames are ignored; reassembly is not implemented.

Known printer status mappings (state/step) are:

| Pair | Dashboard status |
| --- | --- |
| `0/0` | Idle |
| `2/1` | Transferring print file |
| `2/2` | Waiting for Start |
| `2/3` | Paused |
| `2/4` | Printing |
| `2/6` | Priming print head |
| `5/3` | Injecting ink |
| `5/7` | Automatic flash clean |
| `5/9` | Automatic moisturizing |
| `5/10` | Automatic deep cleaning |
| `6/1` | Updating firmware |
| `8/0` | Taking snapshot |
| `9/0` | Calibration / self-check |
| `13/0` | Maintenance — ink injection required after moisturizing (inferred) |
| `13/1` | Maintenance — inject ink before printing |

These mappings use observations from the maintainer's E1. File transfer is supported by download-progress messages. Deep cleaning and the subsequent maintenance state are supported by the October 12 recording, Studio maintenance history, and its 00:42 notification that routine maintenance completed and the print head would remain in maintenance status. The recording switches from `5/10` to `13/1` at that time; the Studio status page says to inject ink before printing. They are not an official protocol specification. `2/5` and `8/2` remain unknown; no unverified action is performed by the integration.

Other combinations display **Unknown**.

This integration provides monitoring only. Start, pause, and cancel print controls are not included.

See `VALIDATION.md` for the detailed release and hardware checklist. Historical validation notes may describe checks that were pending when the preview was originally prepared.

## Development checks

```text
python -m pip install -r requirements-test.txt
python -m unittest discover -s tests -v
node tests/test_card.cjs
```

The standalone tests do not require printer credentials or a running Home Assistant instance.

## Credits

The wire protocol derives from [masto/eufy-ink](https://github.com/masto/eufy-ink), released under the Unlicense. Its license and original protocol credits are preserved.

New integration code is under the MIT license.

## Waste tank and bed detection warnings

The waste-tank card shows a red **Tank filled** bar: displayed fullness is `100 - waste_tank_remaining`. It grows as remaining capacity decreases. The existing remaining-capacity sensor and its entity ID stay unchanged for automations. Waste remains a percentage when the cartridge display is in mL. Unavailable readings display a dash, not an empty-tank claim.

A fresh **bed_present = false** report produces an amber warning to check that the bed is installed and its locking latch is fully engaged. The protocol report does not distinguish an absent bed from an unlocked latch, so this is not a latch-position sensor. No automatic notifications or printer actions are sent. Unknown or stale detection does not claim that the latch is unlocked. The same ambiguity applies when interpreting raw zero-code history as a removal.
