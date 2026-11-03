import bootstrap
from custom_components.eufymake_e1.observations import observations
from custom_components.eufymake_e1.insights import Insights
from custom_components.eufymake_e1.telemetry import STATUS, OPERATIONS
import json
from pathlib import Path
import unittest


class CleaningPatchTests(unittest.TestCase):
    def test_observed_cleaning_is_scoped_and_does_not_identify_color(self):
        self.assertEqual(STATUS[(5,1)],'Print-head cleaning (observed)')
        self.assertEqual(OPERATIONS[(5,1)][1],1102)
        for value in (3,11,15):
            result=observations({'commandType':1102,'value':1,'progress':value},(5,1))
            self.assertEqual(result['activity_progress'],value)
            self.assertNotIn('color',result)
            self.assertNotIn('print_progress',result)
        self.assertEqual(observations({'commandType':1102,'progress':15},(2,4)),{})
        self.assertIsNone(observations({'commandType':1102,'progress':101},(5,1))['activity_progress'])
    def test_studio_totals_match_all_four_observed_jobs(self):
        fixtures=json.loads((Path(__file__).parent/'fixtures/studio_ink_20261103.json').read_text())
        for sample in fixtures:
            self.assertEqual(round(sum(sample['ink_quantity']),2),sample['studio_total_ml'])
        # The separate coarse print_quantity is not the Studio total.
        self.assertNotEqual(round(fixtures[-1]['print_quantity'],2),fixtures[-1]['studio_total_ml'])
    def test_units_survive_old_history_load_without_relabeling_other_fields(self):
        h=Insights({'prints':[{'reported_quantities':{'units':'Unverified','ink_quantity':[0.2]*6,'six_channel_total':1.2,'print_quantity':0.22,'pump_quantity':1.2}}]})
        q=h.public()['prints'][0]['reported_quantities']
        self.assertEqual(q['field_units']['ink_quantity'],'mL')
        self.assertEqual(q['field_units']['six_channel_total'],'mL')
        self.assertEqual(q['field_units']['print_quantity'],'Unverified')
        self.assertEqual(q['field_units']['pump_quantity'],'Unverified')
        self.assertEqual(q['units'],'Unverified')
        self.assertEqual(q['pump_quantity'],1.2)
