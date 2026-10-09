"""Editable expiration dates that remain available while the printer is offline."""
from datetime import date
from homeassistant.components.date import DateEntity
from .const import CONSUMABLES
from .entity import EufyMakeEntity


async def async_setup_entry(hass, entry, async_add_entities):
    async_add_entities(EufyMakeDate(entry.runtime_data, key) for key in CONSUMABLES)


class EufyMakeDate(EufyMakeEntity, DateEntity):
    def __init__(self, coordinator, consumable):
        super().__init__(coordinator, consumable + "_expiration_date", "date")
        self.consumable = consumable

    @property
    def available(self):
        return True

    @property
    def native_value(self):
        value = self.coordinator.model.dates.get(self.consumable)
        return date.fromisoformat(value) if value else None

    async def async_set_value(self, value):
        await self.coordinator.async_set_date(self.consumable, value)
