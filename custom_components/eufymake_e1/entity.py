"""Shared native entity metadata."""
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from .const import DOMAIN


class EufyMakeEntity(CoordinatorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, coordinator, key, entity_domain):
        super().__init__(coordinator)
        self.key = key
        self._attr_unique_id = coordinator.device_id + "_" + key
        self._attr_name = key.replace("_", " ").title()
        self.entity_id = entity_domain + "." + coordinator.device_id + "_" + key
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, coordinator.entry.data["serial"])},
            name=coordinator.entry.title,
            manufacturer="EufyMake", model="E1",
        )

    @property
    def extra_state_attributes(self):
        # Let the bundled card bind correctly even after entity IDs are renamed.
        return {"eufymake_device_id": self.coordinator.device_id, "eufymake_key": self.key}
