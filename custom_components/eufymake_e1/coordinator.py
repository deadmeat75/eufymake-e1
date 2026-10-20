"""Bridge cloud callbacks to Home Assistant's event loop and native storage."""
from datetime import datetime, timedelta, timezone
import logging
import time
from homeassistant.core import callback
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.storage import Store
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from homeassistant.util import dt as dt_util
from .cloud import CloudClient
from .const import DOMAIN, INTERVAL
from .model import PrinterState, device_id

LOGGER = logging.getLogger(__name__)


class EufyMakeCoordinator(DataUpdateCoordinator):
    def __init__(self, hass, entry):
        super().__init__(hass, LOGGER, config_entry=entry, name="EufyMake E1", update_interval=timedelta(seconds=10))
        self.entry = entry
        self.device_id = device_id(entry.data["serial"])
        self.model = PrinterState()
        self.store = Store(hass, 1, f"{DOMAIN}.{entry.entry_id}.dates")
        self.client = CloudClient(dict(entry.data), self._cloud_event)
        self.closed = False
        self.last_received = None
        self._publish_handle = None
        self._last_publish = 0
        self.reading_received = {}
        self._remove_query = None
        self._dates_loaded = False
        self._reauth_started = False
        self.panel_path = self.device_id.replace("_", "-")

    async def async_start(self):
        stored = await self.store.async_load()
        stored = stored if isinstance(stored, dict) else {}
        if isinstance(stored.get("dates"), dict):
            self.model = PrinterState(stored["dates"], manual_dates=stored.get("manual_dates", []))
        else:
            # Preserve pre-fix dates; the old format did not record manual edits.
            self.model = PrinterState(stored, manual_dates=stored.keys())
        self._dates_loaded = True
        await self.hass.async_add_executor_job(self.client.start)
        self._remove_query = async_track_time_interval(self.hass, self._async_query, timedelta(seconds=INTERVAL))
        await self.async_config_entry_first_refresh()

    def _cloud_event(self, kind, payload):
        # Paho invokes this on its network thread; entity/storage changes happen on HA's loop.
        self.hass.add_job(self._async_receive, kind, payload, datetime.now(timezone.utc).isoformat())

    @callback
    def _async_receive(self, kind, payload, observed_at=None):
        if self.closed:
            return
        if kind == "connected":
            self.model.connected = True
        elif kind == "disconnected":
            self.model.disconnected()
        elif kind == "auth_failed":
            self.model.disconnected()
            if not self._reauth_started:
                self._reauth_started = True
                self.entry.async_start_reauth(self.hass)
        elif kind == "message" and self.model.connected:
            self.last_received = dt_util.now().isoformat()
            received_at = time.monotonic()
            if self.model.apply(payload, received_at, dt_util.now().date(), observed_at=observed_at):
                self.store.async_delay_save(self.model.stored_data, 1)
            for key, (_, stamp) in self.model.readings.items():
                if stamp == received_at:
                    self.reading_received[key] = self.last_received
        data = self.model.snapshot(time.monotonic())
        important = kind != 'message' or any((self.data or {}).get(key) != data.get(key)
            for key in ('printer_status','printer_step','bed_type','accessory_type','bed_present'))
        if important or time.monotonic() - self._last_publish >= 1:
            self._publish()
        else:
            self.data = data
            if self._publish_handle is None:
                self._publish_handle = self.hass.loop.call_later(1, self._publish)

    def _publish(self):
        if self._publish_handle:
            self._publish_handle.cancel()
            self._publish_handle = None
        if not self.closed:
            self._last_publish = time.monotonic()
            self.async_set_updated_data(self.model.snapshot(self._last_publish))

    async def _async_query(self, now):
        if not self.closed:
            await self.hass.async_add_executor_job(self.client.query)

    async def _async_update_data(self):
        return self.model.snapshot(time.monotonic())

    async def async_close(self):
        if self.closed:
            return
        self.closed = True
        if self._publish_handle:
            self._publish_handle.cancel()
            self._publish_handle = None
        if self._remove_query:
            self._remove_query()
        await self.async_shutdown()
        try:
            if self._dates_loaded:
                await self.store.async_save(self.model.stored_data())
        finally:
            await self.hass.async_add_executor_job(self.client.stop)
