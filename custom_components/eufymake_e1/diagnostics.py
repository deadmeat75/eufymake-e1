"""Diagnostics with no account/profile data or cartridge identifiers."""
async def async_get_config_entry_diagnostics(hass, entry):
    coordinator = entry.runtime_data
    return {
        "version": "0.2.0",
        "connected": coordinator.model.connected,
        "saved_date_count": len(coordinator.model.dates),
        "available_readings": [key for key, value in (coordinator.data or {}).items() if value is not None],
    }
