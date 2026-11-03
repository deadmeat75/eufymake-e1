"""Read-only observations; unknown scales and result codes are not invented."""
from .telemetry import OPERATIONS, number


def activity_command(pair):
    return {(8,0):1105,(2,1):1053,(6,1):1047,(9,0):1123,(4,1):1064}.get(pair, OPERATIONS.get(pair,(None,None))[1])


def observations(item, pair):
    command = item.get('commandType')
    result = {}
    if command == 1100 and isinstance(item.get('wasteInk'), dict):
        value = item['wasteInk'].get('cleaningRemaining')
        result['cleaning_remaining'] = value if type(value) is int and value >= 0 else None
    if command == 1045:
        for field, key, table in [('beep','printer_sound',{0:'Off',1:'On'}),('beep_level','printer_sound_level',{0:'Low',1:'Medium',2:'High'})]:
            if field in item:
                value = item[field]
                result[key] = table.get(value, f'Unknown ({value})') if type(value) is int and 0<=value<=65535 else None
    if command == 1126 and pair in ((2,1),(2,2),(2,6),(2,4),(2,3)):
        for field,key in [('time','preparation_total_time'),('print_time','estimated_print_time'),('pump_time','estimated_priming_time')]:
            value = number(item.get(field))
            result[key] = value if value is not None and value>=0 else None
    if command == activity_command(pair):
        field = 'downloadFileProgress' if command==1053 else 'upgrade' if command==1047 else 'progress'
        value = number(item.get(field))
        result['activity_progress'] = value if value is not None and 0<=value<=100 else None
        if command == 1047:
            value = number(item.get('download'))
            result['firmware_download_progress'] = value if value is not None and 0<=value<=100 else None
    return result
