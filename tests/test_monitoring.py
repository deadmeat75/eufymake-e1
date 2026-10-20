"""Stable monitoring behavior from observed printer messages."""
import datetime as dt
import unittest
import bootstrap
from custom_components.eufymake_e1.model import PrinterState

TODAY = dt.date(2026,10,15)


class MonitoringTests(unittest.TestCase):
    def setUp(self):
        self.model = PrinterState()
        self.model.connected = True

    def apply(self, payload, now=100):
        self.model.apply(payload, now, TODAY)
        return self.model.snapshot(now)

    def status(self, state, step, now=100):
        return self.apply({'commandType':1000,'status':{'state':state,'step':step}},now)

    def test_each_activity_uses_its_own_progress_and_clears_on_transition(self):
        self.status(8,0)
        self.assertEqual(self.apply({'commandType':1105,'progress':37})['activity_progress'],37)
        self.assertIsNone(self.status(0,0)['activity_progress'])
        self.status(5,3)
        self.assertIsNone(self.apply({'commandType':1105,'progress':90})['activity_progress'])
        self.assertEqual(self.apply({'commandType':1136,'progress':83})['activity_progress'],83)
        self.assertIsNone(self.status(2,4)['activity_progress'])

    def test_progress_validation_and_independent_freshness(self):
        self.status(8,0)
        for value in [None,True,'37',-1,101,float('nan')]:
            self.assertIsNone(self.apply({'commandType':1105,'progress':value})['activity_progress'])
        self.apply({'commandType':1105,'progress':37,'height':16.629375,'plate_type':2},100)
        self.status(8,0,221)
        self.assertIsNone(self.model.snapshot(221)['surface_height'])
        self.assertIsNone(self.model.snapshot(221)['activity_progress'])

    def test_bed_height_light_and_unknown_accessories(self):
        self.assertEqual(self.apply({'commandType':1118,'plateType':2})['bed_type'],'Mini Flatbed')
        self.assertEqual(self.apply({'commandType':1118,'plateType':99})['bed_type'],'Unknown (99)')
        self.assertEqual(self.apply({'commandType':1118,'plateType':True})['bed_type'],'Unknown (99)')
        self.assertEqual(self.apply({'commandType':1105,'height':16.629375})['surface_height'],16.629375)
        for value in [-1,1001,'16.6',True]:
            self.assertIsNone(self.apply({'commandType':1105,'height':value})['surface_height'])
        for value,label in [(0,'Off'),(1,'On'),(True,None),(2,None)]:
            self.assertEqual(self.apply({'commandType':1133,'light':value})['printer_light'],label)
        self.model.disconnected()
        self.assertIsNone(self.model.snapshot(100)['printer_light'])

    def test_100_percent_is_not_completion_and_late_packets_do_not_restore_old_job(self):
        self.status(2,4)
        data=self.apply({'commandType':1001,'progress':10000,'time':17})
        self.assertEqual(data['printer_status'],'Printing')
        self.assertEqual(data['time_remaining'],17)
        self.assertEqual(self.status(2,3)['print_progress'],100)
        self.assertEqual(self.status(2,4)['print_progress'],100)
        self.assertIsNone(self.status(0,0)['print_progress'])
        self.assertIsNone(self.apply({'commandType':1001,'progress':10000,'time':17})['print_progress'])
        self.assertIsNone(self.status(2,4)['time_remaining'])

    def test_maintenance_labels(self):
        for pair,label in [((5,9),'Automatic moisturizing'),((5,3),'Injecting ink'),
                           ((13,0),'Maintenance — ink injection required after moisturizing')]:
            self.assertEqual(self.status(*pair)['printer_status'],label)
