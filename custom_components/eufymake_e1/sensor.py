"""Native printer sensors."""
from homeassistant.components.sensor import SensorEntity, SensorDeviceClass
from .const import SENSOR_KEYS
from .entity import EufyMakeEntity


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities(EufyMakeSensor(entry.runtime_data, key) for key in SENSOR_KEYS)


class EufyMakeSensor(EufyMakeEntity, SensorEntity):
    def __init__(self, coordinator, key):
        super().__init__(coordinator, key, "sensor")
        if key.endswith("_ink_remaining") or key in ("waste_tank_remaining", "print_progress"):
            self._attr_native_unit_of_measurement = "%"
        elif key.endswith("_expiration"):
            self._attr_native_unit_of_measurement = "d"
        elif key in ("print_time", "time_remaining"):
            self._attr_native_unit_of_measurement = "s"
            self._attr_device_class = SensorDeviceClass.DURATION

    @property
    def available(self):
        return self.coordinator.data is not None and self.coordinator.data.get(self.key) is not None

    @property
    def native_value(self):
        return (self.coordinator.data or {}).get(self.key)
