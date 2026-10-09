# EufyMake E1 Studio — Home Assistant integration

**Development preview 0.2.2.** A Home Assistant integration for monitoring your EufyMake E1 printer, with a bundled dashboard and editable expiration dates.

Tested and working on the maintainer's Home Assistant installation. This is an unofficial community project, not affiliated with EufyMake or Home Assistant.

## Features

- Guided setup through Home Assistant.
- Direct verified-TLS connection to Eufy's cloud MQTT service.
- 19 native sensors: six ink levels, six ink countdowns, waste capacity and countdown, printer status and step, progress, elapsed time, and remaining time.
- Seven editable expiration-date entities, stored in Home Assistant and available while the printer is offline.
- Manual date overrides preserved across restarts and subsequent printer countdown updates.
- Automatic sidebar dashboard with horizontal and vertical layouts.
- Bundled card for existing Lovelace dashboards.
- Separate identities for each printer.

No local MQTT broker, shell bridge, Prometheus server, or separate dashboard dependency is required.

## Important: expiration date edits

**Changing an expiration date only affects Home Assistant.**

Editing a saved date updates the Home Assistant date entity and dashboard display. It does not:

- Change the expiration date stored on the ink cartridge or printer.
- Update Eufy's cloud data.
- Reset a cartridge's expiration.
- Bypass expiration-related printing lockouts.

If the printer refuses to print because a cartridge has expired, changing its date in this integration will not unlock printing.

Manual dates remain until you edit them again. For a replacement cartridge, update its saved date manually. Dates saved by version 0.2.0 are preserved as overrides on upgrade.

## Requirements

- Home Assistant Core **2026.10.0 or later**, on Home Assistant OS or Container.
- A registered EufyMake E1 printer.
- Internet access to Eufy's cloud broker.
- EufyMake Studio installed and signed in on your computer.
- Your Studio `device_list.json`, `login_info.json`, and matching broker CA certificate.

This integration requires credentials and cloud access. It is not a local-only or passwordless printer connection.

## Install through HACS

1. Open **HACS**.
2. Open its menu and select **Custom repositories**.
3. Enter `https://github.com/deadmeat75/eufymake-e1`.
4. Choose category **Integration** and add the repository.
5. Find and download **EufyMake E1 Studio**.
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

### Before you begin

Open EufyMake Studio on the Windows computer you normally use with your printer. Sign in to the account that owns the E1 and confirm that the printer appears in Studio.

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
4. Search for **EufyMake E1 Studio** and select it.
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
3. Use the date buttons below the dashboard to enter or edit saved expiration dates. You can also edit the native date entities on the device page.

New entities use printer-specific IDs such as:

- `sensor.eufymake_e1_<serial>_*`
- `date.eufymake_e1_<serial>_*`

Existing legacy sensors and helpers are not modified. Dates from legacy helpers are not automatically migrated.

## Troubleshooting setup

### Files could not be read

Select the original files again, ensuring the printer and account files are in the correct fields and the certificate is a valid CA certificate.

Supported region mappings currently include US, CA, MX, EU, GB, DE, and FR.

### Authentication failed

Sign in to EufyMake Studio again and reimport its current files. Confirm that the selected files belong to the account that owns the printer.

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
- All 33 Python development tests passed, covering credentials, encrypted frames, state decoding, date persistence, and setup/coordinator behavior using Home Assistant API doubles.
- JavaScript rendering checks passed for both dashboard layouts, including renamed entities and unavailable readings.
- hassfest and HACS repository validation remain pending.
- Development tests do not establish compatibility with every Home Assistant installation or printer region.

The protocol implementation handles complete single frames. Fragmented frames are ignored; reassembly is not implemented.

Known printer status mappings are:

- `0/0`: Idle.
- `2/3`: Paused.
- `2/4`: Printing.

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
