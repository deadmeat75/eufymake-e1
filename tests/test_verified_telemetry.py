"""Exact physical observations supplied by the maintainer, not inferred enum mappings."""
import datetime as dt
import json
from pathlib import Path
import unittest
import bootstrap
from custom_components.eufymake_e1.model import PrinterState
from custom_components.eufymake_e1.telemetry import Hardware, BEDS, ACCESSORIES, OPERATIONS

FIXTURE=json.loads((Path(__file__).parent/'fixtures/verified_october.json').read_text())
TODAY=dt.date(2026,10,20)

class VerifiedTests(unittest.TestCase):
    def setUp(self):
        self.model=PrinterState();self.model.connected=True

    def apply(self,payload,timestamp='2026-10-20T20:00:00Z',now=100):
        self.model.apply(payload,now,TODAY,observed_at=timestamp)
        return self.model.snapshot(now)

    def test_all_bed_and_accessory_enums_are_independent(self):
        for code,expected in BEDS.items():
            model=PrinterState();model.connected=True
            model.apply({'commandType':1118,'plateType':code},100,TODAY)
            self.assertEqual(model.snapshot(100)['bed_type'],expected)
        for code,expected in ACCESSORIES.items():
            model=PrinterState();model.connected=True
            model.apply({'commandType':1153,'attType':code},100,TODAY)
            self.assertEqual(model.snapshot(100)['accessory_type'],expected)
        self.assertEqual(BEDS[3],ACCESSORIES[4])
        self.assertNotIn(3,ACCESSORIES)

    def test_exact_install_remove_fixtures_and_reply(self):
        for timestamp,payload in FIXTURE['accessory_events']:
            data=self.apply(payload,timestamp)
            self.assertEqual(data['bed_present'],(payload.get('plateType',payload.get('attType')) != 0))
        self.assertEqual(data['bed_type'],'Mini Flatbed')
        self.assertEqual(data['accessory_type'],'Mini Flatbed')
        self.assertEqual(self.model.hardware.reports['1118']['reply'],0)
        self.assertEqual(self.model.hardware.configuration()['consistency'],'Reports agree')

    def test_event_ordering_and_cross_source_removal(self):
        self.apply({'commandType':1118,'plateType':3},'2026-10-20T18:00:32Z')
        self.apply({'commandType':1153,'attType':4},'2026-10-20T18:00:33Z')
        self.apply({'commandType':1153,'attType':0},'2026-10-20T18:40:48Z')
        data=self.model.snapshot(100)
        self.assertFalse(data['bed_present']);self.assertIsNone(data['bed_type'])
        data=self.apply({'commandType':1118,'plateType':3},'2026-10-20T18:00:55Z')
        self.assertFalse(data['bed_present'])
        data=self.apply({'commandType':1118,'plateType':2},'2026-10-20T18:41:09Z')
        self.assertTrue(data['bed_present']);self.assertIsNone(data['accessory_type'])
        data=self.apply({'commandType':1153,'attType':1},'2026-10-20T18:41:10Z')
        self.assertEqual(data['accessory_type'],'Mini Flatbed')

    def test_removal_does_not_change_printer_operating_state(self):
        self.apply({'commandType':1000,'status':{'state':2,'step':4}})
        data=self.apply({'commandType':1118,'plateType':0,'reply':1})
        self.assertEqual(data['printer_status'],'Printing');self.assertEqual(data['printer_state'],2)
        self.assertEqual(self.model.hardware.reports['1118']['reply'],1)
        self.assertEqual(self.model.hardware.reports['1118']['source_command'],1118)

    def test_studio_progress_remaining_elapsed_and_job_metadata_separation(self):
        self.apply({'commandType':1000,'status':{'state':2,'step':4}})
        for record in FIXTURE['studio_progress']:
            data=self.apply({'commandType':1001,**record})
            self.assertEqual(data['print_progress'],record['progress']/100)
            self.assertEqual(data['time_remaining'],record['time'])
        self.assertEqual(data['print_time'],187)
        data=self.apply({'commandType':1068,'totalTime':0,'jobSize':{'width':335,'height':420},'name':'Standard Flatbed'})
        self.assertEqual(data['print_time'],187);self.assertIsNone(data['bed_type'])

    def test_maintenance_progress_never_overwrites_print_progress(self):
        for pair,(_,command) in OPERATIONS.items():
            data=self.apply({'commandType':1000,'status':{'state':pair[0],'step':pair[1]}})
            data=self.apply({'commandType':command,'progress':37})
            self.assertEqual(data['activity_progress'],37);self.assertIsNone(data['print_progress'])
            wrong=1136 if command!=1136 else 1148
            self.apply({'commandType':wrong,'progress':99})
            self.assertEqual(self.model.snapshot(100)['activity_progress'],37)
        for step in (0,1):
            data=self.apply({'commandType':1000,'status':{'state':13,'step':step}})
            self.assertEqual(data['maintenance_operation'],'None')
            self.assertIsNone(data['activity_progress'])

    def test_unknowns_and_private_metadata(self):
        data=self.apply({'commandType':1153,'attType':9,'sn':'PRIVATE-SERIAL','version':'1.2','modelName':'Rotator'})
        self.assertEqual(data['accessory_type'],'Unknown (9)')
        self.assertIsNone(data['bed_present'])
        self.assertEqual(self.model.hardware.private_metadata['sn'],'PRIVATE-SERIAL')
        self.assertNotIn('PRIVATE-SERIAL',json.dumps(self.model.hardware.reports))
        for step in (5,):
            data=self.apply({'commandType':1000,'status':{'state':2,'step':step}})
            self.assertEqual(data['printer_status'],'Unknown');self.assertEqual(data['printer_state'],2)
        self.assertEqual(self.apply({'commandType':1000,'status':{'state':8,'step':2}})['printer_status'],'Unknown')

    def test_malformed_late_and_duplicate_updates(self):
        self.apply({'commandType':1118,'plateType':2},'2026-10-20T18:41:09Z')
        self.apply({'commandType':1118,'plateType':0},'2026-10-20T18:40:48Z')
        self.assertEqual(self.model.snapshot(100)['bed_type'],'Mini Flatbed')
        for payload in (None,[],{}, {'commandType':[]},{'commandType':1118,'plateType':{}}, {'commandType':1105,'height':10**1000}):
            self.model.apply(payload,101,TODAY)
        self.assertEqual(self.model.snapshot(101)['bed_type'],'Mini Flatbed')

    def test_freshness_and_reconnect(self):
        self.apply({'commandType':1118,'plateType':2})
        self.assertEqual(self.model.snapshot(100)['connection_status'],'Connected')
        self.assertIsNone(self.model.snapshot(221)['bed_type'])
        self.assertEqual(self.model.snapshot(221)['connection_status'],'Stale')
        self.model.disconnected();self.assertEqual(self.model.snapshot(222)['connection_status'],'Disconnected')
        self.model.connected=True
        self.assertIsNone(self.model.snapshot(223)['bed_type'])

    def test_actual_recorded_studio_samples_are_within_two_seconds(self):
        from zoneinfo import ZoneInfo
        for sample in FIXTURE['recorded_studio_samples']:
            self.assertLessEqual(abs(sample['remaining']-sample['studio_remaining']),2)
            local=dt.datetime.fromisoformat(sample['time']).astimezone(ZoneInfo('America/Los_Angeles'))
            self.assertEqual(local.date(),dt.date(2026,10,19))
            self.assertEqual(local.hour,20)
            self.assertIn(local.minute,(32,33))
            self.apply({'commandType':1000,'status':{'state':2,'step':4}},sample['time'])
            data=self.apply({'commandType':1001,'progress':sample['progress'],'time':sample['remaining']},sample['time'])
            self.assertEqual(data['print_progress'],sample['progress']/100)
