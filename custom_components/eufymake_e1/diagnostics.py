"""Diagnostics with no account/profile data or cartridge identifiers."""
from .const import VERSION


async def async_get_config_entry_diagnostics(hass, entry):
    coordinator = entry.runtime_data
    return {
        "version": VERSION,
        "connected": coordinator.model.connected,
        "saved_date_count": len(coordinator.model.dates),
        "available_readings": [key for key, value in (coordinator.data or {}).items() if value is not None],
    }
