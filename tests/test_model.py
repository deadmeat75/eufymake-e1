import datetime as dt
import unittest
import bootstrap
from custom_components.eufymake_e1.model import PrinterState, device_id, percentage


TODAY = dt.date(2026, 10, 8)


class ModelTests(unittest.TestCase):
    def setUp(self):
        self.model = PrinterState()
        self.model.connected = True

    def test_native_keys_and_unknown_startup(self):
        state = self.model.snapshot(100)
        self.assertEqual(len(state), 26)
        self.assertTrue(all(value is None for value in state.values()))

    def test_six_ink_levels_and_waste(self):
        self.model.apply({'commandType':1100, 'ink':{'leftInk':[6550,7080,6330,100,1,0], 'distanceExpiration':[104,109,-23,97,157,-27]}, 'wasteInk':{'leftInk':[5000], 'distanceExpiration':229}}, 100, TODAY)
        state = self.model.snapshot(101)
        for color, value in zip(('cyan','magenta','yellow','black','white','gloss'), (65.5,70.8,63.3,1,.01,0)):
            self.assertEqual(state[color+'_ink_remaining'], value)
        self.assertEqual(state['waste_tank_remaining'], 50)
        self.assertEqual(state['yellow_expiration_date'], '2026-09-15')
        self.assertEqual(state['gloss_expiration_date'], '2026-09-11')

    def test_zero_expiry_is_saved(self):
        self.model.apply({'commandType':1100,'ink':{'distanceExpiration':[0]*6}}, 100, TODAY)
        self.assertEqual(self.model.dates['cyan'], '2026-10-08')
        self.assertEqual(self.model.snapshot(101)['cyan_ink_expiration'], 0)

    def test_manual_dates_survive_invalid_messages(self):
        for color in ('cyan','magenta','yellow','black','white','gloss','waste_tank'):
            self.model.set_date(color, '2026-09-15')
        self.model.apply({'commandType':1100, 'ink':{'distanceExpiration':[None,'unknown',float('nan'),True,{},float('inf')]}}, 100, TODAY)
        self.assertEqual(len(self.model.dates), 7)
        self.assertTrue(all(value == '2026-09-15' for value in self.model.dates.values()))

    def test_new_countdown_updates_manual_date(self):
        self.model.set_date('yellow','2026-09-15')
        self.model.apply({'commandType':1100, 'ink':{'distanceExpiration':[None,None,10]}}, 100, TODAY)
        self.assertEqual(self.model.dates['yellow'],'2026-10-18')

    def test_missing_channels_do_not_keep_stale_levels(self):
        self.model.apply({'commandType':1100,'ink':{'leftInk':[6500]*6}}, 100, TODAY)
        self.model.apply({'commandType':1100,'ink':{'leftInk':[100]}}, 101, TODAY)
        self.assertIsNone(self.model.snapshot(102)['magenta_ink_remaining'])

    def test_ink_freshness_independent_of_printing(self):
        self.model.apply({'commandType':1100,'ink':{'leftInk':[6500]*6}}, 10, TODAY)
        self.model.apply({'commandType':1000,'status':{'state':2,'step':4}}, 140, TODAY)
        self.assertIsNone(self.model.snapshot(141)['cyan_ink_remaining'])
        self.assertEqual(self.model.snapshot(141)['printer_status'],'Printing')

    def test_progress_and_elapsed_freshness_are_independent(self):
        self.model.apply({'commandType':1001,'progress':2300,'time':57}, 10, TODAY)
        self.model.apply({'commandType':1068,'totalTime':163}, 10, TODAY)
        self.model.apply({'commandType':1000,'status':{'state':0,'step':0}}, 140, TODAY)
        state = self.model.snapshot(141)
        self.assertEqual(state['printer_status'],'Idle')
        self.assertIsNone(state['print_progress'])
        self.assertIsNone(state['print_time'])

    def test_printing_paused_idle_unknown(self):
        for state,step,label in [(0,0,'Idle'),(2,3,'Paused'),(2,4,'Printing'),(99,99,'Unknown')]:
            self.model.apply({'commandType':1000,'status':{'state':state,'step':step}}, 100, TODAY)
            self.assertEqual(self.model.snapshot(101)['printer_status'],label)

    def test_progress_units_and_zero_remaining(self):
        self.model.apply({'commandType':1001,'progress':10000,'time':0}, 100, TODAY)
        self.assertEqual(self.model.snapshot(101)['print_progress'],100)
        self.assertEqual(self.model.snapshot(101)['time_remaining'],0)

    def test_disconnect_does_not_restore_old_readings(self):
        self.model.apply({'commandType':1001,'progress':2300,'time':57}, 100, TODAY)
        self.model.set_date('yellow','2026-09-15')
        self.model.disconnected()
        self.model.connected = True
        self.assertIsNone(self.model.snapshot(101)['print_progress'])
        self.assertEqual(self.model.snapshot(101)['yellow_expiration_date'],'2026-09-15')

    def test_restore_dates_only_and_filter_bad_values(self):
        restored = PrinterState({'cyan':'2027-01-20','yellow':'bad','private':'2026-01-01'})
        self.assertEqual(restored.dates,{'cyan':'2027-01-20'})

    def test_reject_bad_numeric_and_dates(self):
        for value in [None,True,'100',-1,10001,float('nan'),float('inf')]:
            self.assertIsNone(percentage(value))
        for key,value in [('cyan','2026-02-30'),('unknown','2026-10-08')]:
            with self.assertRaises(ValueError):
                self.model.set_date(key,value)

    def test_device_identity_separate_from_legacy(self):
        self.assertEqual(device_id('AK123'),'eufymake_e1_ak123')


if __name__ == '__main__':
    unittest.main()
