"""Remove only this entry's obsolete editable date entities."""
from homeassistant.helpers import entity_registry as er
from .const import CONSUMABLES, DOMAIN


def remove_legacy_date_entities(hass, entry, device_id):
    registry = er.async_get(hass)
    expected = {device_id + "_" + key + "_expiration_date" for key in CONSUMABLES}
    for entity in er.async_entries_for_config_entry(registry, entry.entry_id):
        if entity.domain == "date" and entity.platform == DOMAIN and entity.unique_id in expected:
            registry.async_remove(entity.entity_id)
