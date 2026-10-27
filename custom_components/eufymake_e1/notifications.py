"""Opt-in local HA notifications; no device or external messaging actions."""


class Notifications:
    def __init__(self, hass, entry):
        self.hass, self.entry = hass, entry
        self.disconnect_handle = None
        self.waste_high = False

    def enabled(self, key):
        return getattr(self.entry, 'options', {}).get('notify_' + key, False) is True

    def send(self, kind, message):
        from homeassistant.components import persistent_notification
        persistent_notification.async_create(self.hass, message, title='EufyMake E1 Monitor',
            notification_id='eufymake_e1_' + self.entry.entry_id + '_' + kind)

    def completed(self, record):
        if self.enabled('completion'):
            elapsed = record.get('elapsed_seconds')
            self.send('completion', 'Print completed.' + (f' Last reported elapsed time: {int(elapsed)//60}m {int(elapsed)%60}s.' if elapsed is not None else ''))

    def waste(self, remaining):
        if remaining is None:
            return
        if remaining <= 20 and not self.waste_high:
            self.waste_high = True
            if self.enabled('waste'):
                self.send('waste', f'Waste tank is {100-remaining:.1f}% filled. Check the tank in Anker Make Studio.')
        elif remaining > 25:
            self.waste_high = False

    def connection(self, connected):
        if connected:
            self.close()
        elif self.enabled('connection') and self.disconnect_handle is None:
            self.disconnect_handle = self.hass.loop.call_later(120, self._disconnected)

    def _disconnected(self):
        self.disconnect_handle = None
        if self.enabled('connection'):
            self.send('connection', 'The printer cloud connection has been unavailable for at least two minutes.')

    def close(self):
        if self.disconnect_handle:
            self.disconnect_handle.cancel()
            self.disconnect_handle = None
