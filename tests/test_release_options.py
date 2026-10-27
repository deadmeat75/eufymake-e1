import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import bootstrap
import ha_stubs
from custom_components.eufymake_e1.config_flow import EufyMakeConfigFlow, EufyMakeOptionsFlow
from custom_components.eufymake_e1.notifications import Notifications


class OptionTests(unittest.IsolatedAsyncioTestCase):
    async def test_defaults_and_validation(self):
        flow=EufyMakeConfigFlow.async_get_options_flow(None)
        self.assertIsInstance(flow,EufyMakeOptionsFlow)
        flow.config_entry=SimpleNamespace(options={})
        form=await flow.async_step_init()
        defaults={k.schema:k.default() for k in form['data_schema'].schema if hasattr(k,'default')}
        self.assertFalse(defaults['notify_completion']);self.assertFalse(defaults['notify_waste']);self.assertFalse(defaults['notify_connection'])
        self.assertEqual(defaults['low_ink_cyan'],10)
        bad=await flow.async_step_init({'low_ink_cyan':float('nan')})
        self.assertEqual(bad['errors'],{'base':'invalid_threshold'})
        good=await flow.async_step_init({'low_ink_unit':'ml','low_ink_cyan':12.5})
        self.assertEqual(good['data']['low_ink_cyan'],12.5)
    async def test_notifications_opt_in_hysteresis_and_delayed_connection(self):
        hass=ha_stubs.FakeHass();entry=SimpleNamespace(entry_id='test',options={})
        n=Notifications(hass,entry)
        with patch.object(n,'send') as send:
            n.completed({'elapsed_seconds':1194});n.waste(10);n.connection(False);send.assert_not_called();self.assertIsNone(n.disconnect_handle)
            entry.options={'notify_completion':True,'notify_waste':True,'notify_connection':True}
            n.completed({'elapsed_seconds':1194});self.assertIn('19m 54s',send.call_args.args[1])
            send.reset_mock();n.waste(26);n.waste(20);n.waste(19);self.assertEqual(send.call_count,1)
            n.waste(26);n.waste(20);self.assertEqual(send.call_count,2)
            n.connection(False);handle=n.disconnect_handle;self.assertIsNotNone(handle);self.assertGreaterEqual(handle.when()-hass.loop.time(),119)
            n.connection(True);self.assertTrue(handle.cancelled());self.assertIsNone(n.disconnect_handle)
            n._disconnected();self.assertEqual(send.call_args.args[0],'connection')
            n.close()
