"""Printer state with independent reading freshness and persistent dates."""
from datetime import date, datetime, timedelta, timezone
import re
from .telemetry import Hardware, OPERATIONS, STATUS, number, utc, transition
from .const import CHANNELS, CONSUMABLES, MAX_AGE, SENSOR_KEYS


def numeric(value):
    return number(value)


def percentage(raw):
    value = numeric(raw)
    return value / 100 if value is not None and 0 <= value <= 10000 else None


def device_id(serial):
    suffix = re.sub("[^a-z0-9]", "", serial.lower())
    if not suffix:
        raise ValueError("Invalid printer serial")
    return "eufymake_e1_" + suffix


class PrinterState:
    def __init__(self, dates=None, max_age=MAX_AGE, manual_dates=None):
        self.readings = {}
        self.current_pair = None
        self.hardware = Hardware()
        self.sources = {}
        self.raw = {}
        self.details = {}
        self.last_activity = None
        self.last_activity_time = None
        self.last_telemetry = None
        self.connected = False
        self.max_age = max_age
        self.dates = {}
        self.manual_dates = set(manual_dates or ()) & set(CONSUMABLES)
        for key, value in (dates or {}).items():
            if key in CONSUMABLES:
                try:
                    self.dates[key] = date.fromisoformat(value).isoformat()
                except (TypeError, ValueError):
                    pass

    def set_date(self, key, value):
        if key not in CONSUMABLES:
            raise ValueError("Invalid consumable")
        parsed = date.fromisoformat(value)
        if parsed.isoformat() != value:
            raise ValueError("Use YYYY-MM-DD")
        self.dates[key] = value
        self.manual_dates.add(key)

    def stored_data(self):
        return {"dates": dict(self.dates), "manual_dates": sorted(self.manual_dates)}

    def _set(self, key, value, now):
        self.readings[key] = (value, now)

    def _expiry(self, key, value, now, today, timestamp=None, expired=False):
        days = numeric(value)
        if days is not None and (days != int(days) or abs(days) > 36500):
            days = None
        suffix = "_expiration" if key == "waste_tank" else "_ink_expiration"
        self._set(key + suffix, days, now)
        stamp = numeric(timestamp)
        # Printer dates are UTC Unix seconds. Reject placeholders and implausible dates.
        if stamp is not None and stamp == int(stamp) and 946684800 <= stamp < 4102444800:
            self.dates[key] = datetime.fromtimestamp(stamp, timezone.utc).date().isoformat()
            self.manual_dates.discard(key)
            return
        # Expired cartridges can report a clamped zero, not today's expiration date.
        if expired and days == 0:
            return
        if days is not None and (key not in self.manual_dates or days > 0):
            self.manual_dates.discard(key)
            self.dates[key] = (today + timedelta(days=days)).isoformat()

    def apply(self, item, now, today, observed_at=None):
        """Process one decoded message; returns whether persisted date data changed."""
        if not isinstance(item, dict) or type(item.get("commandType")) is not int:
            return False
        before = self.stored_data()
        command = item["commandType"]
        event_time = utc(observed_at) if observed_at is not None else None
        if observed_at is not None and event_time is None:
            return False
        clock = event_time if event_time is not None else now
        previous_clock = self.sources.get(command)
        if previous_clock is not None and type(clock) is type(previous_clock) and clock < previous_clock:
            return False
        self.sources[command] = clock
        event_time = event_time or datetime.now(timezone.utc).isoformat(timespec='microseconds')
        self.last_telemetry = max(self.last_telemetry or event_time, event_time)
        self.raw[command] = {k: v for k, v in item.items() if k in ("commandType","plateType","attType","reply","progress","time","totalTime","light","height") and type(v) in (int, float, bool) and number(v) is not None}
        self.details[command] = {'source_command': command, 'time': event_time}

        if command == 1100:
            ink = item.get("ink")
            ink = ink if isinstance(ink, dict) else {}
            levels, expiry = ink.get("leftInk"), ink.get("distanceExpiration")
            timestamps, expired = ink.get("expirationTimestamp"), ink.get("expired")
            for index, key in enumerate(CHANNELS.values()):
                raw = levels[index] if isinstance(levels, list) and index < len(levels) else None
                days = expiry[index] if isinstance(expiry, list) and index < len(expiry) else None
                self._set(key + "_ink_remaining", percentage(raw), now)
                stamp = timestamps[index] if isinstance(timestamps, list) and index < len(timestamps) else None
                is_expired = expired[index] == 1 if isinstance(expired, list) and index < len(expired) else False
                self._expiry(key, days, now, today, stamp, is_expired)
            waste = item.get("wasteInk")
            waste = waste if isinstance(waste, dict) else {}
            raw = waste.get("leftInk")
            raw = raw[0] if isinstance(raw, list) and raw else raw
            self._set("waste_tank_remaining", percentage(raw), now)
            self._expiry("waste_tank", waste.get("distanceExpiration"), now, today, waste.get("expirationTimestamp"), waste.get("expired") == 1)
        elif command == 1000:
            status = item.get("status")
            if isinstance(status, dict):
                state, step = status.get("state"), status.get("step")
                if type(state) is int and type(step) is int:
                    pair = (state, step)
                    if pair != self.current_pair:
                        self.readings.pop("activity_progress", None)
                        if pair not in ((2, 4), (2, 3)) or self.current_pair not in ((2, 4), (2, 3)):
                            for key in ("print_progress", "time_remaining", "print_time"):
                                self.readings.pop(key, None)
                    if pair != self.current_pair:
                        self.last_activity = transition(self.current_pair, pair, getattr(self, '_job_progress', None))
                        self.last_activity_time = event_time
                    if pair == (2,4) and self.current_pair not in ((2,3),(2,4)):
                        self._job_progress = None
                    self.current_pair = pair
                    self._set("printer_state", state, now)
                    label = STATUS.get(pair, "Unknown")
                    self._set("printer_status", label, now)
                    self._set("printer_step", step, now)
        elif command == 1001 and self.current_pair in (None, (2, 4), (2, 3)):
            self._job_progress = item.get("progress") if number(item.get("progress")) is not None else None
            progress, remaining = numeric(item.get("progress")), numeric(item.get("time"))
            self._set("print_progress", progress / 100 if progress is not None and 0 <= progress <= 10000 else None, now)
            self._set("time_remaining", remaining if remaining is not None and remaining >= 0 else None, now)
            if "totalTime" in item:
                elapsed = number(item.get("totalTime"))
                self._set("print_time", elapsed if elapsed is not None and elapsed >= 0 else None, now)
        elif command == 1068:
            value = numeric(item.get("totalTime"))
            if 1001 not in self.sources or "print_time" not in self.readings or now - self.readings["print_time"][1] > self.max_age:
                self._set("print_time", value if value is not None and value >= 0 else None, now)
        elif command in (1105, 1136, 1148, 1155):
            expected_command = 1105 if self.current_pair == (8, 0) else OPERATIONS.get(self.current_pair, (None, None))[1]
            status_clock = self.sources.get(1000)
            current_enough = not (isinstance(clock, str) and isinstance(status_clock, str) and clock < status_clock)
            if current_enough and command == expected_command:
                progress = numeric(item.get("progress"))
                self._set("activity_progress", progress if progress is not None and 0 <= progress <= 100 else None, now)
            if command == 1105:
                height = numeric(item.get("height"))
                if "height" in item:
                    self._set("surface_height", height if height is not None and 0 <= height <= 1000 else None, now)
                if "plate_type" in item and not self.hardware.reports.get("1118"):
                    self._bed(item.get("plate_type"), now)
        elif command in (1118, 1153):
            old_identity = self.hardware.identity()
            self.hardware.observe(item, event_time)
            report = self.hardware.reports.get(str(command))
            if report and report['time'] == event_time:
                self._set("bed_type" if command == 1118 else "accessory_type", report['label'], now)
                self.details[command] = dict(report)
                new_identity = self.hardware.identity()
                if new_identity != old_identity:
                    self.last_activity = self.hardware.configuration()['effective'] + (' reported' if old_identity is None else ' detected')
                    self.last_activity_time = event_time
        elif command == 1133:
            light = item.get("light")
            self._set("printer_light", {0: "Off", 1: "On"}.get(light) if type(light) is int else None, now)
        return before != self.stored_data()

    def _bed(self, value, now):
        from .telemetry import BEDS, label as bed_label
        label = bed_label(BEDS, value)
        self._set("bed_type", label if type(value) is int and 0 <= value <= 65535 else None, now)

    def snapshot(self, now):
        data = {}
        for key in SENSOR_KEYS:
            value, stamp = self.readings.get(key, (None, 0))
            data[key] = value if self.connected and 0 <= now - stamp <= self.max_age else None
        if self.current_pair is not None and self.current_pair not in ((2, 4), (2, 3)):
            for key in ("print_progress", "time_remaining", "print_time"):
                data[key] = None
        config = self.hardware.configuration()
        if config['bed_present'] is not None:
            newest = max(self.hardware.reports.values(), key=lambda r: r['time'])
            source_key = 'bed_type' if newest['source_command'] == 1118 else 'accessory_type'
            data['bed_present'] = config['bed_present'] if data.get(source_key) is not None else None
            if config['consistency'] != 'Reports agree' and len(self.hardware.reports) == 2:
                older = min(self.hardware.reports.values(), key=lambda r: r['time'])
                # Preserve last raw report in attributes, but do not present conflicting old hardware as current.
                data['bed_type' if older['source_command'] == 1118 else 'accessory_type'] = None
        data['maintenance_operation'] = OPERATIONS.get(self.current_pair, (None, None))[0] if data.get('printer_status') is not None else None
        if data.get('printer_status') is not None and self.current_pair not in OPERATIONS:
            data['maintenance_operation'] = 'None'
        latest = max((stamp for value, stamp in self.readings.values() if value is not None), default=None)
        data['connection_status'] = 'Disconnected' if not self.connected else 'Connected' if latest is not None and 0 <= now - latest <= self.max_age else 'Stale'
        data['last_activity'] = self.last_activity
        for key in CONSUMABLES:
            data[key + "_expiration_date"] = self.dates.get(key)
        return data

    def disconnected(self):
        self.connected = False
        # A reconnect cannot make readings from the previous session appear fresh.
        self.readings.clear()
        self.current_pair = None
