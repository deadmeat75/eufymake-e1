"""Guided local Studio-file import and printer selection."""
import asyncio
import probatio as vol
from homeassistant import config_entries
from homeassistant.components.file_upload import process_uploaded_file
from homeassistant.helpers import selector
from .cloud import CloudAuthError, CloudClient, CloudError
from .const import DOMAIN
from .credentials import parse_imports


def _read_uploads(hass, uploaded):
    result = []
    for key in ("device_file", "login_file", "ca_file"):
        with process_uploaded_file(hass, uploaded[key]) as path:
            if path.stat().st_size > 2 * 1024 * 1024:
                raise ValueError("File too large")
            result.append(path.read_bytes())
    return parse_imports(*result)


def _validate_cloud(credentials):
    client = CloudClient(credentials, lambda *args: None)
    try:
        client.start()
    finally:
        client.stop()


class EufyMakeConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    @staticmethod
    def async_get_options_flow(config_entry):
        return EufyMakeOptionsFlow()

    def __init__(self):
        self._printers = []

    async def async_step_user(self, user_input=None):
        errors = {}
        if user_input is not None:
            try:
                self._printers = await self.hass.async_add_executor_job(_read_uploads, self.hass, user_input)
                if len(self._printers) == 1:
                    return await self.async_step_printer({"printer": "0"})
                return await self.async_step_printer()
            except (ValueError, OSError):
                errors["base"] = "invalid_files"
        return self.async_show_form(step_id="user", errors=errors, data_schema=vol.Schema({
            vol.Required("device_file"): selector.FileSelector({"accept": ".json"}),
            vol.Required("login_file"): selector.FileSelector({"accept": ".json"}),
            vol.Required("ca_file"): selector.FileSelector({"accept": ".crt,.pem"}),
        }))

    async def async_step_printer(self, user_input=None):
        if not self._printers:
            return await self.async_step_user()
        errors = {}
        if user_input is not None:
            try:
                index = int(user_input["printer"])
                if not 0 <= index < len(self._printers):
                    raise ValueError("Invalid selection")
                credentials = self._printers[index]
                serial = credentials["serial"]
                await self.async_set_unique_id(serial)
                reauth = self.context.get("source") == config_entries.SOURCE_REAUTH
                if reauth:
                    entry = self._get_reauth_entry()
                    if entry.unique_id != serial:
                        errors["base"] = "wrong_printer"
                else:
                    self._abort_if_unique_id_configured()
                if not errors:
                    await self.hass.async_add_executor_job(_validate_cloud, credentials)
                    self._printers = []
                    if reauth:
                        return self.async_update_reload_and_abort(entry, data_updates=credentials)
                    return self.async_create_entry(title="EufyMake E1 · " + serial[-6:], data=credentials)
            except CloudAuthError:
                errors["base"] = "invalid_auth"
            except (CloudError, OSError, asyncio.TimeoutError):
                errors["base"] = "cannot_connect"
            except (ValueError, KeyError, IndexError):
                errors["base"] = "invalid_selection"
        return self.async_show_form(step_id="printer", errors=errors, data_schema=vol.Schema({
            vol.Required("printer", default="0"): selector.SelectSelector({
                "options": [{"value": str(i), "label": "EufyMake E1 · " + device["serial"][-6:]} for i, device in enumerate(self._printers)],
                "mode": "dropdown",
            }),
        }))

    async def async_step_reauth(self, entry_data):
        return await self.async_step_user()


class EufyMakeOptionsFlow(config_entries.OptionsFlow):
    """Local display thresholds and optional HA persistent notifications."""
    async def async_step_init(self, user_input=None):
        errors = {}
        if user_input is not None:
            thresholds = [user_input.get('low_ink_' + key, 10) for key in ('cyan','magenta','yellow','black','white','gloss')]
            if user_input.get('low_ink_unit', 'percent') not in ('percent','ml') or any(type(v) not in (int,float) or not 0 <= v <= 100 for v in thresholds):
                errors['base'] = 'invalid_threshold'
            else:
                return self.async_create_entry(title='', data=user_input)
        defaults = self.config_entry.options
        schema = {
            vol.Optional('notify_completion', default=defaults.get('notify_completion', False)): bool,
            vol.Optional('notify_waste', default=defaults.get('notify_waste', False)): bool,
            vol.Optional('notify_connection', default=defaults.get('notify_connection', False)): bool,
            vol.Optional('low_ink_unit', default=defaults.get('low_ink_unit','percent')): vol.In(['percent','ml']),
        }
        for key in ('cyan','magenta','yellow','black','white','gloss'):
            schema[vol.Optional('low_ink_' + key, default=defaults.get('low_ink_' + key,10))] = vol.All(vol.Coerce(float), vol.Range(min=0,max=100))
        return self.async_show_form(step_id='init',errors=errors,data_schema=vol.Schema(schema))
