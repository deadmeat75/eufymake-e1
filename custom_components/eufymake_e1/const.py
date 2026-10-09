"""EufyMake E1 constants."""
DOMAIN = "eufymake_e1"
VERSION = "0.2.0"
INTERVAL = 30
MAX_AGE = 120
CARD_URL = "/eufymake_e1/card.js?v=0.2.0"
CHANNELS = dict(zip("CMYKWG", ("cyan", "magenta", "yellow", "black", "white", "gloss")))
CONSUMABLES = (*CHANNELS.values(), "waste_tank")
SENSOR_KEYS = tuple(key + tail for key in CHANNELS.values() for tail in ("_ink_remaining", "_ink_expiration")) + (
    "waste_tank_remaining", "waste_tank_expiration", "printer_status", "printer_step",
    "print_time", "print_progress", "time_remaining",
)
