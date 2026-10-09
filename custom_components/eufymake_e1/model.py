"""Printer state with independent reading freshness and persistent dates."""
from datetime import date, timedelta
import math
import re
from .const import CHANNELS, CONSUMABLES, MAX_AGE, SENSOR_KEYS


def numeric(value):
    if type(value) not in (int, float) or not math.isfinite(value):
        return None
    return value


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

    def _expiry(self, key, value, now, today):
        days = numeric(value)
        if days is not None and (days != int(days) or abs(days) > 36500):
            days = None
        suffix = "_expiration" if key == "waste_tank" else "_ink_expiration"
        self._set(key + suffix, days, now)
        if days is not None and key not in self.manual_dates:
            self.dates[key] = (today + timedelta(days=days)).isoformat()

    def apply(self, item, now, today):
        """Process one decoded message; returns whether saved dates changed."""
        before = dict(self.dates)
        command = item.get("commandType")
        if command == 1100:
            ink = item.get("ink")
            ink = ink if isinstance(ink, dict) else {}
            levels, expiry = ink.get("leftInk"), ink.get("distanceExpiration")
            for index, key in enumerate(CHANNELS.values()):
                raw = levels[index] if isinstance(levels, list) and index < len(levels) else None
                days = expiry[index] if isinstance(expiry, list) and index < len(expiry) else None
                self._set(key + "_ink_remaining", percentage(raw), now)
                self._expiry(key, days, now, today)
            waste = item.get("wasteInk")
            waste = waste if isinstance(waste, dict) else {}
            raw = waste.get("leftInk")
            raw = raw[0] if isinstance(raw, list) and raw else raw
            self._set("waste_tank_remaining", percentage(raw), now)
            self._expiry("waste_tank", waste.get("distanceExpiration"), now, today)
        elif command == 1000:
            status = item.get("status")
            if isinstance(status, dict):
                state, step = status.get("state"), status.get("step")
                if type(state) is int and type(step) is int:
                    label = {(0, 0): "Idle", (2, 3): "Paused", (2, 4): "Printing"}.get((state, step), "Unknown")
                    self._set("printer_status", label, now)
                    self._set("printer_step", step, now)
        elif command == 1001:
            progress, remaining = numeric(item.get("progress")), numeric(item.get("time"))
            self._set("print_progress", progress / 100 if progress is not None and 0 <= progress <= 10000 else None, now)
            self._set("time_remaining", remaining if remaining is not None and remaining >= 0 else None, now)
        elif command == 1068:
            value = numeric(item.get("totalTime"))
            self._set("print_time", value if value is not None and value >= 0 else None, now)
        return before != self.dates

    def snapshot(self, now):
        data = {}
        for key in SENSOR_KEYS:
            value, stamp = self.readings.get(key, (None, 0))
            data[key] = value if self.connected and 0 <= now - stamp <= self.max_age else None
        for key in CONSUMABLES:
            data[key + "_expiration_date"] = self.dates.get(key)
        return data

    def disconnected(self):
        self.connected = False
        # A reconnect cannot make readings from the previous session appear fresh.
        self.readings.clear()
