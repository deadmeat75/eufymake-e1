"""Shared native entity metadata."""
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from .const import DOMAIN
from .telemetry import OPERATIONS


class EufyMakeEntity(CoordinatorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False
    _unrecorded_attributes = frozenset({"history"})

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
        model = self.coordinator.model
        command = {'bed_type':1118, 'accessory_type':1153, 'activity_progress':
                   1105 if model.current_pair == (8,0) else OPERATIONS.get(model.current_pair, (None,None))[1],
                   'printer_status':1000, 'printer_state':1000, 'printer_step':1000,
                   'surface_height':1105, 'printer_light':1133, 'maintenance_operation':1000,
                   'print_progress':1001, 'time_remaining':1001, 'print_time':1001}.get(self.key)
        if self.key == 'bed_type' and '1118' not in model.hardware.reports:
            command = 1105
        detail = dict(model.details.get(command, {}))
        if self.key == 'bed_present' and model.hardware.reports:
            detail.update(max(model.hardware.reports.values(), key=lambda r: r['time']))
        if self.key in ('activity_progress','maintenance_operation'):
            detail['operation_state'] = model.current_pair
        if self.key in ('print_progress','time_remaining','print_time'):
            detail['print_context'] = 'Active or paused' if model.current_pair in ((2,3),(2,4)) else 'Inactive or unconfirmed'
        if self.key in ('bed_type','accessory_type','bed_present'):
            detail['configuration_status'] = model.hardware.configuration()['consistency']
        if self.key in ('printer_status','printer_state','printer_step'):
            detail.update(state=model.current_pair[0] if model.current_pair else None,
                          step=model.current_pair[1] if model.current_pair else None)
        if command in model.raw:
            detail['raw'] = model.raw[command]
        if self.key == 'last_activity':
            detail['activity_time'] = model.last_activity_time
        if self.key == 'connection_status':
            detail['last_telemetry_utc'] = model.last_telemetry
            detail['history'] = model.insights.public()
            options = getattr(self.coordinator.entry, 'options', {})
            detail['low_ink_thresholds'] = {key: options.get('low_ink_' + key, 10) for key in ('cyan','magenta','yellow','black','white','gloss')}
            detail['low_ink_unit'] = options.get('low_ink_unit', 'percent')
            detail['low_ink_threshold_source'] = 'Integration setting; native Eufy threshold unverified'
        return {**detail, "eufymake_device_id": self.coordinator.device_id, "eufymake_key": self.key,
                "last_received": self.coordinator.last_received,
                "reading_received": self.coordinator.reading_received.get(self.key) or detail.get("time") or
                    (model.last_telemetry if self.key == "connection_status" else model.last_activity_time if self.key == "last_activity" else None)}
