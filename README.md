# EufyMake E1 Studio — Home Assistant integration

**Development preview 0.2.1.** A native custom integration intended for distribution through HACS. Connect an EufyMake E1, view print progress and ink reserves, and keep expiration dates visible while the printer is offline.

This replaces the app/add-on prototype. No local MQTT broker, shell bridge, Prometheus server, virtual environment, startup script, hand-created helpers, HACS dashboard dependency, or terminal discovery commands are needed by the integration.

## What it includes

- Guided setup under **Settings → Devices & services → Add integration → EufyMake E1 Studio**.
- Direct verified-TLS connection to Eufy's cloud MQTT service, based on the supplied working printer protocol.
- 19 native sensors: six ink levels, six ink countdowns, waste capacity and countdown, printer status/step, progress, elapsed time and remaining time.
- Seven editable native date entities, persisted in Home Assistant storage. Valid fresh countdowns update the dates; unavailable countdowns preserve them. Manually entered dates remain until you edit them again, including after restart and when the printer reports zero days. For a replacement cartridge, edit its date manually. Dates saved by 0.2.0 are preserved as overrides on upgrade.
- Automatic EufyMake sidebar dashboard with horizontal and vertical layouts, all original graphical elements, and buttons to edit saved dates.
- The same bundled graphical card can be added to an existing Lovelace dashboard.
- Separate identities for each printer; no changes to the original `sensor.eufymake_e1_*` sensors or `input_datetime.eufymake_*` helpers.

## Requirements

- Home Assistant Core **2026.10.0 or later**, on Home Assistant OS or Container. The preview uses APIs checked against Core 2026.10.0; older versions have not been targeted.
- A registered EufyMake E1 and internet access to Eufy's cloud broker.
- The original EufyMake Studio `device_list.json`, `login_info.json`, and matching broker CA certificate. For the original US setup the certificate was `make-us.crt`.

Credentials are imported through Home Assistant's own file selector and are sent only to your Home Assistant instance during setup. Only the selected printer's required fields and CA certificate are kept in its config entry. They are used to authenticate to Eufy's cloud and are not bundled into the JavaScript dashboard or diagnostics. Protect Home Assistant backups, which can contain integration credentials. This is not a local-only or passwordless printer connection.

## Test installation from this ZIP

This is a source preview, not yet a published HACS repository. Do not install the previous app ZIP for this version.

1. Copy `custom_components/eufymake_e1` into your Home Assistant `/config/custom_components/eufymake_e1` folder.
2. Restart Home Assistant.
3. Add **EufyMake E1 Studio** from Devices & services. Select the three Studio files. If multiple devices are registered, select the E1.
4. After setup, open its EufyMake sidebar dashboard. Refresh the browser once if the new card is not yet loaded.
5. Enter any missing saved dates through the date buttons beneath the dashboard or through the native date entities on the device page.
**Expiration date edits only affect Home Assistant.** Changing a saved date updates the Home Assistant date entity and dashboard display only. It does not change the expiration date stored on the ink cartridge or printer, update Eufy's cloud data, or bypass expiration-related printing lockouts.
Use a test installation or retain the existing working configuration while checking this preview. New entity IDs use `sensor.eufymake_e1_<serial>_*` and `date.eufymake_e1_<serial>_*`. No existing dates are migrated automatically. Tests use invented sample data.

## HACS publication

The repository is structured for the HACS **Integration** category: all runtime files, translations, licenses and dashboard JavaScript are inside `custom_components/eufymake_e1`; `hacs.json` sits at the root.

The prepared repository destination is `deadmeat75/eufymake-e1`, with `@deadmeat75` as the code owner. The documentation and issue links target that planned repository; it has not been created or published by this preview. Before release, run Home Assistant hassfest and HACS validation on the target Core version, complete the real-printer checklist below, and create a GitHub release. HACS validation has not yet passed.

Once a repository is published, users can add its URL under HACS custom repositories with type **Integration**, download it, restart Home Assistant, and use the guided setup. HACS installs the bundled card as part of the integration; a second frontend repository is unnecessary.

## Existing Lovelace dashboards

The integration registers its card automatically. To place it in another dashboard:

```yaml
type: custom:eufymake-e1-card
device_id: eufymake_e1_yourlowercaseserial
layout: horizontal
```

Use the exact `eufymake_device_id` attribute from any native sensor. The card also offers a default configuration in the card picker. It binds to native entity metadata, so renamed entity IDs continue to work. Set `layout: vertical` to use the original arrangement. Narrow screens wrap; one-screen fit depends on available width, height and zoom. The native ring uses explicit positions rather than the original button-card offsets because its rendering context differs.

## Validation and limitations

33 Python tests pass, covering state decoding, dates, credentials, encrypted frames, and setup/coordinator boundary behavior using small Home Assistant API doubles. Both dashboard layouts pass JavaScript rendering checks, including renamed entities and unavailable readings. A local browser preview at 1280×720 was inspected with fixture data and placeholder icons. These checks do not replace a real Home Assistant Core and printer test.

Not yet verified: Home Assistant platform loading, actual file-selector UI, real cloud authentication/reconnect, native entity/date services, sidebar rendering in Home Assistant, and real HACS installation. hassfest/HACS validators have not been run. The local test host uses Python 3.12 and does not provide the Python 3.14.2+ Linux runtime required by Core 2026.10.0. See `VALIDATION.md` for the hardware checklist.

The protocol implementation handles complete single frames. Fragmented frames are ignored; reassembly is not implemented. Region mappings currently cover US, CA, MX, EU, GB, DE and FR; additional regions are rejected rather than guessed. Known status mappings come from the original tested printer: `0/0 Idle`, `2/3 Paused`, `2/4 Printing`; other combinations display Unknown. Monitoring only: no start/pause/cancel print controls are provided.

## Development checks

```text
python -m pip install -r requirements-test.txt
python -m unittest discover -s tests -v
node tests/test_card.cjs
```

## Credits

The wire protocol derives from [masto/eufy-ink](https://github.com/masto/eufy-ink), released under the Unlicense. Its license and original protocol credits are preserved. New integration code is under the MIT license. This is an unofficial community project; EufyMake and Home Assistant names identify compatibility.
