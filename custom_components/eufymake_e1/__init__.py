"""EufyMake E1 Studio custom integration."""
from pathlib import Path
from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.const import EVENT_HOMEASSISTANT_STOP, Platform
from homeassistant.exceptions import ConfigEntryAuthFailed, ConfigEntryNotReady
from .cloud import CloudAuthError, CloudError
from .const import CARD_URL, DOMAIN
from .coordinator import EufyMakeCoordinator

PLATFORMS = [Platform.SENSOR, Platform.DATE]


async def async_setup(hass, config):
    # Static JavaScript contains no account credentials or live state.
    await hass.http.async_register_static_paths([
        StaticPathConfig("/eufymake_e1/card.js", str(Path(__file__).parent / "www" / "card.js"), cache_headers=False),
    ])
    frontend.add_extra_js_url(hass, CARD_URL)
    return True


async def async_setup_entry(hass, entry):
    coordinator = EufyMakeCoordinator(hass, entry)
    try:
        await coordinator.async_start()
    except CloudAuthError as error:
        await coordinator.async_close()
        raise ConfigEntryAuthFailed("Refresh your Studio files to reconnect.") from None
    except (CloudError, OSError) as error:
        await coordinator.async_close()
        raise ConfigEntryNotReady("Could not connect to the Eufy printer service.") from None
    entry.runtime_data = coordinator
    try:
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
        await panel_custom.async_register_panel(
            hass, frontend_url_path=coordinator.panel_path,
            webcomponent_name="eufymake-e1-panel", sidebar_title=entry.title,
            sidebar_icon="mdi:printer-3d", module_url=CARD_URL, embed_iframe=False,
            config={"device_id": coordinator.device_id},
        )
    except Exception:
        await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
        await coordinator.async_close()
        raise

    async def stop(event):
        await coordinator.async_close()

    entry.async_on_unload(hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, stop))
    return True


async def async_unload_entry(hass, entry):
    if not await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        return False
    frontend.async_remove_panel(hass, entry.runtime_data.panel_path)
    await entry.runtime_data.async_close()
    return True


async def async_remove_entry(hass, entry):
    from homeassistant.helpers.storage import Store
    await Store(hass, 1, f"{DOMAIN}.{entry.entry_id}.dates").async_remove()
