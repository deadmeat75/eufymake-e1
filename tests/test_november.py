import bootstrap
from custom_components.eufymake_e1.observations import observations
from custom_components.eufymake_e1.insights import Insights
import unittest


class NovemberTests(unittest.TestCase):
    def test_cleaning_counter_and_sound_do_not_invent_units(self):
        self.assertEqual(observations({'commandType':1100,'wasteInk':{'cleaningRemaining':3843}},None)['cleaning_remaining'],3843)
        for bad in [True,-1,3.5,'3843',None]:self.assertIsNone(observations({'commandType':1100,'wasteInk':{'cleaningRemaining':bad}},None)['cleaning_remaining'])
        for code,label in [(0,'Low'),(1,'Medium'),(2,'High'),(7,'Unknown (7)')]:
            self.assertEqual(observations({'commandType':1045,'beep':1,'beep_level':code},None),{'printer_sound':'On','printer_sound_level':label})
    def test_progress_is_scoped_to_its_operation(self):
        cases=[(1064,(4,1),{'progress':65}),(1053,(2,1),{'downloadFileProgress':79}),(1047,(6,1),{'upgrade':76,'download':100}),(1123,(9,0),{'progress':95})]
        for cmd,pair,fields in cases:
            self.assertTrue(0<=observations({'commandType':cmd,**fields},pair)['activity_progress']<=100)
            self.assertNotIn('activity_progress',observations({'commandType':cmd,**fields},(2,4)))
            self.assertIsNone(observations({'commandType':cmd,**{k:True for k in fields}},pair)['activity_progress'])
        self.assertEqual(observations({'commandType':1126,'time':524,'print_time':374,'pump_time':150},(2,2)),{'preparation_total_time':524,'estimated_print_time':374,'estimated_priming_time':150})
        self.assertEqual(observations({'commandType':1126,'time':524},(0,0)),{})
    def test_terminal_elapsed_uses_newer_1068_and_rejects_zero_reset(self):
        h=Insights()
        h.observe({'commandType':1000,'status':{'state':2,'step':4}},'2026-10-27T19:06:30Z')
        h.observe({'commandType':1001,'progress':10000,'totalTime':1190,'time':17},'2026-10-27T19:23:49Z')
        h.observe({'commandType':1068,'totalTime':1194},'2026-10-27T19:24:04Z')
        h.observe({'commandType':1000,'status':{'state':0,'step':0}},'2026-10-27T19:24:05Z')
        h.observe({'commandType':1068,'totalTime':0},'2026-10-27T19:24:06Z')
        self.assertEqual(h.public()['prints'][-1]['elapsed_seconds'],1194)
        self.assertEqual(h.public()['prints'][-1]['elapsed_source_command'],1068)
    def test_old_job_quantities_are_withheld_until_reset_or_changed(self):
        old={'print_quantity':0.22,'pump_quantity':1.2,'ink_quantity':[0.2]*6}
        h=Insights({'prints':[{'reported_quantities':old}]})
        h.observe({'commandType':1000,'status':{'state':2,'step':4}},'2026-11-03T19:52:23Z')
        h.observe({'commandType':1068,**old},'2026-11-03T19:52:24Z');self.assertNotIn('reported_quantities',h.job)
        h.observe({'commandType':1068,'print_quantity':0,'pump_quantity':0,'ink_quantity':[0]*6},'2026-11-03T19:52:29Z')
        self.assertEqual(h.job['reported_quantities']['print_quantity'],0)
    def test_repair_uses_original_completion_evidence_and_keeps_events(self):
        saved={'prints':[{'start':'2026-10-27T19:06:30+00:00','end':'2026-10-27T19:24:05+00:00','elapsed_seconds':1190,'last_progress_time':'2026-10-27T19:23:49+00:00','completion_confirmed':False}]}
        h=Insights(saved)
        events=[{'id':'last-metadata','time':'2026-10-27T19:24:04+00:00','command':1068,'fields':{'totalTime':1194}}, {'id':'original','kind':'status','state':0,'step':0,'time':'2026-10-27T19:24:05+00:00','detail':'Print completed'}]
        h.repair_retained(events)
        self.assertTrue(h.data['prints'][-1]['completion_confirmed']);self.assertEqual(h.data['prints'][-1]['elapsed_seconds'],1194)
        self.assertEqual(events[-1]['id'],'original')
        self.assertNotIn('progress',h.data['prints'][-1])
    def test_specific_usage_reasons_and_no_measurable_decrease(self):
        h=Insights();h.ink={'time':'2026-11-03T18:42:00+00:00','levels':[6000]*6}
        context={'start':'2026-11-03T18:41:00+00:00','ink_start':{'time':'2026-11-03T18:40:59+00:00','levels':[6000]*6}}
        self.assertIn('No measurable decrease',h._usage(context,'2026-11-03T18:42:01+00:00')['status'])
        context['usage_reasons']=['Reported ink inventory increased'];context['inventory_uncertain']=True
        self.assertEqual(h._usage(context,'2026-11-03T18:42:01+00:00')['reasons'],['Reported ink inventory increased'])

class NativeTests(unittest.TestCase):
    def test_new_readings_flow_into_existing_state_and_clear_on_transitions(self):
        from custom_components.eufymake_e1.model import PrinterState
        from datetime import date
        m=PrinterState();m.connected=True
        def send(item,now):m.apply(item,now,date(2026,11,3))
        send({'commandType':1100,'wasteInk':{'cleaningRemaining':3843,'leftInk':[500]}},1)
        send({'commandType':1045,'beep':0,'beep_level':1},2)
        self.assertEqual(m.snapshot(2)['cleaning_remaining'],3843)
        self.assertEqual(m.snapshot(2)['printer_sound'],'Off')
        send({'commandType':1000,'status':{'state':6,'step':1}},3)
        send({'commandType':1047,'download':100,'upgrade':43},4)
        self.assertEqual(m.snapshot(4)['activity_progress'],43)
        self.assertEqual(m.snapshot(4)['firmware_download_progress'],100)
        send({'commandType':1000,'status':{'state':9,'step':0}},5)
        self.assertIsNone(m.snapshot(5)['firmware_download_progress'])
        send({'commandType':1123,'progress':95},6)
        self.assertEqual(m.snapshot(6)['activity_progress'],95)
        send({'commandType':1000,'status':{'state':2,'step':1}},7)
        send({'commandType':1053,'downloadFileProgress':79},8)
        self.assertEqual(m.snapshot(8)['activity_progress'],79)
        send({'commandType':1126,'time':524,'print_time':374,'pump_time':150},9)
        self.assertEqual(m.snapshot(9)['estimated_priming_time'],150)
        send({'commandType':1000,'status':{'state':0,'step':0}},10)
        self.assertIsNone(m.snapshot(10)['estimated_priming_time'])
        self.assertIsNone(m.snapshot(10)['activity_progress'])
