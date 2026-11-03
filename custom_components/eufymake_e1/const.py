"""EufyMake E1 constants."""
DOMAIN = "eufymake_e1"
VERSION = "1.3.1"
INTERVAL = 30
MAX_AGE = 120
CARD_URL = "/eufymake_e1/card.js?v=1.3.1"
CHANNELS = dict(zip("CMYKWG", ("cyan", "magenta", "yellow", "black", "white", "gloss")))
CONSUMABLES = (*CHANNELS.values(), "waste_tank")
SENSOR_KEYS = tuple(key + tail for key in CHANNELS.values() for tail in ("_ink_remaining", "_ink_expiration")) + (
    "waste_tank_remaining", "waste_tank_expiration", "printer_status", "printer_step",
    "print_time", "print_progress", "time_remaining",
    "activity_progress", "bed_type", "surface_height", "printer_light",
    "cleaning_remaining", "printer_sound", "printer_sound_level", "firmware_download_progress",
    "preparation_total_time", "estimated_print_time", "estimated_priming_time",
    "accessory_type", "bed_present", "printer_state", "maintenance_operation", "connection_status", "last_activity",
)
